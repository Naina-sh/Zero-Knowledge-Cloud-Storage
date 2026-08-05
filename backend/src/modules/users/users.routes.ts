/**
 * User routes.
 * @module modules/users/users.routes
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { me, analytics, deleteMe } from './users.controller';

const router = Router();

router.use(authenticate);

/**
 * @route   GET /api/users/me
 * @desc    Get authenticated user's profile
 * @access  Private
 */
router.get('/me', me);

/**
 * @route   GET /api/users/me/analytics
 * @desc    Get storage analytics
 * @access  Private
 */
router.get('/me/analytics', analytics);

/**
 * @route   DELETE /api/users/me
 * @desc    Delete account (requires authKey confirmation)
 * @access  Private
 */
router.delete('/me', deleteMe);

export { router as userRoutes };
