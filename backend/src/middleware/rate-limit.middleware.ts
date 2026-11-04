import rateLimit from 'express-rate-limit';

const tooMany = { error: 'Too many requests, please try again later.' };

/**
 * Broad per-IP ceiling for the whole API. Generous on purpose: it is there to
 * stop floods and scripted abuse, not to get in the way of normal use. Behind a
 * reverse proxy, set TRUST_PROXY so the client IP is used instead of the
 * proxy's.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: tooMany,
});

/**
 * Credential endpoints (login, register, password reset, admin login). Only
 * failed attempts count, so a user who signs in normally is never locked out,
 * while password guessing is capped at a handful of tries per window.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many failed attempts, please try again in a few minutes.' },
});
