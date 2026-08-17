import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  // @xenova/transformers is imported inside the embedding Web Worker.
  // The worker itself must be excluded from dependency pre-bundling so the
  // library resolves in a clean worker context. BUT onnxruntime-web must be
  // PRE-BUNDLED by Vite (rather than excluded) so that its `browser` entry
  // (dist/ort-web.min.js, a self-contained prebuilt bundle) is converted into
  // proper ESM — otherwise re-bundling ORT's CommonJS entry triggers the
  // "registerBackend" error at runtime.
  optimizeDeps: {
    exclude: ['@xenova/transformers'],
    include: ['onnxruntime-web', 'onnxruntime-common'],
  },
  // Web Worker configuration — use ES module format for the embedding worker
  worker: {
    format: 'es',
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react', 'react-hot-toast'],
          'chart-vendor': ['recharts'],
        },
      },
    },
  },
});

