/**
 * Database migration runner.
 * Reads SQL files from the migrations directory and executes them in order.
 * @module database/migrate
 */

import fs from 'fs';
import path from 'path';
import { getClient } from '../config/database';
import { logger } from '../utils/logger';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Run all pending SQL migrations in alphabetical order.
 * Each migration file is executed in its own transaction.
 */
export async function runMigrations(): Promise<void> {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    logger.warn(`Migrations directory not found: ${MIGRATIONS_DIR}`);
    return;
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    logger.info('No migration files found');
    return;
  }

  const client = await getClient();

  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Get already-executed migrations
    const { rows } = await client.query('SELECT filename FROM _migrations');
    const executed = new Set(rows.map((r) => r.filename));

    for (const file of files) {
      if (executed.has(file)) {
        logger.debug(`Skipping already-executed migration: ${file}`);
        continue;
      }

      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        logger.info(`Migration executed: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error(`Migration failed: ${file}`, err);
        throw err;
      }
    }

    logger.info('All migrations completed successfully');
  } finally {
    client.release();
  }
}
