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

// Street Kitchen embeds JSON-LD inside a @graph array; the Recipe node carries
// times/category/description but no ingredients or instructions — those only
// exist in the rendered HTML.
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

const NUMERIC_PREFIX = /^([\d.,/¼½¾⅓⅔⅛⅜⅝⅞]+)(.*)/;

const parser: Parser = {
  domain: 'streetkitchen.hu',
  async parse(html: string, url: string): Promise<ParsedRecipe> {
    const $ = cheerio.load(html);
    const jsonLd = extractRecipeFromJsonLd($);

    // The h1 is split into word-per-span elements, so join them with spaces
    const h1Title = $('h1 .splitted-text').map((_, el) => $(el).text().trim()).get().join(' ');
    const title =
      (jsonLd['name'] as string | undefined)?.replace(/\s*\|\s*Street Kitchen\s*$/i, '').trim() ||
      h1Title ||
      $('h1').first().text().trim() ||
      'Untitled Recipe';

    const cookTime = parseDuration(jsonLd['cookTime'] as string | undefined);
    const totalTime = parseDuration(jsonLd['totalTime'] as string | undefined);
    const prepTime =
      totalTime && cookTime && totalTime > cookTime ? totalTime - cookTime : undefined;

    const notes = (jsonLd['description'] as string | undefined)?.trim() || undefined;

    const recipeYield = jsonLd['recipeYield'];
    const servings =
      typeof recipeYield === 'number'
        ? recipeYield
        : typeof recipeYield === 'string'
          ? parseInt(recipeYield, 10) || undefined
          : undefined;

    // Ingredient rows: <div><input type=checkbox/><div><div>150 g</div><div class=font-bold>tejföl</div></div></div>
    // The list is rendered twice (visible page + hidden print block) with the
    // same checkbox ids, so dedupe rows by id.
    const ingredients: Ingredient[] = [];
    const seenIds = new Set<string>();
    $('input[type="checkbox"]').each((_, input) => {
      const inputId = $(input).attr('id');
      if (inputId) {
        if (seenIds.has(inputId)) return;
        seenIds.add(inputId);
      }
      const row = $(input).parent();
      const name = row.find('div.font-bold').first().text().trim();
      if (!name) return;
      const amountUnitRaw = row.find('div.font-bold').first().prev('div').text().trim();
      const parts = amountUnitRaw.split(/\s+/).filter(Boolean);
      const m = NUMERIC_PREFIX.exec(parts[0] ?? '');
      const amount = m ? m[1] : '';
      const unit = m ? (m[2] || parts.slice(1).join(' ')) : parts.join(' ');
      ingredients.push({ amount, unit, name });
    });

    const instructions: Instruction[] = $('#Streetk_content_preparation_wrapper ol li')
      .map((_, li) => $(li).text().replace(/\s+/g, ' ').trim())
      .get()
      .filter(Boolean)
      .map((text, i) => ({ step: i + 1, text }));

    // Cover from og:image, further shots from the article body (other CDN images
    // on the page are teasers for unrelated recipes)
    const imageUrls: string[] = [];
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) imageUrls.push(ogImage);
    $('article.recipe-article img').each((_, img) => {
      const src = $(img).attr('src');
      if (src && src.includes('streetkitchen-cdn') && !imageUrls.includes(src)) {
        imageUrls.push(src);
      }
    });

    const tags: string[] = [];
    const addTag = (raw: string) => {
      const name = raw.trim().toLowerCase();
      if (name && !tags.includes(name)) tags.push(name);
    };
    $('a[href^="/cimkek/"]').each((_, a) => addTag($(a).text()));
    ((jsonLd['recipeCategory'] as string | undefined) ?? '').split(',').forEach(addTag);

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
