import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma.js';

export async function createInviteLink(description: string) {
  const token = randomUUID();
  return prisma.inviteLink.create({ data: { token, description } });
}

export async function listInviteLinks() {
  return prisma.inviteLink.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function consumeInviteLink(token: string) {
  const link = await prisma.inviteLink.findUnique({ where: { token } });
  if (!link) throw new Error('Invite link not found');
  if (link.used) throw new Error('Invite link already used');
  await prisma.inviteLink.update({ where: { id: link.id }, data: { used: true } });
  return link;
}
