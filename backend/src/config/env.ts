/**
 * Environment variable loading and validation.
 * All config is centralized here — no other module reads process.env directly.
 * @module config/env
 */

import dotenv from 'dotenv';

dotenv.config();

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function parseInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid integer`);
  }
  return parsed;
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: parseInt('PORT', 4000),
  logLevel: optional('LOG_LEVEL', 'info'),

  database: {
    url: required('DATABASE_URL', 'postgresql://zk_user:change_me_in_production@localhost:5432/zk_storage'),
  },

  jwt: {
    secret: required('JWT_SECRET', 'dev-access-secret-change-in-production'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-in-production'),
    accessExpiry: optional('JWT_ACCESS_EXPIRY', '15m'),
    refreshExpiry: optional('JWT_REFRESH_EXPIRY', '7d'),
  },

  cors: {
    origins: optional('CORS_ORIGIN', 'http://localhost:5173').split(',').map((s) => s.trim()),
  },

  storage: {
    driver: optional('STORAGE_DRIVER', 'local') as 'local' | 's3',
    path: optional('STORAGE_PATH', './uploads'),
    s3: {
      bucket: optional('S3_BUCKET', ''),
      region: optional('S3_REGION', 'us-east-1'),
      accessKeyId: optional('S3_ACCESS_KEY_ID', ''),
      secretAccessKey: optional('S3_SECRET_ACCESS_KEY', ''),
    },
  },

  rateLimit: {
    windowMs: parseInt('RATE_LIMIT_WINDOW_MS', 900000),
    max: parseInt('RATE_LIMIT_MAX', 100),
  },
} as const;

export type Env = typeof env;
