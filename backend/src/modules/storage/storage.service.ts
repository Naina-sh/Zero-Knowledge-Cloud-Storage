/**
 * Storage service — abstraction over local filesystem and S3.
 * Swappable via STORAGE_DRIVER environment variable.
 * @module modules/storage
 */

import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import type { Readable } from 'stream';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { InternalError, NotFoundError } from '../../utils/errors';

export interface StorageBackend {
  save(key: string, data: Buffer): Promise<void>;
  saveStream(key: string, stream: Readable): Promise<void>;
  read(key: string): Promise<Buffer>;
  createReadStream(key: string): Readable;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

/**
 * Local filesystem storage backend.
 */
class LocalStorage implements StorageBackend {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = path.resolve(basePath);
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  private resolve(key: string): string {
    // Prevent path traversal
    const safe = path.normalize(key).replace(/^(\.\.[/\\])+/, '');
    return path.join(this.basePath, safe);
  }

  async save(key: string, data: Buffer): Promise<void> {
    const fullPath = this.resolve(key);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, data);
  }

  async saveStream(key: string, stream: Readable): Promise<void> {
    const fullPath = this.resolve(key);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    const writeStream = fs.createWriteStream(fullPath);
    await pipeline(stream, writeStream);
  }

  async read(key: string): Promise<Buffer> {
    const fullPath = this.resolve(key);
    try {
      return await fs.promises.readFile(fullPath);
    } catch {
      throw new NotFoundError('File');
    }
  }

  createReadStream(key: string): Readable {
    const fullPath = this.resolve(key);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundError('File');
    }
    return fs.createReadStream(fullPath);
  }

  async delete(key: string): Promise<void> {
    const fullPath = this.resolve(key);
    try {
      await fs.promises.unlink(fullPath);
    } catch (err) {
      // Idempotent — don't fail if file doesn't exist
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    const fullPath = this.resolve(key);
    return fs.existsSync(fullPath);
  }
}

/**
 * S3-compatible storage backend.
 * Uses AWS SDK only when STORAGE_DRIVER=s3 to avoid unnecessary dependency.
 */
class S3Storage implements StorageBackend {
  // NOTE: S3 implementation is a stub interface.
  // In production, install @aws-sdk/client-s3 and implement these methods.
  // The interface is intentionally identical so swapping requires no code changes.

  async save(_key: string, _data: Buffer): Promise<void> {
    throw new InternalError('S3 storage backend not configured. Install @aws-sdk/client-s3 and implement S3Storage.');
  }
  async saveStream(_key: string, _stream: Readable): Promise<void> {
    throw new InternalError('S3 storage backend not configured.');
  }
  async read(_key: string): Promise<Buffer> {
    throw new InternalError('S3 storage backend not configured.');
  }
  createReadStream(_key: string): Readable {
    throw new InternalError('S3 storage backend not configured.');
  }
  async delete(_key: string): Promise<void> {
    throw new InternalError('S3 storage backend not configured.');
  }
  async exists(_key: string): Promise<boolean> {
    throw new InternalError('S3 storage backend not configured.');
  }
}

/**
 * Factory — returns the configured storage backend.
 */
function createStorage(): StorageBackend {
  switch (env.storage.driver) {
    case 's3':
      logger.info('Using S3 storage backend');
      return new S3Storage();
    case 'local':
    default:
      logger.info(`Using local storage backend at ${env.storage.path}`);
      return new LocalStorage(env.storage.path);
  }
}

// Singleton instance
const storageInstance = createStorage();

export const storageService = storageInstance;
