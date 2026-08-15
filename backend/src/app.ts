import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requestLogger } from './middleware/request-logger.middleware.js';
import { errorHandler } from './middleware/error-handler.middleware.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import recipesRoutes from './routes/recipes.routes.js';
import collectionsRoutes from './routes/collections.routes.js';
import tagsRoutes from './routes/tags.routes.js';
import usersRoutes from './routes/users.routes.js';
import sharedRoutes from './routes/shared.routes.js';
import shoppingListRoutes from './routes/shopping-list.routes.js';
import captureRoutes, { captureAndCreateRecipe } from './routes/capture.routes.js';
import aiRoutes from './routes/ai.routes.js';
import { verifyRefreshToken } from './services/auth.service.js';
import { prisma } from './lib/prisma.js';
import type { Request, Response, NextFunction } from 'express';

const REFRESH_TOKEN_COOKIE = 'refreshToken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.use(requestLogger);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Serve uploaded images
  app.use('/images', express.static(process.env.IMAGES_DIR || './data/images'));

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/recipes', recipesRoutes);
  app.use('/api/collections', collectionsRoutes);
  app.use('/api/tags', tagsRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/shared', sharedRoutes);
  app.use('/api/shopping-list', shoppingListRoutes);
  app.use('/api/capture', captureRoutes);
  app.use('/api/ai', aiRoutes);

  // Serve frontend static assets before the capture catch-all: root-level
  // files like /favicon.ico or /manifest.webmanifest would otherwise match
  // the domain pattern below and be treated as recipe URLs to capture.
  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.static(publicDir, {
    setHeaders: (res, filePath) => {
      const base = path.basename(filePath);
      // The SW update flow depends on the browser (and Cloudflare) always
      // revalidating these entry points; everything under /assets and the
      // workbox runtime carry content hashes in their names, so they can be
      // cached forever.
      if (base === 'sw.js' || base === 'index.html' || base === 'manifest.webmanifest') {
        res.setHeader('Cache-Control', 'no-cache');
      } else if (filePath.includes(`${path.sep}assets${path.sep}`) || /^workbox-.+\.js$/.test(base)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));

  // PWA share target (see share_target in the web app manifest). Android puts
  // the shared link in `text` (sometimes `url` or `title`), so scan all three
  // for the first http(s) URL and funnel it into the URL-prefix capture
  // catch-all below, which already handles auth and the capture itself.
  app.get('/share', (req: Request, res: Response) => {
    const candidates = [req.query.url, req.query.text, req.query.title];
    for (const value of candidates) {
      if (typeof value !== 'string') continue;
      const match = /https?:\/\/\S+/.exec(value);
      if (match) {
        res.redirect('/' + match[0].replace(/^https?:\/\//, ''));
        return;
      }
    }
    res.redirect('/recipes/add');
  });

  // URL-prefix capture catch-all
  // Pattern: /<domain>/<path> where domain looks like a real domain (has a dot + TLD)
  const domainPattern = /^\/([a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)+)(\/.*)?$/;

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/images')) {
      return next();
    }
    const match = domainPattern.exec(req.path);
    if (match) {
      const capturedDomain = match[1];
      const restPath = match[2] || '';
      const scheme = 'https';
      const qs = Object.keys(req.query).length > 0 ? '?' + new URLSearchParams(req.query as Record<string, string>).toString() : '';
      const targetUrl = `${scheme}://${capturedDomain}${restPath}${qs}`;

      // This route is reached by directly navigating the browser to it, so there's
      // no JS around to attach an Authorization header. Authenticate off the
      // httpOnly refresh-token cookie instead, and send the user to log in if it's
      // missing or expired (returning them here afterwards).
      void (async () => {
        const refreshToken = (req.cookies as Record<string, string>)?.[REFRESH_TOKEN_COOKIE];
        let userId: string | undefined;
        if (refreshToken) {
          try {
            const payload = verifyRefreshToken(refreshToken);
            const user = await prisma.user.findUnique({ where: { id: payload.sub } });
            if (user && user.status === 'ACTIVE') userId = user.id;
          } catch {
            // fall through to redirect-to-login below
          }
        }

        if (!userId) {
          res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
          return;
        }

        try {
          const recipe = await captureAndCreateRecipe(targetUrl, userId);
          res.redirect(`/recipes/${recipe.id}/edit`);
        } catch (err) {
          next(err);
        }
      })();
      return;
    }
    next();
  });

  // SPA fallback for all remaining routes (in production)
  app.get('/{*path}', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.use(errorHandler);

  return app;
}
