import { prisma } from '../lib/prisma.js';

export async function searchTags(search: string) {
  return prisma.tag.findMany({
    where: { name: { contains: search, mode: 'insensitive' } },
    take: 20,
    orderBy: { name: 'asc' },
  });
}

export async function findOrCreateTags(names: string[]) {
  const tags = await Promise.all(
    names.map((name) =>
      prisma.tag.upsert({
        where: { name: name.toLowerCase().trim() },
        update: {},
        create: { name: name.toLowerCase().trim() },
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
