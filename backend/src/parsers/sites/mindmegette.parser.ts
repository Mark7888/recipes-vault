import * as cheerio from 'cheerio';
import type { Parser } from '../types.js';
import type { ParsedRecipe, Ingredient, Instruction } from '../../types/index.js';

function parseDuration(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return undefined;
  const total = parseInt(match[1] || '0', 10) * 60 + parseInt(match[2] || '0', 10);
  return total > 0 ? total : undefined;
}

const NUMERIC_PREFIX = /^([\d.,/¼½¾⅓⅔⅛⅜⅝⅞]+)(.*)/;
function splitAmountUnit(token: string): [string, string] {
  const m = NUMERIC_PREFIX.exec(token);
  return m ? [m[1], m[2]] : ['', ''];
}

function parseIngredientString(str: string): Ingredient {
  const tokens = str.trim().split(/\s+/);
  const [amount, fusedUnit] = splitAmountUnit(tokens[0] ?? '');
  if (!amount) return { amount: '', unit: '', name: str.trim() };
  const rest = tokens.slice(1);
  if (fusedUnit) return { amount, unit: fusedUnit, name: rest.join(' ') };
  if (rest.length >= 2) return { amount, unit: rest[0], name: rest.slice(1).join(' ') };
  return { amount, unit: '', name: rest[0] ?? '' };
}

// Mindmegette embeds JSON-LD inside a @graph array, so we need to find the Recipe node within it.
function extractRecipeFromJsonLd($: cheerio.CheerioAPI): Record<string, unknown> {
  let recipe: Record<string, unknown> = {};
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? '') as Record<string, unknown>;
      if (data['@type'] === 'Recipe') {
        recipe = data;
        return false;
      }
      const graph = data['@graph'];
      if (Array.isArray(graph)) {
        const node = graph.find((item) => (item as Record<string, unknown>)['@type'] === 'Recipe');
        if (node) {
          recipe = node as Record<string, unknown>;
          return false;
        }
      }
    } catch { /* skip */ }
  });
  return recipe;
}

const parser: Parser = {
  domain: 'mindmegette.hu',
  async parse(html: string, url: string): Promise<ParsedRecipe> {
    const $ = cheerio.load(html);
    const jsonLd = extractRecipeFromJsonLd($);

    const title =
      (jsonLd['name'] as string | undefined)?.trim() ||
      $('h1').first().text().trim() ||
      'Untitled Recipe';

    const prepTime = parseDuration(jsonLd['prepTime'] as string | undefined);
    const cookTime = parseDuration(jsonLd['cookTime'] as string | undefined);
    const notes = (jsonLd['description'] as string | undefined)?.trim() || undefined;

    const recipeYield = jsonLd['recipeYield'];
    const servings =
      typeof recipeYield === 'number'
        ? recipeYield
        : typeof recipeYield === 'string'
          ? parseInt(recipeYield, 10) || undefined
          : undefined;

    const rawImage = jsonLd['image'];
    const imageUrls: string[] = Array.isArray(rawImage)
      ? (rawImage as Array<string | { url: string }>).map((img) =>
          typeof img === 'string' ? img : img.url,
        ).filter(Boolean)
      : typeof rawImage === 'string'
        ? [rawImage]
        : [];

    const raw = jsonLd['recipeIngredient'] as string[] | undefined;
    const ingredients: Ingredient[] = (raw ?? []).map(parseIngredientString);

    const rawInstructions = jsonLd['recipeInstructions'] as
      | Array<string | { text: string }>
      | undefined;
    const instructions: Instruction[] = (rawInstructions ?? [])
      .map((item) => (typeof item === 'string' ? item : item.text))
      .filter(Boolean)
      .map((text, i) => ({ step: i + 1, text: text.trim() }));

    // Tags appear twice (mobile + desktop widget), so dedupe by name. Top-level
    // /receptkategoria/<category> links are generic section names ("alkalom",
    // "allergének", …) — only /cimke/… tags and category leaves are real tags.
    const tags: string[] = [];
    $('a.tag').each((_, a) => {
      const href = $(a).attr('href') ?? '';
      const name = $(a).text().trim().toLowerCase();
      if (!name) return;
      const segments = href.split('/').filter(Boolean);
      if (segments[0] === 'receptkategoria' && segments.length < 3) return;
      if (!tags.includes(name)) tags.push(name);
    });

    return {
      title,
      sourceUrl: url,
      ingredients,
      instructions,
      prepTime,
      cookTime,
      servings,
      notes,
      imageUrls,
      tags,
      isFallback: false,
    };
  },
};

export default parser;
