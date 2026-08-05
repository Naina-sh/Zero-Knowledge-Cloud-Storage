/**
 * Rate limiting middleware using express-rate-limit.
 * Different limiters for auth endpoints vs general API.
 * @module middleware/rateLimit.middleware
 */

import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * General API rate limiter — applies to all routes.
 */
export const apiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again later.',
    },
  },
});

/**
 * Stricter rate limiter for authentication endpoints (login, register).
 * Prevents brute-force attacks on the authKey.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts, please try again later.',
    },
  },
});

/**
 * Rate limiter for file upload — limits to prevent storage abuse.
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 uploads per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many upload requests, please slow down.',
    },
  },
});
