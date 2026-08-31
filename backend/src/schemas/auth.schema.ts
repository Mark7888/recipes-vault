import { z } from 'zod';

/**
 * Request validators for the session endpoints.
 *
 * Deliberately not registered as OpenAPI components: `/api/auth/*` is how the
 * web app signs in, not part of the REST API, so it is absent from the
 * published contract. API clients authenticate with a key instead.
 */

export const registerSchema = z.object({
  token: z.string().min(1),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8),
  /**
   * The browser's own language, so the AI assistant starts out answering in it.
   * Anything unrecognized (or missing, on a client that does not send it) falls
   * back to the request header and then to English.
   */
  language: z.string().max(35).optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});
