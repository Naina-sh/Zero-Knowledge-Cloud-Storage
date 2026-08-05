/**
 * Shared TypeScript type definitions for the backend.
 * @module types
 */

import type { Request } from 'express';

// ─── Domain Entities ──────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  auth_key_hash: string;
  auth_salt: string;
  enc_salt: string;
  storage_used: number;
  created_at: Date;
  updated_at: Date;
}

export interface FileRecord {
  id: string;
  user_id: string;
  encrypted_name: string;
  name_iv: string;
  file_iv: string;
  storage_path: string;
  size: number;
  original_size: number;
  mime_encrypted: string | null;
  mime_iv: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface EmbeddingRecord {
  id: string;
  file_id: string;
  user_id: string;
  vector: number[];
  model: string;
  created_at: Date;
}

export interface SearchHistoryRecord {
  id: string;
  user_id: string;
  encrypted_query: string;
  query_iv: string;
  result_count: number;
  searched_at: Date;
}

export interface RefreshTokenRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
  revoked_at: Date | null;
}

// ─── API Response Types ───────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── JWT Payload ──────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

// ─── Express Augmentation ─────────────────────────────────────
// Augment the global Express namespace to add `user` to Request.
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export interface AuthenticatedUser {
  id: string;
  email: string;
}

// ─── Search Result ────────────────────────────────────────────

export interface SearchResult {
  fileId: string;
  score: number;
  encryptedName: string;
  nameIv: string;
  size: number;
}
