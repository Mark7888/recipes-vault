import { prisma } from '../lib/prisma.js';
import type { Prisma } from '@prisma/client';

export interface ShoppingItemInput {
  name: string;
  amount?: string;
  unit?: string;
  recipeId?: string | null;
  recipeTitle?: string | null;
}

export interface ShoppingHistoryItem {
  name: string;
  amount: string;
  unit: string;
  recipeId: string | null;
  recipeTitle: string | null;
}

// Parses "2", "1.5", "1,5", "1/2" and "1 1/2"; null for anything else
// (e.g. "a pinch"), which addAmounts then keeps as text.
function parseAmount(raw: string): number | null {
  const s = raw.trim().replace(',', '.');
  if (!s) return null;
  let m = /^(\d+)\s+(\d+)\/(\d+)$/.exec(s);
  if (m) return Number(m[1]) + Number(m[2]) / Number(m[3]);
  m = /^(\d+)\/(\d+)$/.exec(s);
  if (m) return Number(m[1]) / Number(m[2]);
  if (/^\d+(?:\.\d+)?$/.test(s)) return Number(s);
  return null;
}

export function addAmounts(a: string, b: string): string {
  const ta = a.trim();
  const tb = b.trim();
  if (!ta) return tb;
  if (!tb) return ta;
  const pa = parseAmount(ta);
  const pb = parseAmount(tb);
  if (pa !== null && pb !== null) {
    return String(Math.round((pa + pb) * 100) / 100);
  }
  return `${ta} + ${tb}`;
}

export async function getShoppingList(userId: string) {
  return prisma.shoppingListItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Add items, merging into existing unbought rows from the same source
 * (case-insensitive name + unit, same recipe or both manual) by summing
 * amounts. Rows from different recipes stay separate so the list can be
 * grouped by target recipe; the flat view merges them client-side.
 */
export async function addShoppingItems(userId: string, inputs: ShoppingItemInput[]) {
  const recipeIds = [...new Set(inputs.map(i => i.recipeId).filter((id): id is string => !!id))];
  const recipes = recipeIds.length
    ? await prisma.recipe.findMany({ where: { id: { in: recipeIds } }, select: { id: true, title: true } })
    : [];
  const titleById = new Map(recipes.map(r => [r.id, r.title]));

  for (const input of inputs) {
    const name = input.name.trim();
    if (!name) continue;
    const amount = (input.amount ?? '').trim();
    const unit = (input.unit ?? '').trim();
    // A stale/deleted recipeId (e.g. re-adding an old history entry) falls
    // back to the snapshotted title so the item still groups under it.
    const recipeId = input.recipeId && titleById.has(input.recipeId) ? input.recipeId : null;
    const recipeTitle = recipeId ? titleById.get(recipeId)! : input.recipeTitle?.trim() || null;

    const existing = await prisma.shoppingListItem.findFirst({
      where: {
        userId,
        bought: false,
        name: { equals: name, mode: 'insensitive' },
        unit: { equals: unit, mode: 'insensitive' },
        recipeId,
        ...(recipeId ? {} : { recipeTitle }),
      },
    });

    if (existing) {
      await prisma.shoppingListItem.update({
        where: { id: existing.id },
        data: { amount: addAmounts(existing.amount, amount) },
      });
    } else {
      await prisma.shoppingListItem.create({
        data: { userId, name, amount, unit, recipeId, recipeTitle },
      });
    }
  }

  return getShoppingList(userId);
}

export async function updateShoppingItem(
  userId: string,
  itemId: string,
  data: { name?: string; amount?: string; unit?: string; bought?: boolean }
) {
  const { count } = await prisma.shoppingListItem.updateMany({
    where: { id: itemId, userId },
    data,
  });
  return count === 1;
}

export async function deleteShoppingItem(userId: string, itemId: string) {
  const { count } = await prisma.shoppingListItem.deleteMany({
    where: { id: itemId, userId },
  });
  return count === 1;
}

export async function setItemsBought(userId: string, ids: string[], bought: boolean) {
  await prisma.shoppingListItem.updateMany({
    where: { userId, id: { in: ids } },
    data: { bought },
  });
  return getShoppingList(userId);
}

/**
 * Archive the bought items into a history entry (skipped when nothing was
 * bought) and wipe the whole list, todo items included.
 */
export async function clearShoppingList(userId: string) {
  return prisma.$transaction(async (tx) => {
    const bought = await tx.shoppingListItem.findMany({
      where: { userId, bought: true },
      orderBy: { createdAt: 'asc' },
    });
    let entry = null;
    if (bought.length > 0) {
      const items: ShoppingHistoryItem[] = bought.map(i => ({
        name: i.name,
        amount: i.amount,
        unit: i.unit,
        recipeId: i.recipeId,
        recipeTitle: i.recipeTitle,
      }));
      entry = await tx.shoppingHistoryEntry.create({
        data: { userId, items: items as unknown as Prisma.InputJsonValue },
      });
    }
    await tx.shoppingListItem.deleteMany({ where: { userId } });
    return entry;
  });
}

export async function getShoppingHistory(userId: string) {
  return prisma.shoppingHistoryEntry.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function readdHistoryEntry(userId: string, entryId: string) {
  const entry = await prisma.shoppingHistoryEntry.findFirst({
    where: { id: entryId, userId },
  });
  if (!entry) return null;
  const items = entry.items as unknown as ShoppingHistoryItem[];
  return addShoppingItems(userId, items);
}

export async function deleteHistoryEntry(userId: string, entryId: string) {
  const { count } = await prisma.shoppingHistoryEntry.deleteMany({
    where: { id: entryId, userId },
  });
  return count === 1;
}
