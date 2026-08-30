import { z } from 'zod';
import { component } from '../openapi/registry.js';
import { isSupportedLanguage } from '../services/ai/languages.js';

// The conversation lives in the client and is replayed on every turn, so these
// caps are what keep a single request (and its token bill) bounded.
export const MAX_MESSAGES = 40;
export const MAX_CONTENT_CHARS = 8000;
export const MAX_IMAGES_PER_MESSAGE = 4;
export const MAX_IMAGES_TOTAL = 6;
export const MAX_IMAGE_CHARS = 1_200_000; // ≈ 900 KB of image data once decoded

/** Long enough for a real request, short enough that it cannot become the bulk of the prompt. */
export const MAX_INSTRUCTION_CHARS = 500;

const dataUrlSchema = z
  .string()
  .max(MAX_IMAGE_CHARS, 'One of the images is too large. Please attach a smaller screenshot.')
  .regex(/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/]+={0,2}$/, 'Unsupported image format.')
  .meta({ description: 'A `data:image/...;base64,...` URL. PNG, JPEG or WebP.' });

export const chatMessageSchema = component(
  'AiChatMessage',
  z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(MAX_CONTENT_CHARS),
    images: z.array(dataUrlSchema).max(MAX_IMAGES_PER_MESSAGE).optional().meta({
      description: `Only on user turns. At most ${MAX_IMAGES_TOTAL} across the whole conversation.`,
    }),
  })
);

export const conversationSchema = component(
  'AiConversation',
  z.object({
    messages: z.array(chatMessageSchema).min(1).max(MAX_MESSAGES).meta({
      description: 'The whole conversation so far. The server keeps no state between calls.',
    }),
  })
);

export const instructionSchema = z
  .string()
  .trim()
  .min(1, 'Write what the AI should do with this recipe.')
  .max(MAX_INSTRUCTION_CHARS, `Keep the instructions under ${MAX_INSTRUCTION_CHARS} characters.`);

export const aiCaptureSchema = component(
  'AiCaptureRequest',
  z.object({
    url: z.string().url('That does not look like a valid URL.').max(2048),
    /**
     * Set when the AI is re-parsing a page the site parsers already captured:
     * the result then replaces that recipe instead of leaving a half-empty
     * duplicate behind. Must belong to the caller.
     */
    recipeId: z.uuid().optional().meta({
      description: 'Replace this recipe in place instead of creating a new one. Must be yours.',
    }),
    /** Extra wording from the user, e.g. "translate it to German". */
    instructions: instructionSchema.optional().meta({
      description: 'Anything extra to ask for while reading the page, e.g. "translate it to German".',
    }),
  })
);

export const aiReworkSchema = component(
  'AiReworkRequest',
  z.object({
    recipeId: z.uuid(),
    instructions: instructionSchema.meta({
      description: 'What to do with it, e.g. "scale it to 8 servings".',
      example: 'Translate this to German',
    }),
  })
);

export const aiLanguageSchema = component(
  'AiLanguageRequest',
  z.object({
    language: z.string().max(35).refine(isSupportedLanguage, 'That is not a language the assistant offers.'),
  })
);

export const aiStatusSchema = component(
  'AiStatus',
  z.object({
    configured: z.boolean().meta({ description: 'Whether this server has an AI provider set up at all.' }),
    enabled: z.boolean().meta({ description: 'Whether it is configured *and* turned on for your account.' }),
    model: z.string().nullable(),
    language: z.string(),
  })
);

export const aiLanguageOptionSchema = component(
  'AiLanguageOption',
  z.object({ code: z.string(), name: z.string(), nativeName: z.string() })
);

export const aiChatReplySchema = component(
  'AiChatReply',
  z.object({
    message: z.object({ role: z.literal('assistant'), content: z.string() }),
    truncated: z.boolean().meta({ description: 'True when the model hit its output cap mid-answer.' }),
  })
);

export const aiRecipeResultSchema = component(
  'AiRecipeResult',
  z.object({ recipeId: z.uuid() })
);
