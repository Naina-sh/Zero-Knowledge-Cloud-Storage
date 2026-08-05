/**
 * Shared TypeScript types for the frontend.
 * @module types
 */

// ─── Auth ─────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  storageUsed?: number;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface SaltsResponse {
  authSalt: string;
  encSalt: string;
}

// ─── Files ────────────────────────────────────────────────────

export interface FileDTO {
  id: string;
  encryptedName: string;
  nameIv: string;
  fileIv?: string;
  size: number;
  originalSize: number;
  mimeEncrypted?: string | null;
  mimeIv?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DecryptedFile extends FileDTO {
  name: string; // decrypted filename
  mimeType?: string; // decrypted MIME type
}

export interface FileListResponse {
  files: FileDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Search ───────────────────────────────────────────────────

export interface SearchResult {
  fileId: string;
  score: number;
  encryptedName: string;
  nameIv: string;
  size: number;
}

export interface SearchHistoryItem {
  id: string;
  encryptedQuery: string;
  queryIv: string;
  resultCount: number;
  searchedAt: string;
}

// ─── Analytics ────────────────────────────────────────────────

export interface StorageAnalytics {
  totalFiles: number;
  totalSize: number;
  storageByType: Record<string, number>;
  uploadsOverTime: Array<{ date: string; count: number; size: number }>;
}

// ─── API ──────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export type FileType = 'pdf' | 'docx' | 'txt' | 'md' | 'csv' | 'json' | 'unknown';
