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

export interface FetchedPage {
  /** The validated URL that was actually requested. */
  url: string;
  /** The page source, or null when it could not be fetched. */
  html: string | null;
}

/**
 * Fetches a page behind the SSRF guard and the configured timeout/size caps.
 * Every capture path — the parsers and the AI one — goes through here, so the
 * guard can never be bypassed by adding a new caller.
 *
 * Throws when the URL itself is unusable (malformed, non-http, private target);
 * a failed fetch is reported as `html: null` instead, because the caller may
 * still have something useful to do with the URL.
 */
export async function fetchPage(rawUrl: string): Promise<FetchedPage> {
  const validatedUrl = await validateUrl(rawUrl);
  const urlString = validatedUrl.toString();

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
    const html = response.data as string;
    return { url: urlString, html: html || null };
  } catch {
    return { url: urlString, html: null };
  }
}

/**
 * Runs the parser chain over already-fetched HTML: site parser, then JSON-LD,
 * then the title-and-images fallback.
 */
export async function parseHtml(html: string, url: string): Promise<ParsedRecipe> {
  const domain = new URL(url).hostname.replace(/^www\./, '');

  // Try site-specific parser first
  const siteParser = getParser(domain);
  if (siteParser) {
    try {
      return await siteParser.parse(html, url);
    } catch {
      // fall through to JSON-LD
    }
  }

  // Try JSON-LD extraction
  const jsonLdResult = extractRecipeFromJsonLd(html, url);
  if (jsonLdResult) return jsonLdResult;

  // Fallback
  return extractFallbackContent(html, url);
}

export async function captureUrl(rawUrl: string): Promise<ParsedRecipe> {
  const page = await fetchPage(rawUrl);

  if (!page.html) {
    return { ...extractFallbackContent('', page.url), notes: "Couldn't fetch this page." };
  }

  return parseHtml(page.html, page.url);
}
