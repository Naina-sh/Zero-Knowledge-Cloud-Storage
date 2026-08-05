/**
 * JWT token generation and verification utilities.
 * @module utils/jwt
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import type { JwtPayload } from '../types';
import { UnauthorizedError } from './errors';

/**
 * Sign an access token (short-lived).
 */
export function signAccessToken(payload: { userId: string; email: string }): string {
  return jwt.sign(
    { userId: payload.userId, email: payload.email, type: 'access' } satisfies JwtPayload,
    env.jwt.secret,
    { expiresIn: env.jwt.accessExpiry }
  );
}

/**
 * Sign a refresh token (long-lived).
 */
export function signRefreshToken(payload: { userId: string; email: string }): string {
  return jwt.sign(
    { userId: payload.userId, email: payload.email, type: 'refresh' } satisfies JwtPayload,
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiry }
  );
}

/**
 * Verify an access token.
 * @throws UnauthorizedError if invalid or expired.
 */
export function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.jwt.secret) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

/**
 * Verify a refresh token.
 * @throws UnauthorizedError if invalid or expired.
 */
export function verifyRefreshToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.jwt.refreshSecret) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}

/**
 * Hash a refresh token for secure storage (SHA-256).
 * We store the hash, not the raw token, so a DB breach doesn't expose valid tokens.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
