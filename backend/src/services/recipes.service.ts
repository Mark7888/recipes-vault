import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import type { Prisma } from '@prisma/client';
import type { Ingredient, Instruction } from '../types/index.js';
import { copyImageFile } from './image-storage.service.js';

interface RecipeInput {
  title: string;
  sourceUrl?: string;
  isFallback?: boolean;
  ingredients: Ingredient[];
  instructions: Instruction[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  // null clears a note that is no longer true (an AI re-parse replacing what a
  // failed capture wrote); undefined leaves it alone.
  notes?: string | null;
}

export async function createRecipe(ownerId: string, data: RecipeInput) {
  return prisma.recipe.create({
    data: {
      ...data,
      ownerId,
      ingredients: data.ingredients as object[],
      instructions: data.instructions as object[],
    },
    include: { tags: true, images: { orderBy: { order: 'asc' } }, coverImage: true },
  });
}

export async function duplicateRecipe(sourceId: string, ownerId: string) {
  const source = await prisma.recipe.findUnique({
    where: { id: sourceId },
    include: { tags: true, images: { orderBy: { order: 'asc' } } },
  });
  if (!source) throw new Error('Recipe not found');

  const copiedFiles = await Promise.all(
    source.images.map(async (img) => ({ original: img, filePath: await copyImageFile(img.filePath) }))
  );

  return prisma.$transaction(async (tx) => {
    const created = await tx.recipe.create({
      data: {
        title: `${source.title} (copy)`,
        sourceUrl: source.sourceUrl,
        isFallback: source.isFallback,
        ingredients: source.ingredients as object[],
        instructions: source.instructions as object[],
        prepTime: source.prepTime,
        cookTime: source.cookTime,
        servings: source.servings,
        notes: source.notes,
        ownerId,
        tags: { connect: source.tags.map((t) => ({ id: t.id })) },
      },
    });

    const newImages = await Promise.all(
      copiedFiles.map(({ original, filePath }) =>
        tx.image.create({ data: { recipeId: created.id, filePath, isCover: original.isCover, order: original.order } })
      )
    );

    const coverIndex = source.images.findIndex((img) => img.id === source.coverImageId);
    if (coverIndex !== -1) {
      await tx.recipe.update({ where: { id: created.id }, data: { coverImageId: newImages[coverIndex].id } });
    }

    return tx.recipe.findUniqueOrThrow({
      where: { id: created.id },
      include: { tags: true, images: { orderBy: { order: 'asc' } }, coverImage: true },
    });
  });
}

export async function getRecipeById(id: string) {
  return prisma.recipe.findUnique({
    where: { id },
    include: { tags: true, images: { orderBy: { order: 'asc' } }, coverImage: true, owner: { select: { id: true, username: true } } },
  });
}

export function extractSiteDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export type RecipeSort = 'newest' | 'oldest' | 'title-asc' | 'title-desc' | 'prep-time';

const SORT_ORDER_BY: Record<RecipeSort, Prisma.RecipeOrderByWithRelationInput> = {
  newest: { createdAt: 'desc' },
  oldest: { createdAt: 'asc' },
  'title-asc': { title: 'asc' },
  'title-desc': { title: 'desc' },
  'prep-time': { prepTime: 'asc' },
};

interface GetRecipesParams {
  search?: string;
  tags?: string[];
  site?: string;
  sort?: RecipeSort;
  limit?: number;
  offset?: number;
}

export async function getRecipesForUser(ownerId: string, params: GetRecipesParams = {}) {
  const { search, tags, site, sort = 'newest', limit = 24, offset = 0 } = params;
  const where = {
    ownerId,
    ...(search && { title: { contains: search, mode: 'insensitive' as const } }),
    ...(tags && tags.length > 0 && { tags: { some: { name: { in: tags } } } }),
    // sourceUrl hostnames are normalized (www. stripped) before being offered
    // as filter options, so match either form at the DB level.
    ...(site && { OR: [{ sourceUrl: { contains: `://${site}` } }, { sourceUrl: { contains: `://www.${site}` } }] }),
  };
  const [items, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      include: { tags: true, coverImage: true },
      orderBy: SORT_ORDER_BY[sort],
      skip: offset,
      take: limit,
    }),
    prisma.recipe.count({ where }),
  ]);
  return { items, total, hasMore: offset + items.length < total };
}

export async function getRecipeSitesForUser(ownerId: string): Promise<string[]> {
  const recipes = await prisma.recipe.findMany({
    where: { ownerId, sourceUrl: { not: null } },
    select: { sourceUrl: true },
  });
  const sites = new Set<string>();
  for (const r of recipes) {
    const domain = extractSiteDomain(r.sourceUrl);
    if (domain) sites.add(domain);
  }
  return [...sites].sort();
}

export async function updateRecipe(id: string, data: Partial<RecipeInput>) {
  return prisma.recipe.update({
    where: { id },
    data: {
      ...data,
      ...(data.ingredients && { ingredients: data.ingredients as object[] }),
      ...(data.instructions && { instructions: data.instructions as object[] }),
    },
    include: { tags: true, images: { orderBy: { order: 'asc' } }, coverImage: true },
  });
}

export async function deleteRecipe(id: string) {
  return prisma.recipe.delete({ where: { id } });
}

export async function setRecipeTags(recipeId: string, tagIds: string[]) {
  return prisma.recipe.update({
    where: { id: recipeId },
    data: { tags: { set: tagIds.map(id => ({ id })) } },
    include: { tags: true },
  });
}

export async function getOrCreateShareToken(recipeId: string): Promise<string> {
  const recipe = await prisma.recipe.findUniqueOrThrow({ where: { id: recipeId }, select: { shareToken: true } });
  if (recipe.shareToken) return recipe.shareToken;
  const token = randomUUID();
  await prisma.recipe.update({ where: { id: recipeId }, data: { shareToken: token } });
  return token;
}

export async function getRecipeByShareToken(token: string) {
  return prisma.recipe.findUnique({
    where: { shareToken: token },
    include: { tags: true, images: { orderBy: { order: 'asc' } }, coverImage: true, owner: { select: { id: true, username: true } } },
  });
}

export async function isRecipeAccessibleByUser(recipeId: string, userId: string): Promise<boolean> {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      collections: {
        include: {
          collection: {
            include: { members: { where: { userId } } },
          },
        },
      },
    },
  });
  if (!recipe) return false;
  if (recipe.ownerId === userId) return true;
  return recipe.collections.some(rc => rc.collection.members.length > 0);
}
