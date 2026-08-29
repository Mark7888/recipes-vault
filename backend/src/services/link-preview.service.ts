import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { ingredientsOf, stepsOf } from '../utils/sections.js';
import type { IngredientEntry, InstructionEntry } from '../types/index.js';

/**
 * Link previews (Open Graph / Twitter cards).
 *
 * Messengers and social sites fetch a shared URL with their own crawler and
 * read the `<head>` — none of them run JavaScript. The SPA shell has nothing
 * in it but the app title, so a pasted recipe link unfurls as a blank card.
 * These helpers serve that same shell with the page's own meta tags already
 * baked into the HTML, which is all a crawler ever needed.
 */

const SITE_NAME = 'RecipeVault';
const APP_TAGLINE = 'Save, organize and share your recipes.';
const FALLBACK_IMAGE = { pathname: '/pwa-512x512.png', width: 512, height: 512 };

export interface PreviewImage {
  url: string;
  width?: number;
  height?: number;
  alt: string;
}

export interface LinkPreview {
  title: string;
  description: string;
  /** Absolute, or absent when the public origin can't be determined. */
  url?: string;
  image?: PreviewImage;
  type: 'website' | 'article';
  /** Share links are secret URLs — keep search engines out of them. */
  noindex?: boolean;
}

/** Only the recipe fields a preview is built from. */
export interface PreviewableRecipe {
  title: string;
  notes: string | null;
  ingredients: unknown;
  instructions: unknown;
  prepTime: number | null;
  cookTime: number | null;
  servings: number | null;
  coverImageId: string | null;
  images: { id: string; filePath: string }[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function collapse(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  // Proxies chain these as "value, value" when a request crosses several hops.
  return raw?.split(',')[0]?.trim() || undefined;
}

const HOST_PATTERN = /^[A-Za-z0-9.-]+(:\d{1,5})?$/;

/**
 * The origin a crawler has to be handed, since og:url and og:image only work
 * absolute. PUBLIC_BASE_URL wins when set; otherwise it comes off the proxy
 * headers, and a Host that doesn't look like a host is dropped rather than
 * echoed into someone else's preview.
 */
export function publicOrigin(req: Request): string | undefined {
  if (env.PUBLIC_BASE_URL) return env.PUBLIC_BASE_URL.replace(/\/+$/, '');

  const host = firstHeader(req.headers['x-forwarded-host']) ?? req.headers.host;
  if (!host || !HOST_PATTERN.test(host)) return undefined;

  const forwardedProto = firstHeader(req.headers['x-forwarded-proto']);
  const proto = forwardedProto === 'https' || forwardedProto === 'http' ? forwardedProto : req.protocol;
  return `${proto}://${host}`;
}

function absoluteUrl(origin: string | undefined, pathname: string): string | undefined {
  return origin ? `${origin}${pathname}` : undefined;
}

/** Image headers only — sharp reads the dimensions without decoding the file. */
async function imageDimensions(filePath: string): Promise<{ width?: number; height?: number }> {
  try {
    const { width, height } = await sharp(path.join(env.IMAGES_DIR, path.basename(filePath))).metadata();
    if (width && height) return { width, height };
  } catch {
    // A card without dimensions still renders; only some clients use them.
  }
  return {};
}

function recipeDescription(recipe: PreviewableRecipe): string {
  const notes = collapse(recipe.notes);
  if (notes) return truncate(notes, 200);

  const ingredients = Array.isArray(recipe.ingredients) ? (recipe.ingredients as IngredientEntry[]) : [];
  const instructions = Array.isArray(recipe.instructions) ? (recipe.instructions as InstructionEntry[]) : [];
  const ingredientCount = ingredientsOf(ingredients).length;
  const stepCount = stepsOf(instructions).length;

  const facts = [
    ingredientCount > 0 ? `${ingredientCount} ingredient${ingredientCount === 1 ? '' : 's'}` : null,
    stepCount > 0 ? `${stepCount} step${stepCount === 1 ? '' : 's'}` : null,
    recipe.prepTime ? `${recipe.prepTime} min prep` : null,
    recipe.cookTime ? `${recipe.cookTime} min cook` : null,
    recipe.servings ? `Serves ${recipe.servings}` : null,
  ].filter((fact): fact is string => fact !== null);

  return facts.length > 0 ? facts.join(' · ') : `A recipe shared from ${SITE_NAME}.`;
}

/** The same picture the recipe page leads with: the cover, else the first image. */
async function recipeImage(recipe: PreviewableRecipe, origin: string | undefined): Promise<PreviewImage | undefined> {
  const hero = recipe.images.find((img) => img.id === recipe.coverImageId) ?? recipe.images[0];
  const alt = collapse(recipe.title) || SITE_NAME;

  if (!hero) return fallbackImage(origin, alt);
  const url = absoluteUrl(origin, `/images/${encodeURIComponent(hero.filePath)}`);
  if (!url) return undefined;
  return { url, alt, ...(await imageDimensions(hero.filePath)) };
}

function fallbackImage(origin: string | undefined, alt: string): PreviewImage | undefined {
  const url = absoluteUrl(origin, FALLBACK_IMAGE.pathname);
  if (!url) return undefined;
  return { url, alt, width: FALLBACK_IMAGE.width, height: FALLBACK_IMAGE.height };
}

/** What every page that isn't a shared recipe unfurls as. */
export function appPreview(req: Request): LinkPreview {
  const origin = publicOrigin(req);
  return {
    title: SITE_NAME,
    description: APP_TAGLINE,
    url: absoluteUrl(origin, req.path),
    image: fallbackImage(origin, SITE_NAME),
    type: 'website',
  };
}

export async function sharedRecipePreview(
  recipe: PreviewableRecipe,
  token: string,
  req: Request,
): Promise<LinkPreview> {
  const origin = publicOrigin(req);
  return {
    title: collapse(recipe.title) || 'Recipe',
    description: recipeDescription(recipe),
    url: absoluteUrl(origin, `/shared/${encodeURIComponent(token)}`),
    image: await recipeImage(recipe, origin),
    type: 'article',
    noindex: true,
  };
}

/** A small image (the app icon standing in for a recipe with no photo) only
 *  earns the big card treatment once it is wide enough for one. */
function twitterCard(image: PreviewImage | undefined): string {
  if (!image) return 'summary';
  return image.width !== undefined && image.width < 600 ? 'summary' : 'summary_large_image';
}

function metaTags(preview: LinkPreview): string {
  const tags: [string, string, string][] = [
    ['name', 'description', preview.description],
    ['property', 'og:site_name', SITE_NAME],
    ['property', 'og:type', preview.type],
    ['property', 'og:title', preview.title],
    ['property', 'og:description', preview.description],
    ['name', 'twitter:card', twitterCard(preview.image)],
    ['name', 'twitter:title', preview.title],
    ['name', 'twitter:description', preview.description],
  ];

  if (preview.url) tags.push(['property', 'og:url', preview.url]);
  if (preview.image) {
    tags.push(['property', 'og:image', preview.image.url]);
    tags.push(['property', 'og:image:alt', preview.image.alt]);
    tags.push(['name', 'twitter:image', preview.image.url]);
    tags.push(['name', 'twitter:image:alt', preview.image.alt]);
    if (preview.image.width) tags.push(['property', 'og:image:width', String(preview.image.width)]);
    if (preview.image.height) tags.push(['property', 'og:image:height', String(preview.image.height)]);
  }
  if (preview.noindex) tags.push(['name', 'robots', 'noindex']);

  return tags
    .map(([attr, key, value]) => `    <meta ${attr}="${key}" content="${escapeHtml(value)}" />`)
    .join('\n');
}

export function injectPreview(html: string, preview: LinkPreview): string {
  const withTitle = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(preview.title)}</title>`);
  const closingHead = /[ \t]*<\/head>/i;
  return closingHead.test(withTitle)
    ? withTitle.replace(closingHead, `${metaTags(preview)}\n  </head>`)
    : `${metaTags(preview)}\n${withTitle}`;
}

// The built shell never changes while the process runs, so it is read once.
let cachedShell: { path: string; html: string } | null = null;

async function readShell(publicDir: string): Promise<string> {
  const indexPath = path.join(publicDir, 'index.html');
  if (cachedShell?.path === indexPath) return cachedShell.html;
  const html = await fs.readFile(indexPath, 'utf8');
  cachedShell = { path: indexPath, html };
  return html;
}

/** Serves the SPA shell with `preview` baked into its `<head>`. */
export async function sendAppHtml(
  res: Response,
  publicDir: string,
  preview: LinkPreview,
): Promise<void> {
  const html = injectPreview(await readShell(publicDir), preview);
  res.setHeader('Cache-Control', 'no-cache');
  res.type('html').send(html);
}
