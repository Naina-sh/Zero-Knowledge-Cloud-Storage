/**
 * Embedding service — generates semantic embeddings using Transformers.js.
 *
 * The sentence-transformer model (all-MiniLM-L6-v2) runs ENTIRELY in the browser
 * via WebAssembly inside a Web Worker. The server never sees the source text —
 * only the resulting 384-dimensional embedding vector.
 *
 * The model runs in a Web Worker (not the main thread) because onnxruntime-web
 * requires a clean worker context to initialize correctly under Vite.
 *
 * @module services/embedding.service
 */

import { config } from '../config';

// ─── Worker management ────────────────────────────────────────

let worker: Worker | null = null;
let modelReady = false;
let messageId = 0;

// Pending promise resolvers keyed by message id
const pending = new Map<
  number,
  { resolve: (value: unknown) => void; reject: (err: Error) => void }
>();

// Progress listeners (for model loading UI)
const progressListeners = new Set<(progress: { progress: number; loaded: boolean }) => void>();

/**
 * Lazily create the embedding web worker (singleton).
 */
function getWorker(): Worker {
  if (worker) return worker;

  // Vite-native worker construction — bundles the worker with the app
  worker = new Worker(new URL('./embedding.worker.ts', import.meta.url), {
    type: 'module',
  });

  worker.addEventListener('message', (event: MessageEvent) => {
    const msg = event.data as {
      id?: number;
      type: string;
      embedding?: number[];
      error?: string;
      data?: { progress: number; status: string };
    };

    // Progress / ready events (no id — broadcast)
    if (msg.type === 'progress' && msg.data) {
      const d = msg.data;
      if (d.status === 'progress') {
        progressListeners.forEach((cb) => cb({ progress: d.progress, loaded: false }));
      } else if (d.status === 'ready') {
        progressListeners.forEach((cb) => cb({ progress: 100, loaded: true }));
      }
      return;
    }

    if (msg.type === 'ready') {
      modelReady = true;
      progressListeners.forEach((cb) => cb({ progress: 100, loaded: true }));
      return;
    }

    // Response to a specific request (has id)
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)!;
      pending.delete(msg.id);

      if (msg.type === 'error') {
        reject(new Error(msg.error ?? 'Worker error'));
      } else if (msg.type === 'result' && msg.embedding) {
        resolve(msg.embedding);
      } else {
        // 'loaded' or other ack
        resolve(undefined);
      }
    }
  });

  worker.addEventListener('error', (err) => {
    // Reject all pending promises if the worker crashes
    pending.forEach(({ reject }) => reject(new Error(err.message || 'Worker error')));
    pending.clear();
  });

  return worker;
}

/**
 * Send a message to the worker and await its response.
 */
function postToWorker<T>(type: string, text?: string): Promise<T> {
  const w = getWorker();
  const id = ++messageId;

  return new Promise<T>((resolve, reject) => {
    pending.set(id, {
      resolve: resolve as (value: unknown) => void,
      reject,
    });
    w.postMessage({ id, type, text });
  });
}

// ─── Public API (unchanged from original) ─────────────────────

/**
 * Load the embedding model (singleton — loaded once, reused).
 * Downloads ~23 MB quantized ONNX model on first call (cached by browser).
 * @param onProgress Optional callback for download progress
 */
export async function loadEmbeddingModel(
  onProgress?: (progress: { progress: number; loaded: boolean }) => void
): Promise<void> {
  if (onProgress) {
    progressListeners.add(onProgress);
  }

  // If already ready, immediately notify
  if (modelReady) {
    onProgress?.({ progress: 100, loaded: true });
    if (onProgress) progressListeners.delete(onProgress);
    return;
  }

  // Trigger load in the worker
  await postToWorker('load');

  if (onProgress) {
    progressListeners.delete(onProgress);
  }
}

/**
 * Check if the model is already loaded.
 */
export function isModelLoaded(): boolean {
  return modelReady;
}

/**
 * Generate a 384-dimensional embedding from text.
 * Uses mean pooling + L2 normalization (standard for sentence-transformers).
 *
 * @param text Input text to embed
 * @returns Float32Array of 384 dimensions
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const embedding = await postToWorker<number[]>('embed', text);

  if (!Array.isArray(embedding) || embedding.length !== config.embedding.dimensions) {
    throw new Error(
      `Embedding dimension mismatch: expected ${config.embedding.dimensions}, got ${embedding?.length ?? 0}`
    );
  }

  return embedding;
}

/**
 * Generate embedding for a search query (same model, same process).
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  return generateEmbedding(query);
}

