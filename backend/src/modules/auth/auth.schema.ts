/**
 * Zod validation schemas for authentication endpoints.
 * @module modules/auth/auth.schema
 */

import { z } from 'zod';

/**
 * Registration schema.
 * The server receives the client-derived authKey (not the password),
 * plus the two salts used for key derivation.
 */
export const registerSchema = {
  body: z.object({
    email: z.string().email('Invalid email address').max(255),
    authKey: z
      .string()
      .min(64, 'authKey must be at least 64 characters (hex-encoded 256-bit key)')
      .max(128, 'authKey too long'),
    authSalt: z.string().min(32, 'authSalt required (hex)'),
    encSalt: z.string().min(32, 'encSalt required (hex)'),
  }),
};

/**
 * Salt retrieval schema (query param).
 */
export const saltSchema = {
  query: z.object({
    email: z.string().email('Invalid email address'),
  }),
};

/**
 * Login schema.
 */
export const loginSchema = {
  body: z.object({
    email: z.string().email('Invalid email address'),
    authKey: z.string().min(64, 'authKey required').max(128),
  }),
};

/**
 * Account deletion confirmation schema.
 */
export const deleteAccountSchema = {
  body: z.object({
    authKey: z.string().min(64, 'authKey required for confirmation').max(128),
  }),
};
