import type { Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { AiError, aiErrors } from '../services/ai/ai-errors.js';
import { continueChat, extractRecipe } from '../services/ai/recipe-assistant.service.js';
import { getAiModel, isAiConfigured, type ChatMessage } from '../services/ai/openrouter.service.js';
import { createRecipe, setRecipeTags } from '../services/recipes.service.js';
import { findOrCreateTags } from '../services/tags.service.js';
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
