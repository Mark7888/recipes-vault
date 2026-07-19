import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  return {
    plugins: [
      react(),
      VitePWA({
        // 'prompt': a new SW installs but stays waiting until the user accepts
        // the in-app "New version available" banner (UpdatePrompt), which then
        // messages it to skipWaiting and reloads. Auto-activating instead would
        // swap caches under a page whose old JS chunks are still in memory.
        registerType: 'prompt',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
        manifest: {
          name: 'RecipeVault',
          short_name: 'RecipeVault',
          description: 'Save, organize and share your recipes',
          theme_color: '#2d6a4f',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          // Registers the app as a share target: sharing a page from another
          // app opens /share?url=...&text=..., handled server-side just like
          // the URL-prefix capture route.
          share_target: {
            action: '/share',
            method: 'GET',
            params: {
              title: 'title',
              text: 'text',
              url: 'url',
            },
          },
        },
        workbox: {
          // The unminified development bundle exceeds the 2 MiB default
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          // Delete precaches left behind by older Workbox versions on activate
          cleanupOutdatedCaches: true,
          // Never serve the SPA shell for paths the backend must handle:
          // the API, stored images, the share target, and the URL-prefix
          // capture catch-all (/<domain.tld>/...).
          navigateFallbackDenylist: [
            /^\/api\//,
            /^\/images\//,
            /^\/share/,
            /^\/[^/?]+\.[^/?]+/,
          ],
          runtimeCaching: [
            {
              urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
                sameOrigin && url.pathname.startsWith('/images/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'recipe-images',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
      }),
    ],
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
