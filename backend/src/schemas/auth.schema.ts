import { z } from 'zod';
import { component } from '../openapi/registry.js';
import { userRefSchema } from './common.schema.js';

export const registerSchema = component(
  'RegisterRequest',
  z.object({
    token: z.string().min(1).meta({ description: 'A single-use invite token. Registration is invite-only.' }),
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
    password: z.string().min(8).meta({
      description: 'At least 8 characters, with one uppercase letter and one number.',
    }),
    /**
     * The browser's own language, so the AI assistant starts out answering in it.
     * Anything unrecognized (or missing, on a client that does not send it) falls
     * back to the request header and then to English.
     */
    language: z.string().max(35).optional().meta({
      description: 'Language tag for the AI assistant. Falls back to Accept-Language, then English.',
    }),
  })
);

export const loginSchema = component(
  'LoginRequest',
  z.object({ username: z.string().min(1), password: z.string().min(1) })
);

export const resetPasswordSchema = component(
  'ResetPasswordRequest',
  z.object({
    token: z.string().min(1).meta({ description: 'From a reset link an admin generated.' }),
    newPassword: z.string().min(8),
  })
);

export const authResultSchema = component(
  'AuthResult',
  z.object({
    accessToken: z.string().meta({
      description: 'A 15-minute JWT. The refresh token comes back as an httpOnly cookie.',
    }),
    user: userRefSchema,
  })
);

export const accessTokenSchema = component(
  'AccessToken',
  z.object({ accessToken: z.string() })
);

export const inviteStatusSchema = component(
  'InviteStatus',
  z.object({
    valid: z.boolean(),
    reason: z.string().optional().meta({ description: 'Why it is not usable, when it is not.' }),
  })
);

export const okSchema = component('Ok', z.object({ ok: z.boolean() }));
