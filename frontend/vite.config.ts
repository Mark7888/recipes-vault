import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/** Anything from the API-reference renderer, which only /api-docs pulls in. */
function isScalarModule(id: string): boolean {
  return id.includes('@scalar') || id.includes('/pages/ApiDocs');
}

/**
 * One of this app's own modules — the ApiDocs page itself excepted. The
 * node_modules check matters: several Scalar packages ship their `src/` too, so
 * the path alone does not say whose code it is.
 */
function isAppModule(id: string): boolean {
  return !id.includes('node_modules') && id.includes('/src/') && !id.includes('/pages/ApiDocs');
}

/**
 * A chunk is the docs' own when Scalar is in it and none of the app is: that
 * catches the vendor chunks it drags along (its Vue runtime, its icons) as well
 * as its own code, while leaving anything the app also uses where it is.
 */
function isDocsChunk(chunk: { moduleIds?: string[] }): boolean {
  const ids = chunk.moduleIds ?? [];
  return ids.some(isScalarModule) && !ids.some(isAppModule);
}

/**
 * The same question for emitted assets. A CSS bundle carries no source paths —
 * it is named after the chunk it belongs to — so the name is what has to answer
 * it, and Scalar's stylesheet arrives as `ApiDocs.css`.
 */
function isDocsAsset(asset: { names?: string[]; originalFileNames?: string[] }): boolean {
  return (
    !!asset.originalFileNames?.some(isScalarModule) ||
    !!asset.names?.some((name) => name.startsWith('ApiDocs') || name.includes('Scalar'))
  );
}

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
          // The API reference renderer is megabytes of code that almost nobody
          // opens, and precaching is what every visitor pays on install. It is
          // routed into assets/docs/ (see chunkFileNames below) purely so it can
          // be skipped here and fetched on demand instead.
          globIgnores: ['**/assets/docs/**'],
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
      // Scalar (and the Vue runtime it brings) is only ever reached from the
      // lazily-loaded /api-docs route. Giving it its own directory is what lets
      // the service worker leave it out of the precache.
      rollupOptions: {
        output: {
          chunkFileNames: (chunk) =>
            isDocsChunk(chunk) ? 'assets/docs/[name]-[hash].js' : 'assets/[name]-[hash].js',
          assetFileNames: (asset) =>
            isDocsAsset(asset) ? 'assets/docs/[name]-[hash][extname]' : 'assets/[name]-[hash][extname]',
        },
      },
    },
    // Make React use its development bundle (full error messages) when building for debug
    define: isDev ? { 'process.env.NODE_ENV': '"development"' } : {},
  };
});
