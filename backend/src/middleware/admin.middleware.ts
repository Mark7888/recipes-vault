import type { Request, Response, NextFunction } from 'express';
import { verifyAdminToken } from '../services/admin-auth.service.js';

export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }
  const token = header.slice(7);
  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: 'Invalid admin token' });
    return;
  }
  next();
}
