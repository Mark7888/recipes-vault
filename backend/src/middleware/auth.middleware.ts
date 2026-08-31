import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyAccessToken } from '../services/auth.service.js';
import { authenticateApiKey, looksLikeApiKey } from '../services/api-keys.service.js';
import { prisma } from '../lib/prisma.js';
import { apiRateLimit } from './rate-limit.middleware.js';
import type { AuthenticatedRequest, Principal } from '../types/index.js';

/**
 * One gate for both ways in. A browser session presents a JWT access token, an
 * API client presents a personal access token, and past this middleware
 * nothing downstream can tell the difference: both leave the same `userId` on
 * the request, so every route, role check and ownership test that the web UI
 * goes through is the exact same code the API goes through. Permissions are
 * therefore identical by construction rather than by two implementations
 * agreeing with each other.
 */

const BEARER = 'Bearer ';
/** Accepted as an alternative to Authorization, which is what most API clients reach for first. */
const API_KEY_HEADER = 'x-api-key';

function readCredential(req: Request): string | null {
  const apiKeyHeader = req.headers[API_KEY_HEADER];
  if (typeof apiKeyHeader === 'string' && apiKeyHeader.trim()) return apiKeyHeader.trim();

  const header = req.headers.authorization;
  if (header?.startsWith(BEARER)) {
    const token = header.slice(BEARER.length).trim();
    if (token) return token;
  }
  return null;
}

function unauthorized(res: Response, error: string): void {
  // Tells a client which schemes are on offer, and keeps browsers from
  // popping a Basic-auth dialog.
  res.setHeader('WWW-Authenticate', 'Bearer realm="RecipeVault API"');
  res.status(401).json({ error });
}

async function resolveSession(token: string): Promise<Principal | string> {
  let userId: string;
  try {
    userId = verifyAccessToken(token).sub;
  } catch {
    return 'Invalid or expired token';
  }

  // Access tokens live 15 minutes, so a signature check alone would let a
  // just-deleted user keep writing while the cleanup worker runs. Verify the
  // account is still active before every authenticated request.
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
  if (!user || user.status !== 'ACTIVE') return 'Account is no longer active';
  return { userId, kind: 'session' };
}

async function resolveApiKey(token: string): Promise<Principal | string> {
  const result = await authenticateApiKey(token);
  if (result.ok) {
    return { userId: result.userId, kind: 'api-key', apiKeyId: result.apiKeyId, apiKeyName: result.name };
  }
  // Revoked and expired are named: the caller owns the key and can act on the
  // answer. An unknown token says nothing more than that.
  switch (result.reason) {
    case 'revoked':
      return 'This API key has been revoked';
    case 'expired':
      return 'This API key has expired';
    case 'inactive-user':
      return 'Account is no longer active';
    default:
      return 'Invalid API key';
  }
}

/**
 * Authenticates a request as a user, by session token or API key.
 * Populates `req.userId` and `req.auth`.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const credential = readCredential(req);
  if (!credential) {
    unauthorized(res, 'Missing authorization header');
    return;
  }

  void (async () => {
    const resolved = looksLikeApiKey(credential)
      ? await resolveApiKey(credential)
      : await resolveSession(credential);

    if (typeof resolved === 'string') {
      unauthorized(res, resolved);
      return;
    }

    const authed = req as AuthenticatedRequest;
    authed.userId = resolved.userId;
    authed.auth = resolved;
    next();
  })().catch(next);
}

/**
 * Narrows a route to browser sessions. Runs after `authMiddleware`.
 *
 * Two things stay off the API on purpose, and both are about the credential
 * rather than about what the user may do: minting or revoking API keys, and
 * changing the account's own username or password. A leaked key that could do
 * either would be able to lock its owner out and to renew itself forever,
 * which is a strictly larger power than the user hands to it. Everything the
 * app is actually for is open to both.
 */
export function requireSession(req: Request, res: Response, next: NextFunction): void {
  const auth = (req as AuthenticatedRequest).auth;
  if (auth?.kind !== 'session') {
    res.status(403).json({
      error: 'This endpoint requires a signed-in session. API keys cannot manage credentials or other API keys.',
    });
    return;
  }
  next();
}

/**
 * The entry stack for every user-facing API route: prove who you are, then
 * spend from that account's budget. Routers mount this instead of
 * `authMiddleware` directly so the two never drift apart.
 */
export const requireUser: RequestHandler[] = [authMiddleware, apiRateLimit];
