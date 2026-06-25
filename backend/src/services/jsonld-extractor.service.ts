import * as cheerio from 'cheerio';
import type { ParsedRecipe, Ingredient, Instruction } from '../types/index.js';

interface JsonLdRecipe {
  '@type'?: string | string[];
  name?: string;
  recipeIngredient?: string[];
  recipeInstructions?: Array<{ '@type'?: string; text?: string } | string> | string;
  prepTime?: string;
  cookTime?: string;
  recipeYield?: string | number;
  image?: string | Array<string | { url: string }> | { url: string };
  description?: string;
}

function parseDuration(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return undefined;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  return hours * 60 + minutes || undefined;
}

function extractImages(image: JsonLdRecipe['image']): string[] {
  if (!image) return [];
  if (typeof image === 'string') return [image];
  if (Array.isArray(image)) return image.map(i => typeof i === 'string' ? i : i.url).filter(Boolean);
  if (typeof image === 'object' && 'url' in image) return [image.url];
  return [];
}

function parseIngredients(raw: string[] = []): Ingredient[] {
  return raw.map(text => ({ amount: '', unit: '', name: text.trim() }));
}

function parseInstructions(raw: JsonLdRecipe['recipeInstructions']): Instruction[] {
  if (!raw) return [];
  if (typeof raw === 'string') {
    return raw.split('\n').filter(Boolean).map((text, i) => ({ step: i + 1, text: text.trim() }));
  }
  if (Array.isArray(raw)) {
    return raw.map((item, i) => ({
      step: i + 1,
      text: typeof item === 'string' ? item.trim() : (item.text || '').trim(),
    })).filter(i => i.text);
  }
  return [];
}

function findRecipeInGraph(data: unknown): JsonLdRecipe | null {
  if (!data || typeof data !== 'object') return null;
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeInGraph(item);
      if (found) return found;
    }
    return null;
  }
  const obj = data as Record<string, unknown>;
  const type = obj['@type'];
  if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) {
    return obj as JsonLdRecipe;
  }
  if (obj['@graph']) {
    return findRecipeInGraph(obj['@graph']);
  }
  return null;
}

export function extractRecipeFromJsonLd(html: string, url: string): ParsedRecipe | null {
  const $ = cheerio.load(html);
  const scripts = $('script[type="application/ld+json"]');

  for (let i = 0; i < scripts.length; i++) {
    try {
      const raw = $(scripts[i]).html();
      if (!raw) continue;
      const json: unknown = JSON.parse(raw);
      const recipe = findRecipeInGraph(json);
      if (!recipe) continue;

      return {
        title: recipe.name || 'Untitled Recipe',
        sourceUrl: url,
        ingredients: parseIngredients(recipe.recipeIngredient),
        instructions: parseInstructions(recipe.recipeInstructions),
        prepTime: parseDuration(recipe.prepTime),
        cookTime: parseDuration(recipe.cookTime),
        servings: typeof recipe.recipeYield === 'number' ? recipe.recipeYield : undefined,
        notes: recipe.description,
        imageUrls: extractImages(recipe.image),
        isFallback: false,
      };
    } catch {
      continue;
    }
  }

  return null;
}
