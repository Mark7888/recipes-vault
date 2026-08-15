import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { captureUrl } from '../services/parser-dispatch.service.js';
import { createRecipe, setRecipeTags } from '../services/recipes.service.js';
import { findOrCreateTags } from '../services/tags.service.js';
import { downloadImagesInBackground } from '../services/image-storage.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();

/**
 * A capture that produced no ingredients or no steps is one the parsers could
 * not really read. Both capture entry points report it so the UI can offer the
 * AI a go at the same page.
 */
export function isCaptureIncomplete(recipe: { ingredients: unknown; instructions: unknown }): boolean {
  const ingredients = recipe.ingredients as unknown[];
  const instructions = recipe.instructions as unknown[];
  return ingredients.length === 0 || instructions.length === 0;
}

export async function captureAndCreateRecipe(url: string, userId: string) {
  const parsed = await captureUrl(url);
  const recipe = await createRecipe(userId, {
    title: parsed.title,
    sourceUrl: parsed.sourceUrl,
    isFallback: parsed.isFallback,
    ingredients: parsed.ingredients,
    instructions: parsed.instructions,
    prepTime: parsed.prepTime,
    cookTime: parsed.cookTime,
    servings: parsed.servings,
    notes: parsed.notes,
  });

  if (parsed.tags && parsed.tags.length > 0) {
    const tags = await findOrCreateTags(parsed.tags);
    await setRecipeTags(recipe.id, tags.map((t) => t.id));
  }

  downloadImagesInBackground(recipe.id, parsed.imageUrls);

  return recipe;
}

export async function handleCapture(url: string, userId: string, res: Response): Promise<void> {
  const recipe = await captureAndCreateRecipe(url, userId);
  res.status(201).json({ recipeId: recipe.id, incomplete: isCaptureIncomplete(recipe) });
}

router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const { url } = z.object({ url: z.string().url() }).parse(req.body);
    await handleCapture(url, userId, res);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
