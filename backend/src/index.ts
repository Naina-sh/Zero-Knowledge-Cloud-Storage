/**
 * Server entry point — starts the Express server and manages graceful shutdown.
 * @module index
 */

import { createApp } from './app';
import { env } from './config/env';
import { getPool, closePool } from './config/database';
import { runMigrations } from './database/migrate';
import { logger } from './utils/logger';

/**
 * Start the server: run migrations, create app, listen.
 */
async function startServer(): Promise<void> {
  try {
    logger.info(`Starting server in ${env.nodeEnv} mode...`);

    // Verify database connection
    const pool = getPool();
    await pool.query('SELECT 1');
    logger.info('Database connection verified');

    // Run pending migrations
    await runMigrations();

    // Create and start Express app
    const app = createApp();
    const server = app.listen(env.port, () => {
      logger.info(`🚀 Server running on http://localhost:${env.port}`);
      logger.info(`📡 API base URL: http://localhost:${env.port}/api`);
      logger.info(`❤️  Health check: http://localhost:${env.port}/api/health`);
    });

    // ─── Graceful shutdown ───
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down gracefully...`);
      server.close(async () => {
        await closePool();
        logger.info('Server closed');
        process.exit(0);
      });

      // Force exit after 10 seconds if graceful shutdown hangs
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle unhandled rejections and exceptions
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', { promise, reason });
    });

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
      shutdown('uncaughtException');
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
