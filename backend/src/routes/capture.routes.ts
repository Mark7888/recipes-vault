import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { captureUrl } from '../services/parser-dispatch.service.js';
import { createRecipe, setRecipeTags } from '../services/recipes.service.js';
import { findOrCreateTags } from '../services/tags.service.js';
import { downloadAndSaveImage, saveImageRecord } from '../services/image-storage.service.js';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();

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

  // Download and save images in the background so the response stays fast
  if (parsed.imageUrls.length > 0) {
    setImmediate(async () => {
      let coverSet = false;
      for (const imgUrl of parsed.imageUrls.slice(0, 15)) {
        const filename = await downloadAndSaveImage(imgUrl, recipe.id);
        if (filename) {
          const imageRecord = await saveImageRecord(recipe.id, filename);
          if (!coverSet) {
            coverSet = true;
            await prisma.recipe.update({ where: { id: recipe.id }, data: { coverImageId: imageRecord.id } });
          }
        }
      }
    });
  }

  return recipe;
}

export async function handleCapture(url: string, userId: string, res: Response): Promise<void> {
  const recipe = await captureAndCreateRecipe(url, userId);
  res.status(201).json({ recipeId: recipe.id });
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
