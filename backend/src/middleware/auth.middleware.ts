/**
 * Authentication middleware — verifies JWT access token.
 * @module middleware/auth.middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';
import type { AuthenticatedUser } from '../types';

/**
 * Extracts and verifies the Bearer token from the Authorization header.
 * Attaches the decoded user to req.user on success.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);

    if (payload.type !== 'access') {
      return next(new UnauthorizedError('Invalid token type'));
    }

    req.user = {
      id: payload.userId,
      email: payload.email,
    } satisfies AuthenticatedUser;

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional authentication — proceeds even if no token is present,
 * but populates req.user if a valid token is found.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    if (payload.type === 'access') {
      req.user = { id: payload.userId, email: payload.email };
    }
  } catch {
    // Silently ignore — optional auth
  }

  next();
}
