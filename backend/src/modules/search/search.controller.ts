/**
 * Search controller.
 * @module modules/search/search.controller
 */

import type { Request, Response, NextFunction } from 'express';
import { semanticSearch, getSearchHistory, clearSearchHistory } from './search.service';
import type { ApiResponse, SearchResult, SearchHistoryRecord } from '../../types';

/** POST /search */
export async function search(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { queryEmbedding, topK, threshold, encryptedQuery, queryIv } = req.body;

    const results = await semanticSearch({
      userId: req.user!.id,
      queryEmbedding,
      topK,
      threshold,
      encryptedQuery,
      queryIv,
    });

    res.json({ success: true, data: { results } } satisfies ApiResponse<{ results: SearchResult[] }>);
  } catch (err) {
    next(err);
  }
}

/** GET /search/history */
export async function history(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = parseInt((req.query.limit as string) ?? '50', 10);
    const records = await getSearchHistory(req.user!.id, limit);

    const history = records.map((r) => ({
      id: r.id,
      encryptedQuery: r.encrypted_query,
      queryIv: r.query_iv,
      resultCount: r.result_count,
      searchedAt: r.searched_at,
    }));

    res.json({ success: true, data: { history } } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}

/** DELETE /search/history */
export async function clearHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await clearSearchHistory(req.user!.id);
    res.json({ success: true, message: 'Search history cleared' } satisfies ApiResponse);
  } catch (err) {
    next(err);
  }
}
