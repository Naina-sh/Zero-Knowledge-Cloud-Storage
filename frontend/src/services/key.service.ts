/**
 * Key management service — client-side key derivation using Web Crypto API.
 *
 * This is the FOUNDATION of the zero-knowledge architecture.
 * The password NEVER leaves the client. Keys are derived locally:
 *
 *   password + encSalt ──PBKDF2(600k)──▶ masterKey
 *   masterKey ──HKDF("auth")──▶ authKey   (sent to server for login)
 *   masterKey ──HKDF("enc")──▶  encKey    (used for AES-256-GCM, never sent)
 *
 * @module services/key.service
 */

import { config } from '../config';

/**
 * Generate a cryptographically random salt (128-bit).
 * @returns Hex-encoded salt string.
 */
export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(config.crypto.saltLength));
  return bufferToHex(salt);
}

/**
 * Derive the master key from password + salt using PBKDF2-SHA256.
 * @param password User's plaintext password
 * @param saltHex Hex-encoded salt
 * @returns Raw CryptoKey (non-extractable) for HKDF derivation
 */
export async function deriveMasterKey(password: string, saltHex: string): Promise<CryptoKey> {
  const salt = hexToBuffer(saltHex);
  const encoder = new TextEncoder();

  // Import password as PBKDF2 key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // Derive 256 bits via PBKDF2 (explicit length — avoids the "length was
  // specified for PBKDF2 Derive Bits" error that occurs when using
  // deriveKey with an HKDF target type, which has no length field)
  const masterKeyBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: config.crypto.pbkdf2Iterations,
      hash: config.crypto.hashAlgorithm,
    },
    keyMaterial,
    256 // 256 bits = 32 bytes
  );

  // Import the derived bits as an HKDF key for further sub-key derivation
  return crypto.subtle.importKey(
    'raw',
    masterKeyBits,
    { name: 'HKDF' },
    false,
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Derive a specific sub-key from the master key using HKDF.
 * @param masterKey The PBKDF2-derived master key
 * @param info Context label (e.g., "auth" or "enc")
 * @returns Non-extractable CryptoKey for the specified purpose
 */
export async function deriveSubKey(
  masterKey: CryptoKey,
  info: string,
  keyUsage: KeyUsage[]
): Promise<CryptoKey> {
  const encoder = new TextEncoder();

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: config.crypto.hashAlgorithm,
      // HKDF salt is optional; using a fixed app salt for domain separation
      salt: encoder.encode('zk-vault-v1'),
      info: encoder.encode(info),
    },
    masterKey,
    { name: 'AES-GCM', length: config.crypto.keyLength },
    false,
    keyUsage
  );
}

/**
 * Derive the authentication key (sent to server as hex for Argon2 verification).
 * @param password User's password
 * @param saltHex Hex-encoded salt
 * @returns Hex-encoded 256-bit auth key
 */
export async function deriveAuthKey(password: string, saltHex: string): Promise<string> {
  const masterKey = await deriveMasterKey(password, saltHex);
  const encoder = new TextEncoder();

  // Derive raw bits for the auth key (extractable for transmission)
  const authKeyBuffer = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: config.crypto.hashAlgorithm,
      salt: encoder.encode('zk-vault-v1'),
      info: encoder.encode('zk-auth-v1'),
    },
    masterKey,
    config.crypto.keyLength
  );

  return bufferToHex(new Uint8Array(authKeyBuffer));
}

/**
 * Derive the encryption key for AES-256-GCM file encryption.
 * This key NEVER leaves the client. It is kept in memory only.
 * @param password User's password
 * @param saltHex Hex-encoded salt
 * @returns Non-extractable AES-GCM CryptoKey
 */
export async function deriveEncryptionKey(password: string, saltHex: string): Promise<CryptoKey> {
  const masterKey = await deriveMasterKey(password, saltHex);
  return deriveSubKey(masterKey, 'zk-enc-v1', ['encrypt', 'decrypt']);
}

// ─── Hex ↔ Buffer utilities ───────────────────────────────────

export function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBuffer(hex: string): ArrayBuffer {
  const buffer = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return buffer;
}

export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return btoa(String.fromCharCode(...bytes));
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}
