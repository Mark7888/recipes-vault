import type { Request, Response } from 'express';
import { verifyAdminCredentials, signAdminToken } from '../services/admin-auth.service.js';
import { createInviteLink, listInviteLinks } from '../services/invite.service.js';
import { createPasswordResetLink } from '../services/password-reset.service.js';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

export async function listUsers(_req: Request, res: Response): Promise<void> {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json(users);
}

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function adminLogin(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }

  const { username, password } = parsed.data;
  const valid = await verifyAdminCredentials(username, password);
  if (!valid) { res.status(401).json({ error: 'Invalid credentials' }); return; }

  res.json({ token: signAdminToken() });
}

export async function createInvite(req: Request, res: Response): Promise<void> {
  try {
    const { description } = z.object({ description: z.string().optional() }).parse(req.body);
    const link = await createInviteLink(description ?? 'Admin invite');
    res.status(201).json(link);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function getInvites(_req: Request, res: Response): Promise<void> {
  const links = await listInviteLinks();
  res.json(links);
}

export async function createPasswordReset(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = z.object({ userId: z.string().uuid() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const link = await createPasswordResetLink(userId);
    res.status(201).json(link);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}
