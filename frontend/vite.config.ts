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
  // Transformers.js + onnxruntime-web run inside a Web Worker.
  // They must be excluded from Vite's dependency pre-bundling so the
  // worker can resolve them in its own clean context.
  optimizeDeps: {
    exclude: ['@xenova/transformers', 'onnxruntime-web'],
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

