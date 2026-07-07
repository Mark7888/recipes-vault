import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/auth.service.js';
import { prisma } from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../types/index.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }
  const token = header.slice(7);
  let userId: string;
  try {
    userId = verifyAccessToken(token).sub;
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Access tokens live 15 minutes, so a signature check alone would let a
  // just-deleted user keep writing while the cleanup worker runs. Verify the
  // account is still active before every authenticated request.
  void (async () => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
    if (!user || user.status !== 'ACTIVE') {
      res.status(401).json({ error: 'Account is no longer active' });
      return;
    }
    (req as AuthenticatedRequest).userId = userId;
    next();
  })().catch(next);
}
