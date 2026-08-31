import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { ApiKey } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

/**
 * Personal access tokens for the REST API.
 *
 * A token is `rv_` + 43 characters of base64url — 256 bits of CSPRNG output.
 * Only its SHA-256 hash is stored, so the plaintext exists exactly once, in
 * the response that created it. Lookup is a single indexed read on that hash:
 * with 256 bits of entropy there is nothing to brute-force, which is what lets
 * a fast digest stand in for a password hash on a per-request path.
 */

export const API_KEY_PREFIX = 'rv_';
/** How much of the token the UI is allowed to keep, to tell keys apart. */
const DISPLAY_PREFIX_LENGTH = API_KEY_PREFIX.length + 8;
const TOKEN_BYTES = 32;

/** Names are the user's own label; long enough to be useful, short enough to render. */
export const MAX_KEY_NAME_LENGTH = 60;
/** A cap on live keys per user, so a runaway script cannot fill the table. */
export const MAX_KEYS_PER_USER = 25;

/** Written back at most this often per key — an active key must not cost a write per request. */
const LAST_USED_WRITE_INTERVAL_MS = 60_000;

/** What the API ever exposes about a key. The secret is not part of it. */
export interface ApiKeySummary {
  id: string;
  name: string;
  prefix: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  /** Derived, so a client does not have to compare clocks to grey out a row. */
  expired: boolean;
  active: boolean;
}

export function looksLikeApiKey(token: string): boolean {
  return token.startsWith(API_KEY_PREFIX);
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isExpired(key: Pick<ApiKey, 'expiresAt'>, now = new Date()): boolean {
  return !!key.expiresAt && key.expiresAt.getTime() <= now.getTime();
}

export function toApiKeySummary(key: ApiKey): ApiKeySummary {
  const expired = isExpired(key);
  return {
    id: key.id,
    name: key.name,
    prefix: key.prefix,
    expiresAt: key.expiresAt?.toISOString() ?? null,
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    revokedAt: key.revokedAt?.toISOString() ?? null,
    createdAt: key.createdAt.toISOString(),
    expired,
    active: !key.revokedAt && !expired,
  };
}

export async function listApiKeys(userId: string): Promise<ApiKeySummary[]> {
  const keys = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return keys.map(toApiKeySummary);
}

export class ApiKeyLimitError extends Error {
  status = 409;
  constructor() {
    super(`You already have ${MAX_KEYS_PER_USER} API keys. Revoke one before creating another.`);
  }
}

/**
 * Mints a key and returns it alongside the plaintext token, which the caller
 * must pass straight to the user — it cannot be recovered afterwards.
 */
export async function createApiKey(
  userId: string,
  input: { name: string; expiresAt: Date | null }
): Promise<{ key: ApiKeySummary; token: string }> {
  // Only live keys count against the cap: revoked and expired ones are kept
  // as a record of what once had access.
  const live = await prisma.apiKey.count({
    where: { userId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
  });
  if (live >= MAX_KEYS_PER_USER) throw new ApiKeyLimitError();

  const token = API_KEY_PREFIX + randomBytes(TOKEN_BYTES).toString('base64url');
  const created = await prisma.apiKey.create({
    data: {
      userId,
      name: input.name,
      keyHash: hashToken(token),
      prefix: token.slice(0, DISPLAY_PREFIX_LENGTH),
      expiresAt: input.expiresAt,
    },
  });

  return { key: toApiKeySummary(created), token };
}

/**
 * Revokes a key. Scoped by userId in the same statement as the id, so one user
 * cannot revoke another's key by guessing it, and an already-revoked key keeps
 * its original revocation time.
 */
export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  const { count } = await prisma.apiKey.updateMany({
    where: { id: keyId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 1) return true;
  // Distinguish "already revoked" (still a success, the key is dead) from
  // "no such key of yours" (a 404 for the caller).
  const existing = await prisma.apiKey.findFirst({ where: { id: keyId, userId }, select: { id: true } });
  return !!existing;
}

export type ApiKeyRejection = 'unknown' | 'revoked' | 'expired' | 'inactive-user';

export interface ApiKeyAuthSuccess {
  ok: true;
  userId: string;
  apiKeyId: string;
  name: string;
}

export interface ApiKeyAuthFailure {
  ok: false;
  reason: ApiKeyRejection;
}

/**
 * Resolves a plaintext token to its owner, or explains why it is not usable.
 * The account itself is re-checked on every call for the same reason the JWT
 * path re-checks it: a key outlives the account it belongs to otherwise.
 */
export async function authenticateApiKey(token: string): Promise<ApiKeyAuthSuccess | ApiKeyAuthFailure> {
  const digest = hashToken(token);
  const key = await prisma.apiKey.findUnique({
    where: { keyHash: digest },
    include: { user: { select: { status: true } } },
  });
  if (!key) return { ok: false, reason: 'unknown' };

  // The row was found by an exact hash match, so this only guards against a
  // hash-column collision; it costs nothing and keeps the comparison constant
  // time in the one place a secret is compared.
  const stored = Buffer.from(key.keyHash, 'hex');
  const presented = Buffer.from(digest, 'hex');
  if (stored.length !== presented.length || !timingSafeEqual(stored, presented)) {
    return { ok: false, reason: 'unknown' };
  }

  if (key.revokedAt) return { ok: false, reason: 'revoked' };
  if (isExpired(key)) return { ok: false, reason: 'expired' };
  if (key.user.status !== 'ACTIVE') return { ok: false, reason: 'inactive-user' };

  touchLastUsed(key.id, key.lastUsedAt);
  return { ok: true, userId: key.userId, apiKeyId: key.id, name: key.name };
}

/**
 * Records that a key was used, without making the request wait for it and
 * without writing more than once a minute per key. A lost write here only
 * costs a slightly stale "last used" timestamp.
 */
function touchLastUsed(keyId: string, lastUsedAt: Date | null): void {
  if (lastUsedAt && Date.now() - lastUsedAt.getTime() < LAST_USED_WRITE_INTERVAL_MS) return;
  void prisma.apiKey
    .update({ where: { id: keyId }, data: { lastUsedAt: new Date() } })
    .catch(() => {
      // Deliberately silent: the key was already accepted, and the request
      // must not fail over bookkeeping.
    });
}
