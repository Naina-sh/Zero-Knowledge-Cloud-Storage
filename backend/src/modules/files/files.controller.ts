/**
 * File controller — handles HTTP request/response for file endpoints.
 * @module modules/files/files.controller
 */

import type { Request, Response, NextFunction } from 'express';
import { uploadFile, listFiles, getFile, downloadFile, renameFile, deleteFile } from './files.service';
import { ValidationError } from '../../utils/errors';
import type { ApiResponse, FileRecord } from '../../types';

interface UploadBody {
  encryptedName: string;
  nameIv: string;
  fileIv: string;
  embedding: string;
  originalSize: string;
  mimeType?: string;
  mimeIv?: string;
}

/** POST /files/upload */
export async function upload(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      throw new ValidationError('No file provided');
    }

    const body = req.body as UploadBody;

    // Parse the embedding (sent as JSON string in form data)
    let embedding: number[];
    try {
      embedding = JSON.parse(body.embedding) as number[];
    } catch {
      throw new ValidationError('Invalid embedding format — expected JSON array');
    }

    if (!Array.isArray(embedding) || embedding.length !== 384) {
      throw new ValidationError('Embedding must be an array of 384 floats');
    }

    const file = await uploadFile({
      userId: req.user!.id,
      fileBuffer: req.file.buffer,
      encryptedName: body.encryptedName,
      nameIv: body.nameIv,
      fileIv: body.fileIv,
      embedding,
      originalSize: parseInt(body.originalSize, 10),
      mimeType: body.mimeType,
      mimeIv: body.mimeIv,
    });

    res.status(201).json({ success: true, data: toFileDTO(file) } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

/** GET /files */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query as unknown as {
      page: number; limit: number; sort: string; order: string;
    };
    const { page, limit, sort, order } = query;
    const result = await listFiles(req.user!.id, page, limit, sort, order);

    res.json({
      success: true,
      data: {
        files: result.files.map(toFileDTO),
        pagination: result.pagination,
      },
    } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

/** GET /files/:id */
export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = await getFile(req.user!.id, req.params.id);
    res.json({ success: true, data: toFileDTO(file) } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

/** GET /files/:id/download */
export async function download(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { buffer, file } = await downloadFile(req.user!.id, req.params.id);

    // Send encrypted blob with metadata in custom headers
    // The client uses these to decrypt the file and filename
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length.toString());
    res.setHeader('X-File-Iv', file.file_iv);
    res.setHeader('X-Encrypted-Name', file.encrypted_name);
    res.setHeader('X-Name-Iv', file.name_iv);
    if (file.mime_encrypted) {
      res.setHeader('X-Mime-Encrypted', file.mime_encrypted);
      res.setHeader('X-Mime-Iv', file.mime_iv ?? '');
    }

    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

/** PATCH /files/:id/rename */
export async function rename(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { encryptedName, nameIv } = req.body;
    const file = await renameFile(req.user!.id, req.params.id, encryptedName, nameIv);
    res.json({ success: true, data: toFileDTO(file) } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

/** DELETE /files/:id */
export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteFile(req.user!.id, req.params.id);
    res.json({ success: true, message: 'File deleted successfully' } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

/**
 * Convert a DB file record to a client-facing DTO (snake_case → camelCase).
 */
function toFileDTO(file: FileRecord) {
  return {
    id: file.id,
    encryptedName: file.encrypted_name,
    nameIv: file.name_iv,
    fileIv: file.file_iv,
    size: file.size,
    originalSize: file.original_size,
    mimeEncrypted: file.mime_encrypted,
    mimeIv: file.mime_iv,
    createdAt: file.created_at,
    updatedAt: file.updated_at,
  };
}
