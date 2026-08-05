/**
 * Zod validation schemas for embedding endpoints.
 * @module modules/embeddings/embeddings.schema
 */

import { z } from 'zod';

export const createEmbeddingSchema = {
  body: z.object({
    fileId: z.string().uuid('Invalid file ID'),
    embedding: z.array(z.number()).length(384, 'Embedding must be 384 dimensions'),
    model: z.string().optional().default('all-MiniLM-L6-v2'),
  }),
};

export const embeddingFileIdSchema = {
  params: z.object({
    fileId: z.string().uuid('Invalid file ID'),
  }),
};
