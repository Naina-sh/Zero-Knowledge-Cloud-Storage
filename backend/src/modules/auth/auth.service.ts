/**
 * Authentication service — user registration, login, token management.
 * All cryptographic key derivation happens CLIENT-SIDE. The server only
 * receives and verifies the derived authKey (stored as Argon2id hash).
 * @module modules/auth/auth.service
 */

import argon2 from 'argon2';
import { query, getClient } from '../../config/database';
import { signAccessToken, signRefreshToken, hashToken, verifyRefreshToken } from '../../utils/jwt';
import { ConflictError, UnauthorizedError, NotFoundError, InternalError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import type { User, RefreshTokenRecord } from '../../types';

// Argon2id parameters — memory-hard, side-channel resistant
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
  hashLength: 32,
};

export interface AuthResult {
  user: { id: string; email: string };
  accessToken: string;
  refreshToken: string;
}

/**
 * Register a new user.
 * @param email User's email (the only plaintext identifier stored)
 * @param authKey Client-derived authentication key (hex)
 * @param authSalt Salt for auth key derivation (hex)
 * @param encSalt Salt for encryption key derivation (hex)
 */
export async function registerUser(
  email: string,
  authKey: string,
  authSalt: string,
  encSalt: string
): Promise<AuthResult> {
  const existing = await query<{ id: string }>(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (existing.length > 0) {
    throw new ConflictError('An account with this email already exists');
  }

  // Hash the authKey with Argon2id — never store the raw authKey
  const authKeyHash = await argon2.hash(authKey, ARGON2_OPTIONS);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const result = await client.query<User>(
      `INSERT INTO users (email, auth_key_hash, auth_salt, enc_salt)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email`,
      [email.toLowerCase(), authKeyHash, authSalt, encSalt]
    );

    const user = result.rows[0];
    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const refreshToken = signRefreshToken({ userId: user.id, email: user.email });

    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, hashToken(refreshToken)]
    );

    await client.query('COMMIT');

    logger.info(`User registered: ${user.email}`);
    return { user: { id: user.id, email: user.email }, accessToken, refreshToken };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Retrieve salts for a user (used by client during login to reconstruct keys).
 */
export async function getSalts(email: string): Promise<{ authSalt: string; encSalt: string }> {
  const rows = await query<Pick<User, 'auth_salt' | 'enc_salt'>>(
    'SELECT auth_salt, enc_salt FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (rows.length === 0) {
    throw new NotFoundError('User');
  }

  return { authSalt: rows[0].auth_salt, encSalt: rows[0].enc_salt };
}

/**
 * Authenticate a user with email + derived authKey.
 */
export async function loginUser(email: string, authKey: string): Promise<AuthResult> {
  const rows = await query<User>(
    'SELECT id, email, auth_key_hash FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (rows.length === 0) {
    // Dummy verify to prevent timing attacks (constant-time response)
    await argon2.hash('dummy', ARGON2_OPTIONS);
    throw new UnauthorizedError('Invalid email or auth key');
  }

  const user = rows[0];
  const valid = await argon2.verify(user.auth_key_hash, authKey);

  if (!valid) {
    throw new UnauthorizedError('Invalid email or auth key');
  }

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email });

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
    [user.id, hashToken(refreshToken)]
  );

  logger.info(`User logged in: ${user.email}`);
  return { user: { id: user.id, email: user.email }, accessToken, refreshToken };
}

/**
 * Refresh an access token using a valid refresh token.
 * Implements token rotation: old refresh token is revoked, new one issued.
 */
export async function refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const payload = verifyRefreshToken(refreshToken);

  const tokenHash = hashToken(refreshToken);
  const rows = await query<RefreshTokenRecord>(
    `SELECT id, revoked_at FROM refresh_tokens
     WHERE user_id = $1 AND token_hash = $2 AND expires_at > NOW()`,
    [payload.userId, tokenHash]
  );

  if (rows.length === 0) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  // Token reuse detection — if already revoked, potential theft; revoke all
  if (rows[0].revoked_at) {
    logger.warn(`Refresh token reuse detected for user ${payload.userId} — revoking all tokens`);
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1', [payload.userId]);
    throw new UnauthorizedError('Token reuse detected — please log in again');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Revoke old token
    await client.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1', [rows[0].id]);

    // Issue new tokens (rotation)
    const newAccessToken = signAccessToken({ userId: payload.userId, email: payload.email });
    const newRefreshToken = signRefreshToken({ userId: payload.userId, email: payload.email });

    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [payload.userId, hashToken(newRefreshToken)]
    );

    await client.query('COMMIT');
    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err instanceof Error ? err : new InternalError('Token refresh failed');
  } finally {
    client.release();
  }
}

/**
 * Logout — revoke the current refresh token.
 */
export async function logoutUser(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;

  try {
    const payload = verifyRefreshToken(refreshToken);
    await query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND token_hash = $2',
      [payload.userId, hashToken(refreshToken)]
    );
  } catch {
    // If token is invalid, nothing to revoke — silently succeed
  }
}

