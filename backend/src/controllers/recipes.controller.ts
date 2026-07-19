import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  createRecipe,
  getRecipeById,
  getRecipesForUser,
  updateRecipe,
  deleteRecipe,
  setRecipeTags,
  isRecipeAccessibleByUser,
  getRecipeSitesForUser,
  getOrCreateShareToken,
  getRecipeByShareToken,
} from '../services/recipes.service.js';
import { getCollectionIdsContainingRecipe } from '../services/collections.service.js';
import { findOrCreateTags } from '../services/tags.service.js';
import { saveImage, saveImageRecord, deleteImageFile } from '../services/image-storage.service.js';
import { prisma } from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../types/index.js';

export async function listRecipes(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const search = req.query.search as string | undefined;
  const tags = req.query['tags[]'] as string | string[] | undefined;
  const tagArray = tags ? (Array.isArray(tags) ? tags : [tags]) : undefined;
  const site = req.query.site as string | undefined;
  const recipes = await getRecipesForUser(userId, search, tagArray, site);
  res.json(recipes);
}

export async function listRecipeSites(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const sites = await getRecipeSitesForUser(userId);
  res.json(sites);
}

export async function postRecipe(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const { title } = z.object({ title: z.string().optional() }).parse(req.body ?? {});
    const recipe = await createRecipe(userId, {
      title: title?.trim() || 'Untitled Recipe',
      ingredients: [],
      instructions: [],
    });
    res.status(201).json(recipe);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function getRecipe(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const id = req.params.id as string;
  const recipe = await getRecipeById(id);
  if (!recipe) { res.status(404).json({ error: 'Recipe not found' }); return; }
  const accessible = await isRecipeAccessibleByUser(recipe.id, userId);
  if (!accessible) { res.status(403).json({ error: 'Forbidden' }); return; }
  res.json(recipe);
}

export async function patchRecipe(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const id = req.params.id as string;
  const recipe = await getRecipeById(id);
  if (!recipe) { res.status(404).json({ error: 'Recipe not found' }); return; }
  if (recipe.ownerId !== userId) { res.status(403).json({ error: 'Forbidden' }); return; }
  const updated = await updateRecipe(recipe.id, req.body as Parameters<typeof updateRecipe>[1]);
  res.json(updated);
}

export async function removeRecipe(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const id = req.params.id as string;
  const recipe = await getRecipeById(id);
  if (!recipe) { res.status(404).json({ error: 'Recipe not found' }); return; }
  if (recipe.ownerId !== userId) { res.status(403).json({ error: 'Forbidden' }); return; }
  for (const img of recipe.images) {
    await deleteImageFile(img.filePath);
  }
  await deleteRecipe(recipe.id);
  res.status(204).send();
}

export async function updateTags(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const id = req.params.id as string;
  const recipe = await getRecipeById(id);
  if (!recipe) { res.status(404).json({ error: 'Recipe not found' }); return; }
  if (recipe.ownerId !== userId) { res.status(403).json({ error: 'Forbidden' }); return; }
  try {
    const { tags } = z.object({ tags: z.array(z.string()) }).parse(req.body);
    const tagRecords = await findOrCreateTags(tags);
    const updated = await setRecipeTags(recipe.id, tagRecords.map(t => t.id));
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function listImages(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const id = req.params.id as string;
  const accessible = await isRecipeAccessibleByUser(id, userId);
  if (!accessible) { res.status(403).json({ error: 'Forbidden' }); return; }
  const images = await prisma.image.findMany({ where: { recipeId: id } });
  res.json(images);
}

export async function uploadImage(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const id = req.params.id as string;
  const recipe = await getRecipeById(id);
  if (!recipe) { res.status(404).json({ error: 'Recipe not found' }); return; }
  if (recipe.ownerId !== userId) { res.status(403).json({ error: 'Forbidden' }); return; }
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }

  const filename = await saveImage(req.file.buffer, recipe.id, req.file.originalname);
  const image = await saveImageRecord(recipe.id, filename);
  res.status(201).json(image);
}

export async function removeImage(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const id = req.params.id as string;
  const imageId = req.params.imageId as string;
  const recipe = await getRecipeById(id);
  if (!recipe) { res.status(404).json({ error: 'Recipe not found' }); return; }
  if (recipe.ownerId !== userId) { res.status(403).json({ error: 'Forbidden' }); return; }
  const image = await prisma.image.findUnique({ where: { id: imageId } });
  if (!image || image.recipeId !== recipe.id) { res.status(404).json({ error: 'Image not found' }); return; }
  await deleteImageFile(image.filePath);
  await prisma.image.delete({ where: { id: image.id } });
  if (recipe.coverImageId === image.id) {
    await prisma.recipe.update({ where: { id: recipe.id }, data: { coverImageId: null } });
  }
  res.status(204).send();
}

export async function setCoverImage(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const id = req.params.id as string;
  const recipe = await getRecipeById(id);
  if (!recipe) { res.status(404).json({ error: 'Recipe not found' }); return; }
  if (recipe.ownerId !== userId) { res.status(403).json({ error: 'Forbidden' }); return; }
  try {
    const { imageId } = z.object({ imageId: z.string().uuid() }).parse(req.body);
    const image = await prisma.image.findUnique({ where: { id: imageId } });
    if (!image || image.recipeId !== recipe.id) { res.status(404).json({ error: 'Image not found' }); return; }
    await prisma.recipe.update({ where: { id: recipe.id }, data: { coverImageId: imageId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

export async function shareRecipe(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const id = req.params.id as string;
  const recipe = await getRecipeById(id);
  if (!recipe) { res.status(404).json({ error: 'Recipe not found' }); return; }
  if (recipe.ownerId !== userId) { res.status(403).json({ error: 'Forbidden' }); return; }
  const token = await getOrCreateShareToken(recipe.id);
  res.json({ token });
}

export async function getSharedRecipe(req: Request, res: Response): Promise<void> {
  const token = req.params.token as string;
  const recipe = await getRecipeByShareToken(token);
  if (!recipe) { res.status(404).json({ error: 'Recipe not found' }); return; }
  res.json(recipe);
}

export async function getRecipeCollections(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const id = req.params.id as string;
  const collectionIds = await getCollectionIdsContainingRecipe(userId, id);
  res.json(collectionIds);
}
