/**
 * Embedding controller.
 * @module modules/embeddings/embeddings.controller
 */

import type { Request, Response, NextFunction } from 'express';
import { createEmbedding, deleteEmbedding } from './embeddings.service';
import type { ApiResponse } from '../../types';

/** POST /embeddings */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fileId, embedding, model } = req.body;
    const result = await createEmbedding(req.user!.id, fileId, embedding, model);

    res.status(201).json({ success: true, data: result } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

/** DELETE /embeddings/:fileId */
export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteEmbedding(req.user!.id, req.params.fileId);
    res.json({ success: true, message: 'Embedding deleted' } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}
