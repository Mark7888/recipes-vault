import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { createRateLimiter, type RateLimitResult } from '../utils/rate-limit.js';
import { aiErrors } from '../services/ai/ai-errors.js';
import { env } from '../config/env.js';
import type { AuthenticatedRequest } from '../types/index.js';

/**
 * Rate limiting for every way into the API.
 *
 * Three layers, each with its own budget:
 *   - `apiRateLimit`   every /api route, so no single account can flood the app
 *   - `aiRateLimit`    the endpoints that spend AI credits, much stricter
 *   - `authRateLimit`  login/register/reset, per IP, against credential guessing
 *
 * Budgets are per *user*, not per credential: an account's web session and all
 * of its API keys draw on the same allowance, which is the same rule as "a key
 * can do exactly what its owner can do, nothing more". Callers with no identity
 * yet are bucketed by IP.
 */

/** Identifies who to charge a request to. */
function principalKey(req: Request): string {
  const auth = (req as AuthenticatedRequest).auth;
  if (auth?.userId) return `user:${auth.userId}`;
  return `ip:${req.ip ?? 'unknown'}`;
}

function ipKey(req: Request): string {
  return `ip:${req.ip ?? 'unknown'}`;
}

/**
 * The draft-standard headers (RFC 9239-style `RateLimit-*`). Clients that know
 * them can pace themselves instead of discovering the wall at 429.
 */
function setHeaders(res: Response, result: RateLimitResult, windowSeconds: number): void {
  res.setHeader('RateLimit-Limit', String(result.limit));
  res.setHeader('RateLimit-Remaining', String(result.remaining));
  res.setHeader('RateLimit-Reset', String(result.resetSeconds));
  res.setHeader('RateLimit-Policy', `${result.limit};w=${windowSeconds}`);
}

interface RateLimitOptions {
  limit: number;
  windowMs?: number;
  /** How to bucket callers. Defaults to per-user, falling back to per-IP. */
  keyFn?: (req: Request) => string;
  /** Response body for a rejected request; the plain shape unless a route family needs its own. */
  body?: (retryAfterSeconds: number) => Record<string, unknown>;
}

export function rateLimit({
  limit,
  windowMs = 60_000,
  keyFn = principalKey,
  body,
}: RateLimitOptions): RequestHandler {
  const limiter = createRateLimiter(limit, windowMs);
  const windowSeconds = Math.round(windowMs / 1000);

  return (req: Request, res: Response, next: NextFunction): void => {
    const result = limiter.check(keyFn(req));
    setHeaders(res, result, windowSeconds);

    if (result.allowed) {
      next();
      return;
    }

    res.setHeader('Retry-After', String(result.retryAfterSeconds));
    res.status(429).json(
      body?.(result.retryAfterSeconds) ?? {
        error: 'Too many requests. Slow down and try again shortly.',
        retryAfterSeconds: result.retryAfterSeconds,
      }
    );
  };
}

/**
 * The AI gate's own budget, on top of the global one. It answers in the AI
 * error shape every AI endpoint already uses, so the frontend's existing
 * handling of `AI_RATE_LIMITED` covers API callers too.
 */
export function aiRateLimit(limit: number): RequestHandler {
  return rateLimit({
    limit,
    body: (retryAfterSeconds) => aiErrors.rateLimited(retryAfterSeconds, 'per-user limit').toResponseBody(),
  });
}

/**
 * Credential endpoints, bucketed by IP because there is no user yet. Deliberately
 * tight: these are the only routes where guessing is the point.
 */
export function authRateLimit(limit: number): RequestHandler {
  return rateLimit({
    limit,
    keyFn: ipKey,
    body: (retryAfterSeconds) => ({
      error: 'Too many attempts. Please wait a moment and try again.',
      retryAfterSeconds,
    }),
  });
}

/**
 * The one budget every /api route draws on. A single limiter instance, mounted
 * both after `authMiddleware` (where it charges the account) and directly on
 * the anonymous routes (where it charges the IP), so a user's browser and all
 * of their API keys share one allowance no matter which router they enter by.
 */
export const apiRateLimit = rateLimit({ limit: env.API_RATE_LIMIT_PER_MINUTE });
