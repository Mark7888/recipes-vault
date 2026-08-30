import { z } from 'zod';
import { component } from '../openapi/registry.js';

/**
 * Pieces that show up in more than one endpoint's contract.
 *
 * Everything here is both the runtime validator and the published schema:
 * `component()` registers it under `#/components/schemas/<id>`, so the docs
 * describe the same objects the handlers accept and return.
 */

/**
 * A timestamp on the wire. Plain string rather than `z.iso.datetime()`,
 * whose JSON Schema form is a page-long regex that helps no reader.
 */
export const dateTime = () => z.string().meta({ format: 'date-time' });

/** The bare acknowledgement a few endpoints answer with. */
export const okSchema = component('Ok', z.object({ ok: z.boolean() }));

export const errorSchema = component(
  'Error',
  z.object({
    error: z.string().meta({ description: 'A message written for a person to read.' }),
  })
);

export const rateLimitErrorSchema = component(
  'RateLimitError',
  z.object({
    error: z.string(),
    retryAfterSeconds: z.number().int().meta({ description: 'Also sent as the Retry-After header.' }),
  })
);

/** How every AI endpoint reports a failure — a stable code plus a message to show as-is. */
export const aiErrorSchema = component(
  'AiError',
  z.object({
    error: z.string(),
    code: z.enum([
      'AI_NOT_CONFIGURED',
      'AI_FORBIDDEN',
      'AI_INVALID_REQUEST',
      'AI_RATE_LIMITED',
      'AI_QUOTA_EXHAUSTED',
      'AI_CONTEXT_TOO_LONG',
      'AI_TIMEOUT',
      'AI_UNAVAILABLE',
      'AI_CONTENT_FILTERED',
      'AI_TRUNCATED',
      'AI_BAD_RESPONSE',
      'AI_NO_RECIPE',
      'AI_PAGE_UNREACHABLE',
      'AI_PAGE_EMPTY',
    ]),
    retryable: z.boolean().meta({ description: 'Whether trying the same request again has any chance of working.' }),
    retryAfterSeconds: z.number().int().optional(),
  })
);

/** How another user is identified anywhere they appear (members, owners, transfers). */
export const userRefSchema = component(
  'UserRef',
  z.object({ id: z.uuid(), username: z.string() })
);

export const roleSchema = component(
  'Role',
  z.enum(['OWNER', 'EDITOR', 'VIEWER'])
);

export const recipeOriginSchema = component(
  'RecipeOrigin',
  z.enum(['MANUAL', 'PARSED', 'PARSED_EDITED', 'AI_PARSED', 'AI_GENERATED']).meta({
    description:
      'How the recipe got here: typed in by hand, read by a site parser, parsed and then edited, ' +
      'read from a page by the AI, or written by the AI in a chat.',
  })
);

// A section heading can sit anywhere in either list; rows saved before
// sections existed carry no `type`, so only the heading is discriminated.
export const sectionSchema = component(
  'RecipeSection',
  z.object({ type: z.literal('section'), title: z.string() }).meta({
    description: 'A heading inside an ingredient or step list ("For the sauce").',
  })
);

export const ingredientSchema = component(
  'Ingredient',
  z.object({ amount: z.string(), unit: z.string(), name: z.string() })
);

export const instructionSchema = component(
  'Instruction',
  z.object({ step: z.number().int(), text: z.string() })
);

export const ingredientEntrySchema = component(
  'IngredientEntry',
  z.union([sectionSchema, ingredientSchema])
);

export const instructionEntrySchema = component(
  'InstructionEntry',
  z.union([sectionSchema, instructionSchema])
);

export const tagSchema = component(
  'Tag',
  z.object({ id: z.uuid(), name: z.string() })
);

export const imageSchema = component(
  'Image',
  z.object({
    id: z.uuid(),
    recipeId: z.uuid(),
    filePath: z.string().meta({
      description: 'Filename under /images — the full URL is `/images/<filePath>`.',
    }),
    isCover: z.boolean(),
    order: z.number().int(),
  })
);
