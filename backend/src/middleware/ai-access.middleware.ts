import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { aiErrors } from '../services/ai/ai-errors.js';
import { isAiConfigured } from '../services/ai/openrouter.service.js';
import { DEFAULT_AI_LANGUAGE } from '../services/ai/languages.js';
import type { AiRequest, AuthenticatedRequest } from '../types/index.js';

/**
 * Gates every AI endpoint. Must run after authMiddleware: access is a per-user
 * flag an admin sets, and it is off for everyone by default, so the check has
 * to hit the database rather than trust anything in the token. The same read
 * picks up the user's AI language, so no handler past here needs its own query.
 */
export function aiAccessMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!isAiConfigured()) {
    const err = aiErrors.notConfigured();
    res.status(err.status).json(err.toResponseBody());
    return;
  }

  const userId = (req as AuthenticatedRequest).userId;
  void (async () => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { aiEnabled: true, aiLanguage: true },
    });
    if (!user?.aiEnabled) {
      const err = aiErrors.forbidden();
      res.status(err.status).json(err.toResponseBody());
      return;
    }
    (req as AiRequest).aiLanguage = user.aiLanguage || DEFAULT_AI_LANGUAGE;
    next();
  })().catch(next);
}
