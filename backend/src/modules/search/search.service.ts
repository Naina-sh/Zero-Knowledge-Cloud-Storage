/**
 * Search service — pgvector semantic similarity search.
 * The server receives the query EMBEDDING (never the plaintext query),
 * performs cosine similarity search against stored embeddings, and
 * returns matching file IDs + scores.
 * @module modules/search/search.service
 */

import { query, getClient } from '../../config/database';
import type { SearchResult, SearchHistoryRecord } from '../../types';
import { logger } from '../../utils/logger';

export interface SearchInput {
  userId: string;
  queryEmbedding: number[];
  topK: number;
  threshold: number;
  encryptedQuery?: string;
  queryIv?: string;
}

/**
 * Perform semantic vector similarity search using pgvector.
 * Cosine distance operator `<=>`: 0 = identical, 2 = opposite.
 * Score = 1 - cosine_distance, so score ranges from -1 to 1 (higher = more similar).
 */
export async function semanticSearch(input: SearchInput): Promise<SearchResult[]> {
  const { userId, queryEmbedding, topK, threshold } = input;

  // pgvector query: find nearest embeddings for this user, above threshold
  // 1 - (vector <=> query) = cosine similarity score
  const rows = await query<{
    file_id: string;
    encrypted_name: string;
    name_iv: string;
    size: number;
    score: number;
  }>(
    `SELECT
        e.file_id,
        f.encrypted_name,
        f.name_iv,
        f.size,
        1 - (e.vector <=> $1::vector) AS score
     FROM embeddings e
     JOIN files f ON f.id = e.file_id
     WHERE e.user_id = $2
       AND 1 - (e.vector <=> $1::vector) >= $3
     ORDER BY e.vector <=> $1::vector
     LIMIT $4`,
    [queryEmbedding, userId, threshold, topK]
  );

  const results: SearchResult[] = rows.map((r) => ({
    fileId: r.file_id,
    score: parseFloat(r.score.toString()),
    encryptedName: r.encrypted_name,
    nameIv: r.name_iv,
    size: parseInt(r.size.toString(), 10),
  }));

  // Save search history (encrypted query, if provided)
  if (input.encryptedQuery && input.queryIv) {
    await saveSearchHistory(userId, input.encryptedQuery, input.queryIv, results.length);
  }

  logger.info(`Semantic search for user ${userId}: ${results.length} results`);
  return results;
}

/**
 * Save a search to history (query is encrypted by the client).
 */
async function saveSearchHistory(
  userId: string,
  encryptedQuery: string,
  queryIv: string,
  resultCount: number
): Promise<void> {
  await query(
    `INSERT INTO search_history (user_id, encrypted_query, query_iv, result_count)
     VALUES ($1, $2, $3, $4)`,
    [userId, encryptedQuery, queryIv, resultCount]
  );
}

/**
 * Get search history for a user.
 */
export async function getSearchHistory(userId: string, limit: number): Promise<SearchHistoryRecord[]> {
  const rows = await query<SearchHistoryRecord>(
    `SELECT id, user_id, encrypted_query, query_iv, result_count, searched_at
     FROM search_history
     WHERE user_id = $1
     ORDER BY searched_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    encrypted_query: r.encrypted_query,
    query_iv: r.query_iv,
    result_count: r.result_count,
    searched_at: r.searched_at,
  }));
}

/**
 * Clear all search history for a user.
 */
export async function clearSearchHistory(userId: string): Promise<void> {
  const client = await getClient();
  try {
    await client.query('DELETE FROM search_history WHERE user_id = $1', [userId]);
  } finally {
    client.release();
  }
}
