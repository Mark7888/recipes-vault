import type { Request, Response, NextFunction } from 'express';
import { getUserRoleInCollection } from '../services/collections.service.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { Role } from '@prisma/client';

export function requireRole(...roles: Role[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req as AuthenticatedRequest).userId;
    const collectionId = req.params.id as string;
    if (!userId || !collectionId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const role = await getUserRoleInCollection(collectionId, userId);
    if (!role || !roles.includes(role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    (req as Request & { userRole: Role }).userRole = role;
    next();
  };
}
