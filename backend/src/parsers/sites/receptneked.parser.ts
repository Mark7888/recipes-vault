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

// Ingredients are plain free-text strings (e.g. "30 dkg zöldborsó", "1 citrom leve") with
// no structured amount/unit markup, so split heuristically like the JSON-LD-based parsers do.
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

const parser: Parser = {
  domain: 'receptneked.hu',
  async parse(html: string, url: string): Promise<ParsedRecipe> {
    const $ = cheerio.load(html);

    const title =
      $('#recipe-title').first().text().trim() ||
      $('h1').first().text().trim() ||
      'Untitled Recipe';

    const ingredients: Ingredient[] = $('[itemprop="recipeIngredient"]')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean)
      .map(parseIngredientString);

    // The story block mixes instruction <p>s with a leading "Elkészítése:" label and
    // trailing video/social embeds; children('p') already excludes the non-<p> extras.
    const instructions: Instruction[] = $('#recipe-story')
      .children('p')
      .map((_, p) => $(p).text().trim())
      .get()
      .filter((text) => text && !/^Elkészítése:?$/i.test(text))
      .map((text, i) => ({ step: i + 1, text }));

    const prepTime = parseDuration($('time[itemprop="prepTime"]').attr('datetime'));

    const yieldText = $('[itemprop="recipeYield"]').first().text();
    const servingsMatch = yieldText.match(/\d+/);
    const servings = servingsMatch ? parseInt(servingsMatch[0], 10) : undefined;

    const imageUrls: string[] = [];
    const coverImage = $('img[itemprop="image"]').first().attr('src');
    if (coverImage) imageUrls.push(coverImage);
    $('.gallery-slides img').each((_, img) => {
      const src = $(img).attr('src');
      if (src && !imageUrls.includes(src)) imageUrls.push(src);
    });

    const tags: string[] = [];
    $('[itemprop="recipeCategory"] a').each((_, a) => {
      const name = $(a).text().trim().toLowerCase();
      if (name && !tags.includes(name)) tags.push(name);
    });

    return {
      title,
      sourceUrl: url,
      ingredients,
      instructions,
      prepTime,
      servings,
      imageUrls,
      tags,
      isFallback: false,
    };
  },
};

export default parser;
