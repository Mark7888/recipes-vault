import * as cheerio from 'cheerio';
import type { Parser } from '../types.js';
import type { ParsedRecipe, Ingredient, Instruction } from '../../types/index.js';

// Ingredient rows are pre-split by Cookpad into <bdi>amount unit</bdi> <span>name</span>,
// e.g. "400 g" / "1 közepes fej" / "" (amount-less ingredients like salt have empty bdi).
const NUMERIC_PREFIX = /^[\d.,/¼½¾⅓⅔⅛⅜⅝⅞]+$/;
function splitAmountUnit(bdiText: string): [string, string] {
  const tokens = bdiText.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || !NUMERIC_PREFIX.test(tokens[0])) return ['', ''];
  return [tokens[0], tokens.slice(1).join(' ')];
}

const parser: Parser = {
  domain: 'cookpad.com',
  async parse(html: string, url: string): Promise<ParsedRecipe> {
    const $ = cheerio.load(html);

    const title = $('h1').first().text().trim() || 'Untitled Recipe';

    const ingredients: Ingredient[] = [];
    $('#ingredients li').each((_, li) => {
      const $li = $(li);
      const name = $li.find('span').first().text().trim();
      if (!name) return;
      const [amount, unit] = splitAmountUnit($li.find('bdi').first().text());
      ingredients.push({ amount, unit, name });
    });

    const instructions: Instruction[] = $('#steps li[id^="step_"]')
      .map((_, li) => $(li).find('p').first().text().trim())
      .get()
      .filter(Boolean)
      .map((text, i) => ({ step: i + 1, text }));

    const servingsText = $('[id^="serving_recipe_"] .mise-icon-text').first().text();
    const servings = servingsText ? parseInt(servingsText, 10) || undefined : undefined;

    const cookTimeText = $('[id^="cooking_time_recipe_"] .mise-icon-text').first().text();
    const cookTime = cookTimeText ? parseInt(cookTimeText, 10) || undefined : undefined;

    const notes =
      $('[data-collapse-text-target="content"] p').first().text().trim() || undefined;

    const imageUrls: string[] = [];
    const coverImage = $('#recipe_image img').first().attr('src');
    if (coverImage) imageUrls.push(coverImage);
    $('#steps img').each((_, img) => {
      const src = $(img).attr('src');
      if (src && !imageUrls.includes(src)) imageUrls.push(src);
    });

    // "Kulcsszavak" (keywords) section, identified by its section-show-logger name
    // rather than the generic surrounding classes, which are shared by every section.
    const tags: string[] = [];
    $('section[data-recipe-section-show-logger-section-name-value="related_keywords"] a').each(
      (_, a) => {
        const name = $(a).text().trim().toLowerCase();
        if (name && !tags.includes(name)) tags.push(name);
      },
    );

    return {
      title,
      sourceUrl: url,
      ingredients,
      instructions,
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
