import type { Request, Response, NextFunction } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function firstHeader(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v?.split(',')[0]?.trim() || undefined;
}

/**
 * CSRF protection for the cookie-authenticated endpoints.
 *
 * Almost the whole API authenticates with a Bearer token that a cross-site page
 * cannot attach, so only requests that rely on the refresh-token cookie are at
 * risk. For state-changing requests without a Bearer token, reject anything
 * the browser reports as coming from another site: `Sec-Fetch-Site` where the
 * browser sends it, otherwise an `Origin` that does not match this host.
 * Non-browser clients send neither header and are not CSRF vectors.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.headers.authorization?.startsWith('Bearer ')) return next();

  const fetchSite = firstHeader(req.headers['sec-fetch-site']);
  if (fetchSite) {
    if (fetchSite === 'same-origin' || fetchSite === 'none') return next();
    res.status(403).json({ error: 'Cross-site request blocked' });
    return;
  }

  const origin = firstHeader(req.headers.origin);
  if (origin) {
    const host = firstHeader(req.headers['x-forwarded-host']) ?? req.headers.host;
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      // "null" or garbage origin: treat as cross-site
    }
    if (!host || originHost !== host) {
      res.status(403).json({ error: 'Cross-site request blocked' });
      return;
    }
  }

  next();
}
