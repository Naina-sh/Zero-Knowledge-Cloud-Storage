/**
 * User controller.
 * @module modules/users/users.controller
 */

import type { Request, Response, NextFunction } from 'express';
import { getProfile, getAnalytics, deleteAccount } from './users.service';
import { deleteAccountSchema } from '../auth/auth.schema';
import type { ApiResponse } from '../../types';

/** GET /users/me */
export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await getProfile(req.user!.id);
    res.json({ success: true, data: profile } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

/** GET /users/me/analytics */
export async function analytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getAnalytics(req.user!.id);
    res.json({ success: true, data } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

/** DELETE /users/me */
export async function deleteMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = deleteAccountSchema.body.parse(req.body);
    await deleteAccount(req.user!.id, parsed.authKey);
    res.json({ success: true, message: 'Account deleted successfully' } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}
