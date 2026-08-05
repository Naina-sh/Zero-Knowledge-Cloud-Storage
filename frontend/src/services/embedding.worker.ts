/**
 * Web Worker for embedding generation using Transformers.js.
 *
 * This runs in a separate thread so that onnxruntime-web (ORT) initializes
 * in a clean Web Worker context, avoiding the "registerBackend" error that
 * occurs when ORT is imported directly in the main thread under Vite.
 *
 * The worker exposes a simple message protocol:
 *   Main thread → Worker: { id, type: 'load' | 'embed', text?, onProgress? }
 *   Worker → Main thread: { id, type: 'progress' | 'ready' | 'result' | 'error', ... }
 *
 * @module services/embedding.worker
 */

import { pipeline } from '@xenova/transformers';

// Type for the feature-extraction pipeline callable
type EmbedFn = (text: string, options: Record<string, unknown>) => Promise<{ data: Float32Array | number[] }>;

// Singleton pipeline instance (loaded once, reused)
let extractor: EmbedFn | null = null;
let loadingPromise: Promise<EmbedFn> | null = null;

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

/**
 * Get or create the feature-extraction pipeline (singleton).
 */
async function getExtractor(): Promise<EmbedFn> {
  if (extractor) return extractor;
  if (loadingPromise) return loadingPromise;

  loadingPromise = pipeline('feature-extraction', MODEL_ID, {
    quantized: true,
    progress_callback: (data: unknown) => {
      // Forward progress events to the main thread
      (self as unknown as Worker).postMessage({ type: 'progress', data });
    },
  }) as unknown as Promise<EmbedFn>;

  extractor = await loadingPromise;
  loadingPromise = null;

  // Notify the main thread that the model is ready
  (self as unknown as Worker).postMessage({ type: 'ready' });
  return extractor!;
}

/**
 * Message handler — processes requests from the main thread.
 */
self.addEventListener('message', async (event: MessageEvent) => {
  const { id, type, text } = event.data as { id: number; type: string; text?: string };

  try {
    if (type === 'load') {
      await getExtractor();
      (self as unknown as Worker).postMessage({ id, type: 'loaded' });
    } else if (type === 'embed') {
      if (!text) throw new Error('No text provided for embedding');
      const model = await getExtractor();

      // Truncate to avoid exceeding model max length (256 tokens for MiniLM)
      const truncated = text.slice(0, 8000);

      const output = await model(truncated, {
        pooling: 'mean',
        normalize: true,
      });

      const embedding = Array.from(output.data);
      (self as unknown as Worker).postMessage({ id, type: 'result', embedding });
    }
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id,
      type: 'error',
      error: err instanceof Error ? err.message : 'Embedding worker error',
    });
  }
});
