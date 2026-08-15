/**
 * Minimal in-memory sliding-window rate limiter. Good enough for a
 * single-process, self-hosted deployment; it exists to keep one user from
 * burning through the AI credit balance, not to stop a distributed attack.
 */
export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const cutoff = now - windowMs;

      const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);
      if (recent.length >= limit) {
        const oldest = recent[0];
        hits.set(key, recent);
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)) };
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

      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}
