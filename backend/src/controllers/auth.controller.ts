import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  passwordSchema,
} from '../services/auth.service.js';
import { consumeInviteLink, getInviteTokenStatus } from '../services/invite.service.js';
import { consumePasswordResetLink } from '../services/password-reset.service.js';
import { DEFAULT_AI_LANGUAGE, resolveAcceptLanguage, resolveLanguageTag } from '../services/ai/languages.js';
import { z } from 'zod';

const REFRESH_TOKEN_COOKIE = 'refreshToken';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

const registerSchema = z.object({
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

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function checkInvite(req: Request, res: Response): Promise<void> {
  const params = z.object({ token: z.string().min(1) }).safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: 'Invalid token' }); return; }
  const status = await getInviteTokenStatus(params.data.token);
  res.json({ valid: status === 'valid', reason: status === 'valid' ? undefined : status });
}

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { token, username, password, language } = parsed.data;
  const aiLanguage =
    (language ? resolveLanguageTag(language) : null) ??
    resolveAcceptLanguage(req.headers['accept-language']) ??
    DEFAULT_AI_LANGUAGE;
  const passwordError = passwordSchema.validate(password);
  if (passwordError) { res.status(400).json({ error: passwordError }); return; }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) { res.status(409).json({ error: 'Username already taken' }); return; }

  const passwordHash = await hashPassword(password);
  let user;
  try {
    // One transaction so a rejected invite doesn't leave a user behind and a
    // failed user creation doesn't burn the invite.
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { username, passwordHash, aiLanguage } });
      await consumeInviteLink(token, created.id, tx);
      return created;
    });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, COOKIE_OPTIONS);
  res.status(201).json({ accessToken, user: { id: user.id, username: user.username } });
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }

  const { username, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || user.status !== 'ACTIVE' || !(await verifyPassword(user.passwordHash, password))) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, COOKIE_OPTIONS);
  res.json({ accessToken, user: { id: user.id, username: user.username } });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = (req.cookies as Record<string, string>)?.[REFRESH_TOKEN_COOKIE];
  if (!token) { res.status(401).json({ error: 'No refresh token' }); return; }

  try {
    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE') { res.status(401).json({ error: 'User not found' }); return; }

    const accessToken = signAccessToken(user.id);
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
  res.json({ ok: true });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }

  const { token, newPassword } = parsed.data;
  const passwordError = passwordSchema.validate(newPassword);
  if (passwordError) { res.status(400).json({ error: passwordError }); return; }

  try {
    const link = await consumePasswordResetLink(token);
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: link.userId }, data: { passwordHash } });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}
