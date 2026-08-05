/**
 * User service — profile, analytics, account management.
 * @module modules/users/users.service
 */

import argon2 from 'argon2';
import { query, getClient } from '../../config/database';
import { NotFoundError, UnauthorizedError } from '../../utils/errors';
import { storageService } from '../storage/storage.service';
import { logger } from '../../utils/logger';
import type { User } from '../../types';

export interface UserProfile {
  id: string;
  email: string;
  storageUsed: number;
  createdAt: Date;
}

/**
 * Get the authenticated user's profile.
 */
export async function getProfile(userId: string): Promise<UserProfile> {
  const rows = await query<User>(
    'SELECT id, email, storage_used, created_at FROM users WHERE id = $1',
    [userId]
  );

  if (rows.length === 0) {
    throw new NotFoundError('User');
  }

  const user = rows[0];
  return {
    id: user.id,
    email: user.email,
    storageUsed: parseInt(user.storage_used.toString(), 10),
    createdAt: user.created_at,
  };
}

export interface StorageAnalytics {
  totalFiles: number;
  totalSize: number;
  storageByType: Record<string, number>;
  uploadsOverTime: Array<{ date: string; count: number; size: number }>;
}

/**
 * Get storage analytics for the dashboard.
 */
export async function getAnalytics(userId: string): Promise<StorageAnalytics> {
  // Total files and size
  const totals = await query<{ total_files: string; total_size: string }>(
    `SELECT COUNT(*) as total_files, COALESCE(SUM(size), 0) as total_size
     FROM files WHERE user_id = $1`,
    [userId]
  );

  // Files by "type" — we use file size buckets as a proxy since MIME is encrypted.
  // For real type breakdown, the client would need to send an encrypted type category.
  const typeBreakdown = await query<{ bucket: string; count: string }>(
    `SELECT
       CASE
         WHEN size < 1024 THEN 'small'
         WHEN size < 1048576 THEN 'medium'
         WHEN size < 10485760 THEN 'large'
         ELSE 'xlarge'
       END as bucket,
       COUNT(*) as count
     FROM files WHERE user_id = $1
     GROUP BY bucket`,
    [userId]
  );

  const storageByType: Record<string, number> = {};
  typeBreakdown.forEach((r) => {
    storageByType[r.bucket] = parseInt(r.count, 10);
  });

  // Uploads over time (last 30 days, grouped by day)
  const uploads = await query<{ date: string; count: string; size: string }>(
    `SELECT
       DATE(created_at) as date,
       COUNT(*) as count,
       COALESCE(SUM(size), 0) as size
     FROM files
     WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
     GROUP BY DATE(created_at)
     ORDER BY date`,
    [userId]
  );

  return {
    totalFiles: parseInt(totals[0].total_files, 10),
    totalSize: parseInt(totals[0].total_size, 10),
    storageByType,
    uploadsOverTime: uploads.map((r) => ({
      date: r.date,
      count: parseInt(r.count, 10),
      size: parseInt(r.size, 10),
    })),
  };
}

/**
 * Delete the user account and all associated data.
 * Requires the authKey for confirmation (server verifies against stored hash).
 */
export async function deleteAccount(userId: string, authKey: string): Promise<void> {
  const rows = await query<Pick<User, 'id' | 'auth_key_hash'>>(
    'SELECT id, auth_key_hash FROM users WHERE id = $1',
    [userId]
  );

  if (rows.length === 0) {
    throw new NotFoundError('User');
  }

  const valid = await argon2.verify(rows[0].auth_key_hash, authKey);
  if (!valid) {
    throw new UnauthorizedError('Invalid auth key for account deletion');
  }

  // Get all file storage paths to clean up
  const files = await query<{ storage_path: string }>(
    'SELECT storage_path FROM files WHERE user_id = $1',
    [userId]
  );

  const client = await getClient();
  try {
    await client.query('BEGIN');
    // Delete user — cascades to files, embeddings, search_history, refresh_tokens
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
    await client.query('COMMIT');

    // Clean up stored encrypted blobs
    for (const file of files) {
      try {
        await storageService.delete(file.storage_path);
      } catch {
        // Continue even if some files can't be deleted
      }
    }

    logger.info(`Account deleted: ${userId}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
