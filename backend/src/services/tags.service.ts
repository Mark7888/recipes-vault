import { prisma } from '../lib/prisma.js';

/**
 * Provenance tag put on every recipe the AI parsed or wrote. Lower-case like
 * every other tag in the app (see findOrCreateTags), so a hand-typed one and
 * this one are the same tag rather than two that only differ in case. Its
 * counterpart, "manually captured", is added by the editor on save.
 */
export const AI_CAPTURE_TAG = 'captured by ai';

export async function searchTags(search: string) {
  return prisma.tag.findMany({
    where: { name: { contains: search, mode: 'insensitive' } },
    take: 20,
    orderBy: { name: 'asc' },
  });
}

export async function findOrCreateTags(names: string[]) {
  // Normalize first and then dedupe: the upserts run in parallel, so the same
  // name twice in one call is two racing inserts on a unique column.
  const normalized = [...new Set(names.map((name) => name.toLowerCase().trim()).filter(Boolean))];
  const tags = await Promise.all(
    normalized.map((name) =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );
  return tags;
}

export async function listAllTags() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { recipes: true } } },
  });
  return tags.map((t) => ({ id: t.id, name: t.name, recipeCount: t._count.recipes }));
}

export async function renameTag(id: string, name: string) {
  const normalized = name.toLowerCase().trim();
  const existing = await prisma.tag.findUnique({ where: { name: normalized } });
  if (existing && existing.id !== id) {
    throw new Error(`Tag "${normalized}" already exists`);
  }
  return prisma.tag.update({ where: { id }, data: { name: normalized } });
}

export async function mergeTag(sourceId: string, targetId: string) {
  if (sourceId === targetId) throw new Error('Cannot merge a tag into itself');
  return prisma.$transaction(async (tx) => {
    const source = await tx.tag.findUnique({ where: { id: sourceId }, include: { recipes: { select: { id: true } } } });
    const target = await tx.tag.findUnique({ where: { id: targetId } });
    if (!source) throw new Error('Source tag not found');
    if (!target) throw new Error('Target tag not found');
    if (source.recipes.length > 0) {
      await tx.tag.update({
        where: { id: targetId },
        data: { recipes: { connect: source.recipes.map((r) => ({ id: r.id })) } },
      });
    }
    await tx.tag.delete({ where: { id: sourceId } });
    return target;
  });
}

export async function deleteTag(id: string) {
  return prisma.tag.delete({ where: { id } });
}
