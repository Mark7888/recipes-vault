import type { Request, Response } from 'express';
import {
  ApiKeyLimitError,
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from '../services/api-keys.service.js';
import { createApiKeySchema } from '../schemas/api-keys.schema.js';
import { logger } from '../lib/logger.js';
import type { AuthenticatedRequest } from '../types/index.js';

export async function getApiKeys(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  res.json(await listApiKeys(userId));
}

/**
 * Mints a key. The plaintext token is in this response and nowhere else — the
 * server keeps only its hash — so the caller has one chance to store it.
 */
export async function postApiKey(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = createApiKeySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' });
    return;
  }

  const { name, expiresAt } = parsed.data;
  try {
    const created = await createApiKey(userId, {
      name,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });
    logger.info({ userId, apiKeyId: created.key.id, expiresAt }, 'API key created');
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof ApiKeyLimitError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    throw err;
  }
}

export async function deleteApiKey(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const id = req.params.id as string;
  const found = await revokeApiKey(userId, id);
  if (!found) {
    res.status(404).json({ error: 'API key not found' });
    return;
  }
  logger.info({ userId, apiKeyId: id }, 'API key revoked');
  res.status(204).send();
}
