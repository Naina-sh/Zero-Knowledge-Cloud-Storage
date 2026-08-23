/**
 * PostgreSQL connection pool with pgvector support.
 * @module config/database
 */

import { Pool, type PoolClient } from 'pg';
import pgvector from 'pgvector/pg';
import { env } from './env';
import { logger } from '../utils/logger';

let pool: Pool | null = null;

/**
 * Get the singleton database connection pool.
 * Registers pgvector type parsers so vector columns are returned as arrays.
 */
export function getPool(): Pool {
  if (pool) {
    return pool;
  }

  pool = new Pool({
    connectionString: env.database.url,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    // Managed providers (Neon, Render, Heroku…) serve Postgres over TLS.
    // Localhost connections are unaffected — pg uses TLS only when the
    // connection string contains sslmode=require, or when the host isn't local.
    ssl: /sslmode=require/.test(env.database.url)
      ? { rejectUnauthorized: false }
      : undefined,
  });

  // Register pgvector types on each new client connection
  pool.on('connect', async (client: PoolClient) => {
    try {
      await pgvector.registerTypes(client);
    } catch (err) {
      logger.error('Failed to register pgvector types', err);
    }
  });

  pool.on('error', (err) => {
    logger.error('Unexpected error on idle database client', err);
  });

  logger.info('Database connection pool created');
  return pool;
}

/**
 * Execute a query against the pool. Thin wrapper for convenience.
 */
export async function query<T = Record<string, any>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const client = getPool();
  const result = await client.query(text, params);
  return result.rows as T[];
}

/**
 * Acquire a client for transactional operations.
 * Remember to call `client.release()`.
 */
export async function getClient(): Promise<PoolClient> {
  return getPool().connect();
}

/**
 * Close the pool (used during graceful shutdown).
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection pool closed');
  }
}
