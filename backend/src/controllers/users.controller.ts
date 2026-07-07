import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword, passwordSchema } from '../services/auth.service.js';
import type { AuthenticatedRequest } from '../types/index.js';

const patchMeSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).optional(),
});

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

export async function patchMe(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = patchMeSchema.safeParse(req.body);
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
