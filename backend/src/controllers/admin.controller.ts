import type { Request, Response } from 'express';
import { UserStatus } from '@prisma/client';
import { verifyAdminCredentials, signAdminToken } from '../services/admin-auth.service.js';
import { createInviteLink, listInviteLinks, revokeInviteLink } from '../services/invite.service.js';
import { createPasswordResetLink, listPasswordResetLinks, revokePasswordResetLink } from '../services/password-reset.service.js';
import { markUserForDeletion } from '../services/user-deletion.service.js';
import { kickUserCleanup } from '../workers/user-cleanup.worker.js';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

export async function listUsers(_req: Request, res: Response): Promise<void> {
  const users = await prisma.user.findMany({
    where: { status: { not: UserStatus.DELETED } },
    select: { id: true, username: true, status: true, aiEnabled: true, createdAt: true },
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
    if (!user || user.status !== UserStatus.ACTIVE) { res.status(404).json({ error: 'User not found' }); return; }
    const link = await createPasswordResetLink(userId);
    res.status(201).json(link);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function getPasswordResets(_req: Request, res: Response): Promise<void> {
  const links = await listPasswordResetLinks();
  res.json(links);
}

export async function revokePasswordReset(req: Request, res: Response): Promise<void> {
  const params = idParamSchema.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: 'Invalid id' }); return; }
  try {
    const link = await revokePasswordResetLink(params.data.id);
    res.json(link);
  } catch (err) {
    const message = (err as Error).message;
    res.status(message === 'Reset link not found' ? 404 : 409).json({ error: message });
  }
}

const idParamSchema = z.object({ id: z.string().uuid() });

export async function revokeInvite(req: Request, res: Response): Promise<void> {
  const params = idParamSchema.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: 'Invalid id' }); return; }
  try {
    const link = await revokeInviteLink(params.data.id);
    res.json(link);
  } catch (err) {
    const message = (err as Error).message;
    res.status(message === 'Invite link not found' ? 404 : 409).json({ error: message });
  }
}

/**
 * Grants or revokes access to the AI recipe assistant. Off by default for every
 * account; only the admin can flip it.
 */
export async function setUserAiAccess(req: Request, res: Response): Promise<void> {
  const params = idParamSchema.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: 'Invalid id' }); return; }
  const body = z.object({ enabled: z.boolean() }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: 'Invalid input' }); return; }

  const user = await prisma.user.findUnique({ where: { id: params.data.id } });
  if (!user || user.status !== UserStatus.ACTIVE) { res.status(404).json({ error: 'User not found' }); return; }

  const updated = await prisma.user.update({
    where: { id: params.data.id },
    data: { aiEnabled: body.data.enabled },
    select: { id: true, username: true, status: true, aiEnabled: true, createdAt: true },
  });
  res.json(updated);
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  const params = idParamSchema.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: 'Invalid id' }); return; }
  const { id } = params.data;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.status === UserStatus.DELETED) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const marked = await markUserForDeletion(id);
  if (marked) kickUserCleanup();
  // Not marked means it was already pending — either way deletion is underway.
  res.status(202).json({ status: UserStatus.PENDING_DELETION });
}
