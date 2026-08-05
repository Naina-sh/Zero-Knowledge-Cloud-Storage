/**
 * Global error handling middleware.
 * Converts AppError instances to structured API responses.
 * Logs non-operational errors with stack traces.
 * @module middleware/error.middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { AppError, InternalError } from '../utils/errors';
import { logger } from '../utils/logger';
import type { ApiResponse } from '../types';
import { env } from '../config/env';

/**
 * 404 handler — catches unmatched routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  } satisfies ApiResponse);
}

/**
 * Central error handler — must have 4 parameters for Express to recognize it.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Convert unknown errors to InternalError
  const appError = err instanceof AppError ? err : new InternalError(err.message);

  // Log non-operational errors (unexpected bugs) with full stack
  if (!appError.isOperational) {
    logger.error('Unhandled error', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  } else if (appError.statusCode >= 400 && appError.statusCode < 500) {
    // Log client errors at debug level
    logger.debug(`Client error: ${appError.code} — ${appError.message}`);
  }

  const response: ApiResponse = {
    success: false,
    error: appError.toApiError(),
  };

  // In development, include stack trace for debugging
  if (env.nodeEnv === 'development' && !appError.isOperational && response.error) {
    (response.error as unknown as Record<string, unknown>).stack = err.stack;
  }

  res.status(appError.statusCode).json(response);
}
