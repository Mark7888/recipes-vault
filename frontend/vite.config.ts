import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/images': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      minify: !isDev,
      sourcemap: isDev,
    },
    // Make React use its development bundle (full error messages) when building for debug
    define: isDev ? { 'process.env.NODE_ENV': '"development"' } : {},
  };
});
