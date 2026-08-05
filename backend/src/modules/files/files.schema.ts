/**
 * Zod validation schemas for file endpoints.
 * @module modules/files/files.schema
 */

import { z } from 'zod';

/**
 * List files query parameters.
 */
export const listFilesSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.enum(['createdAt', 'size', 'updatedAt']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
  }),
};

/**
 * Rename file body.
 */
export const renameFileSchema = {
  body: z.object({
    encryptedName: z.string().min(1, 'encryptedName is required'),
    nameIv: z.string().min(1, 'nameIv is required'),
  }),
};

/**
 * File ID parameter.
 */
export const fileIdParamSchema = {
  params: z.object({
    id: z.string().uuid('Invalid file ID'),
  }),
};
