/**
 * Express application configuration.
 * Wires up middleware, routes, and error handlers.
 * @module app
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { apiLimiter } from './middleware/rateLimit.middleware';
import { notFoundHandler, errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';
import { authRoutes } from './modules/auth/auth.routes';
import { fileRoutes } from './modules/files/files.routes';
import { embeddingRoutes } from './modules/embeddings/embeddings.routes';
import { searchRoutes } from './modules/search/search.routes';
import { userRoutes } from './modules/users/users.routes';

/**
 * Create and configure the Express application.
 */
export function createApp(): express.Application {
  const app = express();

  // ─── Security middleware ───
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false, // API only — no HTML
    })
  );

  // ─── CORS ───
  app.use(
    cors({
      origin: env.cors.origins,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-File-Iv', 'X-Encrypted-Name', 'X-Name-Iv'],
      exposedHeaders: ['X-File-Iv', 'X-Encrypted-Name', 'X-Name-Iv', 'X-Mime-Encrypted', 'X-Mime-Iv'],
    })
  );

  // ─── Body parsing ───
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // ─── Compression ───
  app.use(compression());

  // ─── HTTP request logging ───
  const morganFormat = env.nodeEnv === 'production' ? 'combined' : 'dev';
  app.use(
    morgan(morganFormat, {
      stream: { write: (message) => logger.http(message.trim()) },
    })
  );

  // ─── Rate limiting (global) ───
  app.use('/api', apiLimiter);

  // ─── Health check ───
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // ─── API routes ───
  app.use('/api/auth', authRoutes);
  app.use('/api/files', fileRoutes);
  app.use('/api/embeddings', embeddingRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/users', userRoutes);

  // ─── 404 + Error handlers (must be last) ───
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
