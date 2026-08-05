/**
 * Database module exports.
 * @module database
 */

export { getPool, query, getClient, closePool } from '../config/database';
export { runMigrations } from './migrate';
