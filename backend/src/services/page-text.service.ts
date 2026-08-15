import * as cheerio from 'cheerio';

/**
 * Reduces a recipe page to the plain text a model can work from: the main
 * content of the body, without the chrome (navigation, header, footer, cookie
 * banners, comment threads) and without the markup.
 *
 * This is deliberately crude — the extraction prompt is told the text is a
 * rough dump and to ignore what is not part of the recipe. Its real job is to
 * keep the prompt small enough to stay cheap and inside the context window.
 */

/** Elements that never carry recipe content, dropped before anything else. */
const NOISE_SELECTORS = [
  'script', 'style', 'noscript', 'template', 'svg', 'iframe', 'object', 'embed',
  'form', 'input', 'select', 'button', 'nav', 'header', 'footer', 'aside',
  '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]', '[role="search"]',
  '[aria-hidden="true"]', '[hidden]',
  '#comments', '.comments', '.comment-list', '.breadcrumb', '.breadcrumbs',
  '.cookie', '.cookie-banner', '.newsletter', '.subscribe', '.social', '.share',
  '.advert', '.advertisement', '.ads', '.ad-container', '.related-posts', '.sidebar',
].join(', ');

/**
 * Where the recipe usually lives, best candidate first. A candidate only wins
 * when it holds a plausible amount of text — plenty of sites wrap a nearly
 * empty `<main>` around the real content.
 */
const CONTENT_SELECTORS = [
  '[itemtype*="Recipe"]',
  'article',
  'main',
  '[role="main"]',
  '#content',
  '.recipe',
  '.post-content',
  '.entry-content',
];

const MIN_CONTENT_CHARS = 400;

/** Block-level tags whose boundaries should survive as line breaks. */
const BLOCK_SELECTORS =
  'p, div, section, article, li, tr, td, th, dt, dd, h1, h2, h3, h4, h5, h6, br, figcaption, blockquote, pre';

export interface PageText {
  /** The page's own title, handy context the body text often lacks. */
  title: string;
  /** The readable body text, newline-separated by block boundaries. */
  text: string;
}

function normalize(raw: string): string {
  return raw
    .replace(/\r/g, '')
    .replace(/[\t\u00a0\u200b]/g, ' ')
    .split('\n')
    .map((line) => line.replace(/ {2,}/g, ' ').trim())
    // Blank lines are pure cost here: nesting produces runs of them, and one
    // line per block is all the structure the model needs.
    .filter((line) => line.length > 0)
    .join('\n')
    .trim();
}

/**
 * @param maxChars Hard cap on the returned text; the tail is dropped, since a
 *   recipe page puts its ingredients and steps well before its footer.
 */
export function extractPageText(html: string, maxChars: number): PageText {
  const $ = cheerio.load(html);
  const title = $('title').first().text().trim() || $('h1').first().text().trim();

  $(NOISE_SELECTORS).remove();

  // Block boundaries are the only structure worth keeping: without them
  // `.text()` runs an ingredient list together into one unreadable line.
  $(BLOCK_SELECTORS).each((_i, el) => {
    $(el).before('\n').after('\n');
  });

  let best = '';
  for (const selector of CONTENT_SELECTORS) {
    const candidate = normalize($(selector).first().text());
    if (candidate.length >= MIN_CONTENT_CHARS) {
      best = candidate;
      break;
    }
    if (candidate.length > best.length) best = candidate;
  }

  const bodyText = normalize($('body').text());
  // The body is the safety net: a candidate that found almost nothing is worse
  // than the whole page, noise included.
  const text = best.length >= MIN_CONTENT_CHARS ? best : bodyText || best;

  return { title, text: text.slice(0, maxChars) };
}
