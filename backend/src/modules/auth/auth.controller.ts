/**
 * Authentication controller — handles HTTP request/response for auth endpoints.
 * @module modules/auth/auth.controller
 */

import type { Request, Response, NextFunction } from 'express';
import {
  registerUser,
  getSalts,
  loginUser,
  refreshTokens,
  logoutUser,
} from './auth.service';
import type { ApiResponse } from '../../types';

const REFRESH_COOKIE_NAME = 'zk_refresh';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/** POST /auth/register */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, authKey, authSalt, encSalt } = req.body;
    const result = await registerUser(email, authKey, authSalt, encSalt);

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      data: { user: result.user, accessToken: result.accessToken },
    } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

/** GET /auth/salt */
export async function getSalt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const email = req.query.email as string;
    const salts = await getSalts(email);

    res.json({ success: true, data: salts } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

/** POST /auth/login */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, authKey } = req.body;
    const result = await loginUser(email, authKey);

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      success: true,
      data: { user: result.user, accessToken: result.accessToken },
    } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

/** POST /auth/refresh */
export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No refresh token provided' },
      } satisfies ApiResponse);
      return;
    }

    const result = await refreshTokens(refreshToken);
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({ success: true, data: { accessToken: result.accessToken } } satisfies ApiResponse);
  } catch (err) {
    // Clear invalid refresh cookie
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    next(err);
  }
}

/** POST /auth/logout */
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    await logoutUser(refreshToken);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });

    res.json({ success: true, message: 'Logged out successfully' } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}
