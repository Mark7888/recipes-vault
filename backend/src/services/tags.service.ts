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
