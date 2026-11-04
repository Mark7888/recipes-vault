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
import captureRoutes, { captureAndCreateRecipe, isCaptureIncomplete } from './routes/capture.routes.js';
import aiRoutes from './routes/ai.routes.js';
import { verifyRefreshToken } from './services/auth.service.js';
import { getRecipeByShareToken } from './services/recipes.service.js';
import { appPreview, sendAppHtml, sharedRecipePreview } from './services/link-preview.service.js';
import { prisma } from './lib/prisma.js';
import { env } from './config/env.js';
import { csrfProtection } from './middleware/csrf.middleware.js';
import { apiRateLimiter } from './middleware/rate-limit.middleware.js';
import type { Request, Response, NextFunction } from 'express';

const REFRESH_TOKEN_COOKIE = 'refreshToken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseTrustProxy(value: string | undefined): boolean | number | string | undefined {
  if (!value) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

/**
 * Captures `targetUrl` into the signed-in user's vault and sends the browser to
 * the editor. These routes are reached by navigating the browser straight to
 * them, so there's no JS around to attach an Authorization header:
 * authenticate off the httpOnly refresh-token cookie instead, and send the user
 * to log in if it's missing or expired (returning them here afterwards).
 */
function captureFromNavigation(targetUrl: string, req: Request, res: Response, next: NextFunction): void {
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
      // The editor offers an AI re-parse on this flag; it only acts on it
      // for accounts that actually have the assistant.
      const suffix = isCaptureIncomplete(recipe) ? '?aiSuggest=1' : '';
      res.redirect(`/recipes/${recipe.id}/edit${suffix}`);
    } catch (err) {
      next(err);
    }
  })();
}

export function createApp() {
  const app = express();

  const trustProxy = parseTrustProxy(env.TRUST_PROXY);
  if (trustProxy !== undefined) app.set('trust proxy', trustProxy);

  app.use(requestLogger);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(csrfProtection);

  // Serve uploaded images
  app.use('/images', express.static(process.env.IMAGES_DIR || './data/images'));

  // API routes
  app.use('/api', apiRateLimiter);
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
    // "/" must fall through to the SPA fallback below, which serves the same
    // file with the link-preview meta tags injected.
    index: false,
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
  // for the first http(s) URL and capture it. The URL is captured right here
  // rather than redirected to, so a crafted share link can never bounce the
  // browser off to another site.
  app.get('/share', apiRateLimiter, (req: Request, res: Response, next: NextFunction) => {
    const candidates = [req.query.url, req.query.text, req.query.title];
    for (const value of candidates) {
      if (typeof value !== 'string') continue;
      const match = /https?:\/\/\S+/.exec(value);
      if (match) {
        captureFromNavigation(match[0], req, res, next);
        return;
      }
    }
    res.redirect('/recipes/add');
  });

  // Link previews for shared recipes. Messengers and social sites fetch the
  // URL with a crawler that reads the <head> and runs no JavaScript, so the
  // bare SPA shell unfurls as an empty card. Serve the shell with this
  // recipe's own Open Graph / Twitter tags already in it; the app itself
  // still boots and renders as usual.
  app.get('/shared/:token', (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const token = req.params.token as string;
        const recipe = await getRecipeByShareToken(token);
        // An unknown token gets the generic card — the page says the link is
        // invalid, and a preview must not confirm which tokens exist.
        const preview = recipe ? await sharedRecipePreview(recipe, token, req) : appPreview(req);
        await sendAppHtml(res, publicDir, preview);
      } catch (err) {
        next(err);
      }
    })();
  });

  // URL-prefix capture catch-all
  // Pattern: /<domain>/<path> where domain looks like a real domain (has a dot + TLD)
  const domainPattern = /^\/([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+)(\/.*)?$/;

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || !domainPattern.test(req.path)) return next();
    apiRateLimiter(req, res, next);
  });
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

      captureFromNavigation(targetUrl, req, res, next);
      return;
    }
    next();
  });

  // SPA fallback for all remaining routes (in production)
  app.get('/{*path}', (req: Request, res: Response, next: NextFunction) => {
    sendAppHtml(res, publicDir, appPreview(req)).catch(next);
  });

  app.use(errorHandler);

  return app;
}
