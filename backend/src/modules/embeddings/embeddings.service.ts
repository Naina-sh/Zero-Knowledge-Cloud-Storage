/**
 * Embedding service — stores and retrieves semantic embeddings in pgvector.
 * Embeddings are generated CLIENT-SIDE (Transformers.js) and sent as vectors.
 * The server only stores and searches vectors — never the source text.
 * @module modules/embeddings/embeddings.service
 */

import { query } from '../../config/database';
import { NotFoundError, ForbiddenError } from '../../utils/errors';
import type { EmbeddingRecord } from '../../types';

/**
 * Store an embedding for a file. Verifies file ownership.
 * If an embedding already exists for the file, it is replaced.
 */
export async function createEmbedding(
  userId: string,
  fileId: string,
  embedding: number[],
  model: string
): Promise<{ embeddingId: string; fileId: string }> {
  // Verify file ownership
  const fileCheck = await query<{ id: string }>(
    'SELECT id FROM files WHERE id = $1 AND user_id = $2',
    [fileId, userId]
  );

  if (fileCheck.length === 0) {
    throw new NotFoundError('File');
  }

  // Upsert embedding (one embedding per file)
  const rows = await query<Pick<EmbeddingRecord, 'id' | 'file_id'>>(
    `INSERT INTO embeddings (file_id, user_id, vector, model)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (file_id)
     DO UPDATE SET vector = EXCLUDED.vector, model = EXCLUDED.model
     RETURNING id, file_id`,
    [fileId, userId, embedding, model]
  );

  return { embeddingId: rows[0].id, fileId: rows[0].file_id };
}

/**
 * Delete an embedding for a file.
 */
export async function deleteEmbedding(userId: string, fileId: string): Promise<void> {
  // Verify ownership
  const fileCheck = await query<{ id: string }>(
    'SELECT id FROM files WHERE id = $1 AND user_id = $2',
    [fileId, userId]
  );

  if (fileCheck.length === 0) {
    throw new ForbiddenError('You do not own this file');
  }

  await query('DELETE FROM embeddings WHERE file_id = $1', [fileId]);
}
