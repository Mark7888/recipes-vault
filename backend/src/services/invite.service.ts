import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma.js';

export async function createInviteLink(description: string) {
  const token = randomUUID();
  return prisma.inviteLink.create({ data: { token, description } });
}

export async function listInviteLinks() {
  return prisma.inviteLink.findMany({ orderBy: { createdAt: 'desc' } });
}

export type InviteTokenStatus = 'valid' | 'not_found' | 'revoked' | 'used';

export async function getInviteTokenStatus(token: string): Promise<InviteTokenStatus> {
  const link = await prisma.inviteLink.findUnique({ where: { token } });
  if (!link) return 'not_found';
  if (link.revokedAt) return 'revoked';
  if (link.used) return 'used';
  return 'valid';
}

export async function consumeInviteLink(token: string) {
  const link = await prisma.inviteLink.findUnique({ where: { token } });
  if (!link) throw new Error('Invite link not found');
  if (link.used) throw new Error('Invite link already used');
  if (link.revokedAt) throw new Error('Invite link has been revoked');
  // Conditional update so two concurrent registrations can't both consume it.
  const { count } = await prisma.inviteLink.updateMany({
    where: { id: link.id, used: false, revokedAt: null },
    data: { used: true },
  });
  if (count === 0) throw new Error('Invite link already used');
  return link;
}

export async function revokeInviteLink(id: string) {
  const link = await prisma.inviteLink.findUnique({ where: { id } });
  if (!link) throw new Error('Invite link not found');
  if (link.used) throw new Error('Invite link already used');
  if (link.revokedAt) return link;
  return prisma.inviteLink.update({ where: { id }, data: { revokedAt: new Date() } });
}
