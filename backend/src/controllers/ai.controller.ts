import type { Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { AiError, aiErrors } from '../services/ai/ai-errors.js';
import { continueChat, extractRecipe, extractRecipeFromPage } from '../services/ai/recipe-assistant.service.js';
import { getAiModel, isAiConfigured, type ChatMessage } from '../services/ai/openrouter.service.js';
import { createRecipe, getRecipeById, setRecipeTags, updateRecipe } from '../services/recipes.service.js';
import { findOrCreateTags } from '../services/tags.service.js';
import { fetchPage, parseHtml } from '../services/parser-dispatch.service.js';
import { extractPageText } from '../services/page-text.service.js';
import { downloadImagesInBackground } from '../services/image-storage.service.js';
import { createRateLimiter } from '../utils/rate-limit.js';
import type { AuthenticatedRequest } from '../types/index.js';

// The conversation lives in the browser and is replayed on every turn, so these
// caps are what keep a single request (and its token bill) bounded.
const MAX_MESSAGES = 40;
const MAX_CONTENT_CHARS = 8000;
const MAX_IMAGES_PER_MESSAGE = 4;
const MAX_IMAGES_TOTAL = 6;
const MAX_IMAGE_CHARS = 1_200_000; // ≈ 900 KB of image data once decoded

const dataUrlSchema = z
  .string()
  .max(MAX_IMAGE_CHARS, 'One of the images is too large. Please attach a smaller screenshot.')
  .regex(/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/]+={0,2}$/, 'Unsupported image format.');

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(MAX_CONTENT_CHARS),
  images: z.array(dataUrlSchema).max(MAX_IMAGES_PER_MESSAGE).optional(),
});

const conversationSchema = z.object({
  messages: z.array(messageSchema).min(1).max(MAX_MESSAGES),
});

// Below this there is nothing on the page worth spending a request on — the
// page needs JavaScript, or a login, or simply is not a recipe.
const MIN_PAGE_CHARS = 200;

const captureSchema = z.object({
  url: z.string().url('That does not look like a valid URL.').max(2048),
  /**
   * Set when the AI is re-parsing a page the site parsers already captured:
   * the result then replaces that recipe instead of leaving a half-empty
   * duplicate behind. Must belong to the caller.
   */
  recipeId: z.string().uuid().optional(),
});

const rateLimiter = createRateLimiter(env.AI_RATE_LIMIT_PER_MINUTE, 60_000);

function sendAiError(res: Response, err: unknown): void {
  if (err instanceof AiError) {
    res.status(err.status).json(err.toResponseBody());
    return;
  }
  logger.error({ err }, 'Unexpected AI failure');
  const fallback = aiErrors.badResponse((err as Error)?.message);
  res.status(fallback.status).json(fallback.toResponseBody());
}

/**
 * Validates the replayed conversation. Assistant turns never carry images, and
 * a turn with neither text nor an image is nothing to answer.
 */
function readConversation(body: unknown): ChatMessage[] {
  const parsed = conversationSchema.safeParse(body);
  if (!parsed.success) {
    throw aiErrors.invalidRequest(parsed.error.issues[0]?.message ?? 'Invalid conversation.');
  }

  const messages = parsed.data.messages;
  const totalImages = messages.reduce((sum, m) => sum + (m.images?.length ?? 0), 0);
  if (totalImages > MAX_IMAGES_TOTAL) {
    throw aiErrors.invalidRequest(
      `This chat has too many images (max ${MAX_IMAGES_TOTAL}). Start a new chat to attach more.`
    );
  }

  return messages.map((message) => {
    const images = message.role === 'user' ? message.images : undefined;
    if (!message.content.trim() && (!images || images.length === 0)) {
      throw aiErrors.invalidRequest('Messages cannot be empty.');
    }
    return { role: message.role, content: message.content, ...(images?.length ? { images } : {}) };
  });
}

function enforceRateLimit(userId: string): void {
  const { allowed, retryAfterSeconds } = rateLimiter.check(userId);
  if (!allowed) throw aiErrors.rateLimited(retryAfterSeconds, 'per-user limit');
}

/**
 * Tells the frontend whether to offer the assistant at all. Auth-only on
 * purpose — a user without access still needs to be told why it is missing.
 */
export async function getAiStatus(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const configured = isAiConfigured();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { aiEnabled: true } });
  const enabled = configured && !!user?.aiEnabled;
  res.json({ configured, enabled, model: enabled ? getAiModel() : null });
}

export async function postAiChat(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const messages = readConversation(req.body);
    if (messages[messages.length - 1].role !== 'user') {
      throw aiErrors.invalidRequest('The last message must come from you.');
    }
    enforceRateLimit(userId);

    const { content, truncated } = await continueChat(messages);
    res.json({ message: { role: 'assistant', content }, truncated });
  } catch (err) {
    sendAiError(res, err);
  }
}

/**
 * Structured-output pass over the chat, then the exact same landing as a URL
 * capture: a real recipe row the user is dropped into the editor on. Images are
 * left to the user — the model has none to give us.
 */
export async function postAiRecipe(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const messages = readConversation(req.body);
    if (!messages.some((m) => m.role === 'assistant')) throw aiErrors.noRecipe();
    enforceRateLimit(userId);

    const extracted = await extractRecipe(messages);

    const recipe = await createRecipe(userId, {
      title: extracted.title,
      isFallback: false,
      origin: 'AI_GENERATED',
      ingredients: extracted.ingredients,
      instructions: extracted.instructions,
      prepTime: extracted.prepTime,
      cookTime: extracted.cookTime,
      servings: extracted.servings,
      notes: extracted.notes,
    });

    if (extracted.tags.length > 0) {
      const tags = await findOrCreateTags(extracted.tags);
      await setRecipeTags(recipe.id, tags.map((t) => t.id));
    }

    logger.info({ userId, recipeId: recipe.id }, 'Created recipe from AI chat');
    res.status(201).json({ recipeId: recipe.id });
  } catch (err) {
    sendAiError(res, err);
  }
}

/**
 * The AI alternative to the site parsers: fetch the page, hand its readable
 * text to the model, and land on a real recipe the same way a URL capture
 * does. The parsers still run — they are better at finding the pictures than
 * the model, which never sees them.
 *
 * With `recipeId`, the result replaces that recipe (used when a capture came
 * back without ingredients or steps) instead of leaving a duplicate behind.
 */
export async function postAiCapture(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const body = captureSchema.safeParse(req.body);
    if (!body.success) throw aiErrors.invalidRequest(body.error.issues[0]?.message ?? 'Invalid request.');
    const { url, recipeId } = body.data;

    // Ownership is settled before a single token is spent, and a recipe that
    // is not the caller's is reported the same way as one that never existed.
    const target = recipeId ? await getRecipeById(recipeId) : null;
    if (recipeId && (!target || target.ownerId !== userId)) {
      throw aiErrors.invalidRequest('That recipe is not available to parse again.');
    }

    enforceRateLimit(userId);

    let page;
    try {
      page = await fetchPage(url);
    } catch (err) {
      // The URL parser and the SSRF guard both name what is wrong, and the URL
      // came from this user, so the reason is safe to pass back.
      throw aiErrors.invalidRequest((err as Error).message);
    }
    if (!page.html) throw aiErrors.pageUnreachable();

    const { title, text } = extractPageText(page.html, env.AI_PAGE_MAX_CHARS);
    if (text.length < MIN_PAGE_CHARS) throw aiErrors.pageEmpty();

    const extracted = await extractRecipeFromPage({ url: page.url, title, text });
    const parsed = await parseHtml(page.html, page.url);

    const recipeData = {
      title: extracted.title,
      sourceUrl: page.url,
      isFallback: false,
      // Whatever read this page before, the model is what wrote what is here now.
      origin: 'AI_PARSED' as const,
      ingredients: extracted.ingredients,
      instructions: extracted.instructions,
      prepTime: extracted.prepTime,
      cookTime: extracted.cookTime,
      servings: extracted.servings,
      // Explicitly null rather than absent: replacing a recipe has to clear a
      // note the failed capture left behind ("Couldn't fetch this page.").
      notes: extracted.notes ?? null,
    };

    const recipe = target
      ? await updateRecipe(target.id, recipeData)
      : await createRecipe(userId, recipeData);

    // The model's own keywords, falling back to whatever a site parser found.
    const tagNames = extracted.tags.length > 0 ? extracted.tags : (parsed.tags ?? []);
    if (tagNames.length > 0) {
      const tags = await findOrCreateTags(tagNames);
      // Tags the user already put on the recipe are theirs to keep.
      const tagIds = new Set([...(target?.tags.map((t) => t.id) ?? []), ...tags.map((t) => t.id)]);
      await setRecipeTags(recipe.id, [...tagIds]);
    }

    // A replaced recipe already has the images its capture downloaded.
    if (!target || target.images.length === 0) {
      downloadImagesInBackground(recipe.id, parsed.imageUrls);
    }

    logger.info(
      { userId, recipeId: recipe.id, replaced: !!target, textChars: text.length },
      'Created recipe from AI page parse'
    );
    res.status(target ? 200 : 201).json({ recipeId: recipe.id });
  } catch (err) {
    sendAiError(res, err);
  }
}
