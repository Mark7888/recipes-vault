import type { Request, Response } from 'express';
import { z } from 'zod';
import { searchTags, listAllTags, renameTag, mergeTag, deleteTag } from '../services/tags.service.js';

export async function listTags(req: Request, res: Response): Promise<void> {
  const search = (req.query.search as string) || '';
  const tags = await searchTags(search);
  res.json(tags);
}

export async function listAllTagsHandler(_req: Request, res: Response): Promise<void> {
  const tags = await listAllTags();
  res.json(tags);
}

export async function renameTagHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  try {
    const { name } = z.object({ name: z.string().min(1).max(50) }).parse(req.body);
    const tag = await renameTag(id, name);
    res.json(tag);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function mergeTagHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  try {
    const { targetId } = z.object({ targetId: z.string().uuid() }).parse(req.body);
    const tag = await mergeTag(id, targetId);
    res.json(tag);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function deleteTagHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  try {
    await deleteTag(id);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}
