import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma.js';

const RESET_LINK_EXPIRY_HOURS = 24;

export async function createPasswordResetLink(userId: string) {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + RESET_LINK_EXPIRY_HOURS * 60 * 60 * 1000);
  return prisma.passwordResetLink.create({ data: { token, userId, expiresAt } });
}

export async function consumePasswordResetLink(token: string) {
  const link = await prisma.passwordResetLink.findUnique({ where: { token }, include: { user: true } });
  if (!link) throw new Error('Reset link not found');
  if (link.used) throw new Error('Reset link already used');
  if (link.expiresAt < new Date()) throw new Error('Reset link expired');
  await prisma.passwordResetLink.update({ where: { id: link.id }, data: { used: true } });
  return link;
}
