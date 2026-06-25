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

// Splits a token like "80g" into ["80", "g"] or "2" into ["2", ""].
// Returns ["", ""] if the token doesn't start with a digit or fraction.
const NUMERIC_PREFIX = /^([\d.,/¼½¾⅓⅔⅛⅜⅝⅞]+)(.*)/;
function splitAmountUnit(token: string): [string, string] {
  const m = NUMERIC_PREFIX.exec(token);
  return m ? [m[1], m[2]] : ['', ''];
}

// Parses "80g Liszt", "2 db Alma", "1 teáskanál Fahéj" → Ingredient
function parseIngredientString(str: string): Ingredient {
  const tokens = str.trim().split(/\s+/);
  const [amount, fusedUnit] = splitAmountUnit(tokens[0] ?? '');
  if (!amount) return { amount: '', unit: '', name: str.trim() };
  const rest = tokens.slice(1);
  if (fusedUnit) return { amount, unit: fusedUnit, name: rest.join(' ') };
  if (rest.length >= 2) return { amount, unit: rest[0], name: rest.slice(1).join(' ') };
  return { amount, unit: '', name: rest[0] ?? '' };
}

function parseIngredientsFromJsonLd(raw: string[]): Ingredient[] {
  return raw.map(parseIngredientString);
}

const parser: Parser = {
  domain: 'nosalty.hu',
  async parse(html: string, url: string): Promise<ParsedRecipe> {
    const $ = cheerio.load(html);

    let jsonLd: Record<string, unknown> = {};
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() ?? '') as Record<string, unknown>;
        if (data['@type'] === 'Recipe') jsonLd = data;
      } catch { /* skip */ }
    });

    const title =
      (jsonLd['name'] as string | undefined)?.trim() ||
      $('h1').first().text().trim() ||
      'Untitled Recipe';

    const prepTime = parseDuration(jsonLd['prepTime'] as string | undefined);
    const cookTime = parseDuration(jsonLd['cookTime'] as string | undefined);
    const notes = (jsonLd['description'] as string | undefined)?.trim() || undefined;
    const servings =
      typeof jsonLd['recipeYield'] === 'number'
        ? (jsonLd['recipeYield'] as number)
        : undefined;

    const rawImages = jsonLd['image'] as Array<{ url: string } | string> | undefined;
    const imageUrls = (rawImages ?? [])
      .map((img) => (typeof img === 'string' ? img : img.url))
      .filter(Boolean);

    // Ingredients from HTML — only select from lists with the "-nutrition" class
    // to avoid picking up unrelated list items (e.g. "Friss receptek" at page bottom)
    const ingredients: Ingredient[] = [];
    $('ul[class~="-nutrition"] li.m-list__item').each((_, li) => {
      const $li = $(li);
      const name = $li.find('a').first().text().trim();
      if (!name) return;
      const amountUnitRaw = $li.find('span').first().text().trim();
      const parts = amountUnitRaw.split(/\s+/);
      const [amount, fusedUnit] = splitAmountUnit(parts[0] ?? '');
      const unit = fusedUnit || parts.slice(1).join(' ');
      ingredients.push({ amount, unit, name });
    });

    // Fall back to JSON-LD strings if HTML yielded nothing
    if (ingredients.length === 0) {
      const raw = jsonLd['recipeIngredient'] as string[] | undefined;
      ingredients.push(...parseIngredientsFromJsonLd(raw ?? []));
    }

    const rawInstructions = jsonLd['recipeInstructions'] as
      | Array<string | { text: string }>
      | undefined;
    const instructions: Instruction[] = (rawInstructions ?? [])
      .map((item) => (typeof item === 'string' ? item : item.text))
      .filter(Boolean)
      .map((text, i) => ({ step: i + 1, text: text.trim() }));

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
      isFallback: false,
    };
  },
};

export default parser;
