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
import captureRoutes, { captureAndCreateRecipe } from './routes/capture.routes.js';
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
  app.use('/api/capture', captureRoutes);

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
            if (user) userId = user.id;
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

  // Serve frontend SPA (in production)
  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.static(publicDir));
  app.get('/{*path}', (_req: Request, res: Response) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.use(errorHandler);

  return app;
}
