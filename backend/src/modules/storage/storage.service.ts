/**
 * Storage service — abstraction over local filesystem and S3.
 * Swappable via STORAGE_DRIVER environment variable.
 * @module modules/storage
 */

import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
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
 * Works with any S3-compatible provider (Supabase Storage, AWS S3, etc.)
 * — set STORAGE_DRIVER=s3 plus the S3_* environment variables.
 */
class S3Storage implements StorageBackend {
  private client: S3Client;
  private bucket: string;

  constructor() {
    if (!env.storage.s3.bucket) {
      throw new InternalError('STORAGE_DRIVER=s3 requires S3_BUCKET to be set.');
    }

    this.bucket = env.storage.s3.bucket;
    this.client = new S3Client({
      region: env.storage.s3.region,
      credentials: {
        accessKeyId: env.storage.s3.accessKeyId,
        secretAccessKey: env.storage.s3.secretAccessKey,
      },
      // Custom endpoint (e.g. Supabase Storage) — enables S3-compatible providers
      ...(env.storage.s3.endpoint ? { endpoint: env.storage.s3.endpoint } : {}),
      ...(env.storage.s3.forcePathStyle ? { forcePathStyle: true } : {}),
    });

    logger.info(
      `S3 storage backend configured (bucket: ${this.bucket}, endpoint: ${env.storage.s3.endpoint || 'default AWS'})`
    );
  }

  async save(key: string, data: Buffer): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data })
    );
  }

  async saveStream(key: string, stream: Readable): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: stream })
    );
  }

  async read(key: string): Promise<Buffer> {
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key })
      );
      // S3 Body is a Readable stream — collect it into a Buffer
      const chunks: Buffer[] = [];
      for await (const chunk of res.Body as Readable) {
        chunks.push(Buffer.from(chunk as Buffer));
      }
      return Buffer.concat(chunks);
    } catch (err) {
      throw new NotFoundError('File');
    }
  }

  createReadStream(key: string): Readable {
    // Express send()'s the buffer, so read() covers the download path.
    // For streaming, return a lazy stream that fetches on demand.
    const client = this.client;
    const bucket = this.bucket;
    return new Readable({
      async read() {
        try {
          const res = await client.send(
            new GetObjectCommand({ Bucket: bucket, Key: key })
          );
          for await (const chunk of res.Body as Readable) {
            this.push(chunk);
          }
          this.push(null);
        } catch {
          this.destroy(new NotFoundError('File data in storage'));
        }
      },
    });
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
      );
    } catch (err) {
      // Idempotent — don't fail if file doesn't exist
      logger.warn(`S3 delete failed for ${key}: ${err}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key })
      );
      return true;
    } catch {
      return false;
    }
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
