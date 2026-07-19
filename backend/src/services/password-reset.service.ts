import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma.js';

const RESET_LINK_EXPIRY_HOURS = 24;

export async function createPasswordResetLink(userId: string) {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + RESET_LINK_EXPIRY_HOURS * 60 * 60 * 1000);
  // A user has at most one usable reset link: creating a new one revokes any
  // link that is still pending, so stale URLs can't linger.
  return prisma.$transaction(async (tx) => {
    await tx.passwordResetLink.updateMany({
      where: { userId, used: false, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return tx.passwordResetLink.create({ data: { token, userId, expiresAt } });
  });
}

export async function listPasswordResetLinks() {
  return prisma.passwordResetLink.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { username: true } } },
  });
}

export async function consumePasswordResetLink(token: string) {
  const link = await prisma.passwordResetLink.findUnique({ where: { token } });
  if (!link) throw new Error('Reset link not found');
  if (link.used) throw new Error('Reset link already used');
  if (link.revokedAt) throw new Error('Reset link has been revoked');
  if (link.expiresAt < new Date()) throw new Error('Reset link expired');
  // Conditional update so two concurrent resets can't both consume it.
  const { count } = await prisma.passwordResetLink.updateMany({
    where: { id: link.id, used: false, revokedAt: null },
    data: { used: true },
  });
  if (count === 0) throw new Error('Reset link already used');
  return link;
}

export async function revokePasswordResetLink(id: string) {
  const link = await prisma.passwordResetLink.findUnique({ where: { id } });
  if (!link) throw new Error('Reset link not found');
  if (link.used) throw new Error('Reset link already used');
  if (link.revokedAt) return link;
  return prisma.passwordResetLink.update({ where: { id }, data: { revokedAt: new Date() } });
}
