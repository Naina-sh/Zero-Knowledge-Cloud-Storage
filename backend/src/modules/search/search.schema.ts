/**
 * Zod validation schemas for search endpoints.
 * @module modules/search/search.schema
 */

import { z } from 'zod';

/**
 * Semantic search body.
 * The client sends the embedding VECTOR of the query (never plaintext).
 */
export const searchSchema = {
  body: z.object({
    queryEmbedding: z.array(z.number()).length(384, 'Query embedding must be 384 dimensions'),
    topK: z.number().int().min(1).max(50).default(10),
    threshold: z.number().min(0).max(1).default(0.3),
    encryptedQuery: z.string().optional(),
    queryIv: z.string().optional(),
  }),
};

export const searchHistorySchema = {
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
};
