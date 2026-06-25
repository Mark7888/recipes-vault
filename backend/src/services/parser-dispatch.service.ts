import axios from 'axios';
import * as cheerio from 'cheerio';
import { validateUrl } from '../utils/ssrf-guard.js';
import { getParser } from '../parsers/registry.js';
import { extractRecipeFromJsonLd } from './jsonld-extractor.service.js';
import { env } from '../config/env.js';
import type { ParsedRecipe } from '../types/index.js';

function extractFallbackContent(html: string, url: string): ParsedRecipe {
  const $ = cheerio.load(html);
  const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled Recipe';

  // Extract up to 15 largest qualifying images
  const imageUrls: string[] = [];
  $('img').each((_i, el) => {
    if (imageUrls.length >= 15) return;
    const src = $(el).attr('src');
    const width = parseInt($(el).attr('width') || '0', 10);
    const height = parseInt($(el).attr('height') || '0', 10);
    if (src && (width === 0 || width >= 100) && (height === 0 || height >= 100)) {
      try {
        const absoluteUrl = new URL(src, url).toString();
        imageUrls.push(absoluteUrl);
      } catch {
        // skip invalid URLs
      }
    }
  });

  return {
    title,
    sourceUrl: url,
    ingredients: [],
    instructions: [],
    imageUrls,
    isFallback: true,
  };
}

export async function captureUrl(rawUrl: string): Promise<ParsedRecipe> {
  const validatedUrl = await validateUrl(rawUrl);
  const urlString = validatedUrl.toString();
  const domain = validatedUrl.hostname.replace(/^www\./, '');

  let html: string;
  let fetchFailed = false;

  try {
    const response = await axios.get(urlString, {
      timeout: env.FETCH_TIMEOUT_MS,
      maxContentLength: env.FETCH_MAX_BYTES,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'RecipeVault/1.0 (+https://github.com/recipevault)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    html = response.data as string;
  } catch {
    fetchFailed = true;
    html = '';
  }

  if (fetchFailed || !html) {
    return { ...extractFallbackContent('', urlString), notes: "Couldn't fetch this page." };
  }

  // Try site-specific parser first
  const siteParser = getParser(domain);
  if (siteParser) {
    try {
      return await siteParser.parse(html, urlString);
    } catch {
      // fall through to JSON-LD
    }
  }

  // Try JSON-LD extraction
  const jsonLdResult = extractRecipeFromJsonLd(html, urlString);
  if (jsonLdResult) return jsonLdResult;

  // Fallback
  return extractFallbackContent(html, urlString);
}
