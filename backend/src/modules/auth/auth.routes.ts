/**
 * Authentication routes.
 * @module modules/auth/auth.routes
 */

import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { authLimiter } from '../../middleware/rateLimit.middleware';
import { registerSchema, saltSchema, loginSchema } from './auth.schema';
import { register, getSalt, login, refresh, logout } from './auth.controller';

const router = Router();

// All auth routes have stricter rate limiting to prevent brute-force
router.use(authLimiter);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (client derives authKey + salts)
 * @access  Public
 */
router.post('/register', validate(registerSchema), register);

/**
 * @route   GET /api/auth/salt
 * @desc    Retrieve salts for key derivation (used before login)
 * @access  Public
 */
router.get('/salt', validate(saltSchema), getSalt);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate with email + derived authKey
 * @access  Public
 */
router.post('/login', validate(loginSchema), login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token (reads refresh token from cookie)
 * @access  Public (requires valid refresh cookie)
 */
router.post('/refresh', refresh);

/**
 * @route   POST /api/auth/logout
 * @desc    Revoke refresh token and clear cookie
 * @access  Public
 */
router.post('/logout', logout);

export { router as authRoutes };
