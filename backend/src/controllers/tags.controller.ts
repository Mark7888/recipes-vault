import type { Request, Response } from 'express';
import { searchTags } from '../services/tags.service.js';

export async function listTags(req: Request, res: Response): Promise<void> {
  const search = (req.query.search as string) || '';
  const tags = await searchTags(search);
  res.json(tags);
}
