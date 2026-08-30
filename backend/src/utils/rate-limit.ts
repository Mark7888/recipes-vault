/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Good enough for a single-process, self-hosted deployment: it exists to keep
 * one account (or one script holding its API key) from burning through the AI
 * credit balance or hammering the database, not to stop a distributed attack.
 * Counters live in this process, so they reset on restart and are not shared
 * between replicas — running more than one instance means each gets its own
 * allowance.
 */
export interface RateLimitResult {
  allowed: boolean;
  /** Requests permitted per window. */
  limit: number;
  /** Requests left in the current window, after counting this one. */
  remaining: number;
  /** Seconds until the window has room again (0 when it already does). */
  resetSeconds: number;
  /** Seconds the caller should wait before retrying; 0 when allowed. */
  retryAfterSeconds: number;
}

export interface RateLimiter {
  readonly limit: number;
  readonly windowMs: number;
  check(key: string): RateLimitResult;
  /** Drops a key's history — used by tests and by "this attempt succeeded, forgive it" paths. */
  reset(key: string): void;
}

export function createRateLimiter(limit: number, windowMs: number): RateLimiter {
  const hits = new Map<string, number[]>();

  return {
    limit,
    windowMs,

    check(key: string): RateLimitResult {
      const now = Date.now();
      const cutoff = now - windowMs;

      const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);
      if (recent.length >= limit) {
        hits.set(key, recent);
        const oldest = recent[0];
        const wait = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
        return { allowed: false, limit, remaining: 0, resetSeconds: wait, retryAfterSeconds: wait };
      }

      recent.push(now);
      hits.set(key, recent);

      // Keys go idle far more often than they go over the limit, so prune the
      // whole map opportunistically rather than running a timer.
      if (hits.size > 500) {
        for (const [k, timestamps] of hits) {
          if (timestamps.every((t) => t <= cutoff)) hits.delete(k);
        }
      }

      return {
        allowed: true,
        limit,
        remaining: limit - recent.length,
        resetSeconds: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)),
        retryAfterSeconds: 0,
      };
    },

    reset(key: string): void {
      hits.delete(key);
    },
  };
}
