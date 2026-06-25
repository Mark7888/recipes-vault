import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  const status = (err as { status?: number }).status ?? 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
}
