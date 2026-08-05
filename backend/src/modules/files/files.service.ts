/**
 * File service — encrypted file metadata management.
 * The server stores encrypted blobs (via StorageService) and metadata in DB.
 * The server NEVER decrypts anything — all crypto is client-side.
 * @module modules/files/files.service
 */

import crypto from 'crypto';
import { query, getClient } from '../../config/database';
import { storageService } from '../storage/storage.service';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import type { FileRecord, EmbeddingRecord } from '../../types';

export interface UploadFileInput {
  userId: string;
  fileBuffer: Buffer;
  encryptedName: string;
  nameIv: string;
  fileIv: string;
  embedding: number[];
  originalSize: number;
  mimeType?: string;
  mimeIv?: string;
}

export interface FileListResult {
  files: FileRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * Upload an encrypted file: store blob in storage, insert metadata + embedding.
 */
export async function uploadFile(input: UploadFileInput): Promise<FileRecord> {
  const fileId = crypto.randomUUID();
  const storageKey = `${input.userId}/${fileId}.enc`;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Save encrypted blob to storage backend
    await storageService.save(storageKey, input.fileBuffer);

    // Insert file metadata
    const fileResult = await client.query<FileRecord>(
      `INSERT INTO files (id, user_id, encrypted_name, name_iv, file_iv, storage_path, size, original_size, mime_encrypted, mime_iv)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        fileId,
        input.userId,
        input.encryptedName,
        input.nameIv,
        input.fileIv,
        storageKey,
        input.fileBuffer.length,
        input.originalSize,
        input.mimeType ?? null,
        input.mimeIv ?? null,
      ]
    );

    // Insert embedding (pgvector stores the vector)
    await client.query(
      `INSERT INTO embeddings (file_id, user_id, vector, model)
       VALUES ($1, $2, $3, 'all-MiniLM-L6-v2')`,
      [fileId, input.userId, input.embedding]
    );

    await client.query('COMMIT');

    logger.info(`File uploaded: ${fileId} for user ${input.userId}`);
    return fileResult.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    // Clean up orphaned file in storage if DB insert failed
    try {
      await storageService.delete(storageKey);
    } catch {
      // Ignore cleanup errors
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * List files for a user with pagination.
 */
export async function listFiles(
  userId: string,
  page: number,
  limit: number,
  sort: string,
  order: string
): Promise<FileListResult> {
  const validSortColumns = ['created_at', 'size', 'updated_at'];
  const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const countResult = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM files WHERE user_id = $1',
    [userId]
  );
  const total = parseInt(countResult[0].count, 10);

  const files = await query<FileRecord>(
    `SELECT * FROM files WHERE user_id = $1
     ORDER BY ${sortColumn} ${sortOrder}
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return {
    files,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Get a single file's metadata.
 */
export async function getFile(userId: string, fileId: string): Promise<FileRecord> {
  const rows = await query<FileRecord>(
    'SELECT * FROM files WHERE id = $1 AND user_id = $2',
    [fileId, userId]
  );

  if (rows.length === 0) {
    throw new NotFoundError('File');
  }

  return rows[0];
}

/**
 * Download an encrypted file — returns the encrypted blob + metadata.
 */
export async function downloadFile(
  userId: string,
  fileId: string
): Promise<{ buffer: Buffer; file: FileRecord }> {
  const file = await getFile(userId, fileId);

  // Verify file still exists in storage
  const exists = await storageService.exists(file.storage_path);
  if (!exists) {
    throw new NotFoundError('File data in storage');
  }

  const buffer = await storageService.read(file.storage_path);
  return { buffer, file };
}

/**
 * Rename a file (client provides the new encrypted name + IV).
 */
export async function renameFile(
  userId: string,
  fileId: string,
  encryptedName: string,
  nameIv: string
): Promise<FileRecord> {
  // First verify ownership
  await getFile(userId, fileId);

  const rows = await query<FileRecord>(
    `UPDATE files SET encrypted_name = $1, name_iv = $2, updated_at = NOW()
     WHERE id = $3 AND user_id = $4 RETURNING *`,
    [encryptedName, nameIv, fileId, userId]
  );

  if (rows.length === 0) {
    throw new ForbiddenError('You do not own this file');
  }

  return rows[0];
}

/**
 * Delete a file and its embedding permanently.
 */
export async function deleteFile(userId: string, fileId: string): Promise<void> {
  const file = await getFile(userId, fileId);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Delete from DB (embeddings cascade-delete via FK)
    const result = await client.query(
      'DELETE FROM files WHERE id = $1 AND user_id = $2',
      [fileId, userId]
    );

    if (result.rowCount === 0) {
      throw new ForbiddenError('You do not own this file');
    }

    await client.query('COMMIT');

    // Delete encrypted blob from storage
    await storageService.delete(file.storage_path);

    logger.info(`File deleted: ${fileId} for user ${userId}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
