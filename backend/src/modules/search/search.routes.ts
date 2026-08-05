/**
 * Search routes.
 * @module modules/search/search.routes
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { searchSchema, searchHistorySchema } from './search.schema';
import { search, history, clearHistory } from './search.controller';

const router = Router();

router.use(authenticate);

/**
 * @route   POST /api/search
 * @desc    Semantic vector similarity search (client sends query embedding)
 * @access  Private
 */
router.post('/', validate(searchSchema), search);

/**
 * @route   GET /api/search/history
 * @desc    Get user's search history (queries are encrypted)
 * @access  Private
 */
router.get('/history', validate(searchHistorySchema), history);

/**
 * @route   DELETE /api/search/history
 * @desc    Clear search history
 * @access  Private
 */
router.delete('/history', clearHistory);

export { router as searchRoutes };
