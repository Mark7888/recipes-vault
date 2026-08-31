import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword, passwordSchema } from '../services/auth.service.js';
import { updateCurrentUserSchema } from '../schemas/users.schema.js';
import type { AuthenticatedRequest } from '../types/index.js';

export async function searchUsers(req: Request, res: Response): Promise<void> {
  const currentUserId = (req as AuthenticatedRequest).userId;
  const q = ((req.query.q as string) || '').trim();
  if (q.length < 2) { res.json([]); return; }
  const users = await prisma.user.findMany({
    where: { username: { contains: q, mode: 'insensitive' }, id: { not: currentUserId }, status: 'ACTIVE' },
    select: { id: true, username: true },
    take: 10,
  });
  res.json(users);
}

/**
 * Who the caller is. The web UI already learns this from the login response;
 * an API client has no login step, so this is how a key finds out whose it is.
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, createdAt: true, aiEnabled: true, aiLanguage: true },
  });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json({ ...user, createdAt: user.createdAt.toISOString() });
}

export async function patchMe(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = updateCurrentUserSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { username, currentPassword, newPassword } = parsed.data;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }

  const updateData: { username?: string; passwordHash?: string } = {};

  if (username && username !== user.username) {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) { res.status(409).json({ error: 'Username already taken' }); return; }
    updateData.username = username;
  }

  if (newPassword) {
    const err = passwordSchema.validate(newPassword);
    if (err) { res.status(400).json({ error: err }); return; }
    updateData.passwordHash = await hashPassword(newPassword);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, username: true, createdAt: true },
  });
  res.json(updated);
}
