import { prisma } from '../lib/prisma.js';
import type { Ingredient, Instruction } from '../types/index.js';

interface RecipeInput {
  title: string;
  sourceUrl?: string;
  isFallback?: boolean;
  ingredients: Ingredient[];
  instructions: Instruction[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  notes?: string;
}

export async function createRecipe(ownerId: string, data: RecipeInput) {
  return prisma.recipe.create({
    data: {
      ...data,
      ownerId,
      ingredients: data.ingredients as object[],
      instructions: data.instructions as object[],
    },
    include: { tags: true, images: true, coverImage: true },
  });
}

export async function getRecipeById(id: string) {
  return prisma.recipe.findUnique({
    where: { id },
    include: { tags: true, images: true, coverImage: true, owner: { select: { id: true, username: true } } },
  });
}

export async function getRecipesForUser(ownerId: string, search?: string, tags?: string[]) {
  return prisma.recipe.findMany({
    where: {
      ownerId,
      ...(search && { title: { contains: search, mode: 'insensitive' } }),
      ...(tags && tags.length > 0 && { tags: { some: { name: { in: tags } } } }),
    },
    include: { tags: true, coverImage: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateRecipe(id: string, data: Partial<RecipeInput>) {
  return prisma.recipe.update({
    where: { id },
    data: {
      ...data,
      ...(data.ingredients && { ingredients: data.ingredients as object[] }),
      ...(data.instructions && { instructions: data.instructions as object[] }),
    },
    include: { tags: true, images: true, coverImage: true },
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
