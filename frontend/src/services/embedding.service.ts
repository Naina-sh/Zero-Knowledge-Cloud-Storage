/**
 * Embedding service — generates semantic embeddings using Transformers.js.
 *
 * The sentence-transformer model (all-MiniLM-L6-v2) runs ENTIRELY in the browser
 * via WebAssembly. The server never sees the source text — only the resulting
 * 384-dimensional embedding vector.
 *
 * NOTE: This runs directly in the main thread (no Web Worker). onnxruntime-web
 * is pre-bundled by Vite via `optimizeDeps.include`, which avoids both the
 * "registerBackend" error and the dev-server issue where Vite serves index.html
 * for a worker module URL.
 *
 * @module services/embedding.service
 */

import { pipeline, env } from '@xenova/transformers';
import { config } from '../config';

// In a bundler/dev-server context (Vite), transformers.js defaults to first checking
// for a LOCAL model at '/models/<model>/config.json'. Vite's SPA fallback serves
// index.html (status 200) for that URL, and JSON.parse of the HTML throws
// "Unexpected token '<'" — killing the upload pipeline at the embedding step.
// Disable the local-model check so model files load directly from the HF hub.
env.allowLocalModels = false;

// Self-host the onnxruntime-web wasm files (copied to /public/ort/ during setup)
// so inference doesn't depend on a CDN and the wasm backend loads reliably.
if (env?.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.wasmPaths = '/ort/';
}

// The very first run (before allowLocalModels was disabled) may have cached
// Vite's SPA-fallback index.html (served with status 200 for the nonexistent
// '/models/<model>/config.json') into transformers.js' browser cache
// ('transformers-cache'). hub.js checks that cache under the local path key
// BEFORE consulting allowLocalModels, so the poisoned HTML entry would be
// returned forever. Purge any '/models/...' entries once per session —
// legitimate model files are cached under absolute https://huggingface.co URLs
// and are NOT affected.
let cachePurged = false;
async function purgePoisonedModelCache(): Promise<void> {
  if (cachePurged || typeof caches === 'undefined') return;
  cachePurged = true;
  try {
    const cache = await caches.open('transformers-cache');
    const keys = await cache.keys();
    await Promise.all(
      keys
        .filter((req) => new URL(req.url).pathname.startsWith('/models/'))
        .map((req) => cache.delete(req))
    );
  } catch {
    // Cache unavailable (e.g., incognito/iframe restrictions) — safe to ignore;
    // transformers.js falls back to downloading without cache.
  }
}

// Type for the feature-extraction pipeline callable
type EmbedFn = (text: string, options: Record<string, unknown>) => Promise<{ data: Float32Array | number[] }>;

// Singleton pipeline instance (loaded once, reused)
let extractor: EmbedFn | null = null;
let loadingPromise: Promise<EmbedFn> | null = null;
let modelReady = false;

/**
 * Load the embedding model (singleton — loaded once, reused).
 * Downloads ~23 MB quantized ONNX model on first call (cached by browser).
 * @param onProgress Optional callback for download progress
 */
export async function loadEmbeddingModel(
  onProgress?: (progress: { progress: number; loaded: boolean }) => void
): Promise<void> {
  if (extractor) return;
  if (loadingPromise) {
    await loadingPromise;
    return;
  }

  // Remove any cached index.html entries (see purgePoisonedModelCache) before
  // transformers.js consults its cache for model files.
  await purgePoisonedModelCache();

  loadingPromise = pipeline('feature-extraction', config.embedding.model, {
    quantized: true,
    progress_callback: (data: unknown) => {
      if (onProgress && typeof data === 'object' && data !== null && 'progress' in data) {
        const d = data as { progress: number; status: string };
        if (d.status === 'progress') {
          onProgress({ progress: d.progress, loaded: false });
        } else if (d.status === 'ready') {
          onProgress({ progress: 100, loaded: true });
        }
      }
    },
  }) as unknown as Promise<EmbedFn>;

  extractor = await loadingPromise;
  loadingPromise = null;
  modelReady = true;
  onProgress?.({ progress: 100, loaded: true });
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
  if (!extractor) {
    await loadEmbeddingModel();
  }
  const model = extractor!;

  // Truncate to avoid exceeding model max length (256 tokens for MiniLM)
  const truncated = text.slice(0, 8000);

  const output = await model(truncated, {
    pooling: 'mean',
    normalize: true,
  });

  const embedding = Array.from(output.data);

  if (embedding.length !== config.embedding.dimensions) {
    throw new Error(
      `Embedding dimension mismatch: expected ${config.embedding.dimensions}, got ${embedding.length}`
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

