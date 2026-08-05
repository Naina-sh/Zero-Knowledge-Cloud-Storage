/**
 * Cryptography service — AES-256-GCM encryption/decryption using Web Crypto API.
 *
 * Provides authenticated encryption for file contents, filenames, and metadata.
 * Uses the encryption key derived in key.service.ts (never sent to server).
 *
 * @module services/crypto.service
 */

import { config } from '../config';
import { bufferToBase64, base64ToBuffer } from './key.service';

/**
 * Generate a random initialization vector (96-bit for AES-GCM).
 * @returns Base64-encoded IV
 */
export function generateIV(): string {
  const iv = crypto.getRandomValues(new Uint8Array(config.crypto.ivLength));
  return bufferToBase64(iv);
}

/**
 * Encrypt a string (e.g., filename, MIME type) with AES-256-GCM.
 * @param key AES-GCM CryptoKey (derived from password)
 * @param plaintext The string to encrypt
 * @param ivBase64 Base64-encoded IV (generate fresh per encryption)
 * @returns Base64-encoded ciphertext
 */
export async function encryptString(
  key: CryptoKey,
  plaintext: string,
  ivBase64: string
): Promise<string> {
  const iv = base64ToBuffer(ivBase64);
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    plaintextBytes
  );

  return bufferToBase64(ciphertext);
}

/**
 * Decrypt a string (e.g., filename, MIME type) with AES-256-GCM.
 * @param key AES-GCM CryptoKey
 * @param ciphertextBase64 Base64-encoded ciphertext
 * @param ivBase64 Base64-encoded IV
 * @returns Decrypted plaintext string
 */
export async function decryptString(
  key: CryptoKey,
  ciphertextBase64: string,
  ivBase64: string
): Promise<string> {
  const iv = base64ToBuffer(ivBase64);
  const ciphertext = base64ToBuffer(ciphertextBase64);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plaintext);
}

/**
 * Encrypt a file (binary) with AES-256-GCM.
 * @param key AES-GCM CryptoKey
 * @param data Raw file bytes
 * @param ivBase64 Base64-encoded IV
 * @returns Encrypted file as Uint8Array (ciphertext + auth tag)
 */
export async function encryptFile(
  key: CryptoKey,
  data: Uint8Array,
  ivBase64: string
): Promise<Uint8Array> {
  const iv = base64ToBuffer(ivBase64);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    data as BufferSource
  );
  return new Uint8Array(ciphertext);
}

/**
 * Decrypt a file (binary) with AES-256-GCM.
 * @param key AES-GCM CryptoKey
 * @param encryptedData Encrypted file bytes (ciphertext + auth tag)
 * @param ivBase64 Base64-encoded IV
 * @returns Decrypted file as Uint8Array
 * @throws If decryption fails (wrong key, tampered data, or corrupted file)
 */
export async function decryptFile(
  key: CryptoKey,
  encryptedData: Uint8Array,
  ivBase64: string
): Promise<Uint8Array> {
  const iv = base64ToBuffer(ivBase64);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encryptedData as BufferSource
  );
  return new Uint8Array(plaintext);
}

/**
 * Read a File object as a Uint8Array.
 */
export function readFileAsBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Convert a Uint8Array to a Blob for download/preview.
 */
export function bytesToBlob(data: Uint8Array, mimeType: string): Blob {
  return new Blob([data as unknown as BlobPart], { type: mimeType });
}

/**
 * Convert a Uint8Array to a base64 string (for small data like embeddings).
 */
export function bytesToBase64(data: Uint8Array): string {
  return bufferToBase64(data);
}
