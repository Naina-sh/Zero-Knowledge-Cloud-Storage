/**
 * Frontend configuration constants.
 * @module config
 */

export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
  },
  embedding: {
    model: import.meta.env.VITE_EMBEDDING_MODEL ?? 'Xenova/all-MiniLM-L6-v2',
    dimensions: 384,
  },
  crypto: {
    pbkdf2Iterations: parseInt(import.meta.env.VITE_PBKDF2_ITERATIONS ?? '600000', 10),
    keyLength: 256, // bits
    ivLength: 12, // bytes (96-bit for AES-GCM)
    saltLength: 16, // bytes (128-bit)
    hashAlgorithm: 'SHA-256',
  },
  upload: {
    maxFileSize: 100 * 1024 * 1024, // 100 MB
    acceptedTypes: ['.pdf', '.docx', '.txt', '.md', '.csv', '.json'],
  },
} as const;

export type AppConfig = typeof config;
