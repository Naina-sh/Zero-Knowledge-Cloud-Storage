/**
 * Embedding routes.
 * @module modules/embeddings/embeddings.routes
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createEmbeddingSchema, embeddingFileIdSchema } from './embeddings.schema';
import { create, remove } from './embeddings.controller';

const router = Router();

router.use(authenticate);

/**
 * @route   POST /api/embeddings
 * @desc    Store or update an embedding for a file
 * @access  Private
 */
router.post('/', validate(createEmbeddingSchema), create);

/**
 * @route   DELETE /api/embeddings/:fileId
 * @desc    Delete a file's embedding
 * @access  Private
 */
router.delete('/:fileId', validate(embeddingFileIdSchema), remove);

export { router as embeddingRoutes };
