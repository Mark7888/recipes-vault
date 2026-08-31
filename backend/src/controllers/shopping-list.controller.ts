import type { Request, Response } from 'express';
import {
  getShoppingList,
  addShoppingItems,
  updateShoppingItem,
  deleteShoppingItem,
  setItemsBought,
  clearShoppingList,
  getShoppingHistory,
  readdHistoryEntry,
  deleteHistoryEntry,
} from '../services/shopping-list.service.js';
import {
  bulkShoppingItemsSchema,
  setBoughtSchema,
  shoppingItemInputSchema,
  updateShoppingItemSchema,
} from '../schemas/shopping-list.schema.js';
import type { AuthenticatedRequest } from '../types/index.js';

export async function listItems(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const items = await getShoppingList(userId);
  res.json(items);
}

export async function postItem(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const input = shoppingItemInputSchema.parse(req.body);
    const items = await addShoppingItems(userId, [input]);
    res.status(201).json(items);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function postItemsBulk(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const { items } = bulkShoppingItemsSchema.parse(req.body);
    const result = await addShoppingItems(userId, items);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function patchItem(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const id = req.params.id as string;
  try {
    const data = updateShoppingItemSchema.parse(req.body);
    const ok = await updateShoppingItem(userId, id, data);
    if (!ok) { res.status(404).json({ error: 'Item not found' }); return; }
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function removeItem(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const id = req.params.id as string;
  const ok = await deleteShoppingItem(userId, id);
  if (!ok) { res.status(404).json({ error: 'Item not found' }); return; }
  res.status(204).send();
}

export async function postBought(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const { ids, bought } = setBoughtSchema.parse(req.body);
    const items = await setItemsBought(userId, ids, bought);
    res.json(items);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function postClear(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const entry = await clearShoppingList(userId);
  res.json({ entry });
}

export async function listHistory(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const entries = await getShoppingHistory(userId);
  res.json(entries);
}

export async function postReaddHistory(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const id = req.params.id as string;
  const items = await readdHistoryEntry(userId, id);
  if (!items) { res.status(404).json({ error: 'History entry not found' }); return; }
  res.json(items);
}

export async function removeHistory(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const id = req.params.id as string;
  const ok = await deleteHistoryEntry(userId, id);
  if (!ok) { res.status(404).json({ error: 'History entry not found' }); return; }
  res.status(204).send();
}
