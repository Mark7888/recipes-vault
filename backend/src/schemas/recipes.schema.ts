import { z } from 'zod';
import { component } from '../openapi/registry.js';
import {
  dateTime,
  imageSchema,
  ingredientEntrySchema,
  instructionEntrySchema,
  recipeOriginSchema,
  tagSchema,
  userRefSchema,
} from './common.schema.js';

const recipeCore = {
  id: z.uuid(),
  title: z.string(),
  sourceUrl: z.string().nullable().meta({ description: 'The page it was captured from, if any.' }),
  isFallback: z.boolean().meta({
    description: 'True when no site parser matched and the generic reader had to guess.',
  }),
  origin: recipeOriginSchema.nullable(),
  prepTime: z.number().int().nullable().meta({ description: 'Minutes.' }),
  cookTime: z.number().int().nullable().meta({ description: 'Minutes.' }),
  servings: z.number().int().nullable(),
  notes: z.string().nullable(),
  shareToken: z.string().nullable().meta({
    description: 'Set once the recipe has been shared; the public link is `/shared/<shareToken>`.',
  }),
  ownerId: z.uuid(),
  coverImageId: z.uuid().nullable(),
  createdAt: dateTime(),
  updatedAt: dateTime(),
  tags: z.array(tagSchema),
  coverImage: imageSchema.nullable().optional(),
};

export const recipeSchema = component(
  'Recipe',
  z.object({
    ...recipeCore,
    ingredients: z.array(ingredientEntrySchema),
    instructions: z.array(instructionEntrySchema),
    images: z.array(imageSchema),
    owner: userRefSchema.optional(),
  })
);

/** What a listing returns: the same recipe, without its image list or its owner. */
export const recipeListItemSchema = component(
  'RecipeListItem',
  z.object({
    ...recipeCore,
    ingredients: z.array(ingredientEntrySchema),
    instructions: z.array(instructionEntrySchema),
  })
);

export const recipeListSchema = component(
  'RecipeList',
  z.object({
    items: z.array(recipeListItemSchema),
    total: z.number().int().meta({ description: 'Matches before paging.' }),
    hasMore: z.boolean(),
  })
);

export const createRecipeSchema = component(
  'CreateRecipeRequest',
  z.object({
    title: z.string().optional().meta({ description: 'Defaults to "Untitled Recipe".' }),
  })
);

/**
 * The editable half of a recipe. Spelled out rather than passed through, so a
 * client cannot reach past the form into columns it has no business writing —
 * ownerId, the share token, or the origin the server records itself.
 */
export const updateRecipeSchema = component(
  'UpdateRecipeRequest',
  z.object({
    title: z.string().optional(),
    ingredients: z.array(ingredientEntrySchema).optional(),
    instructions: z.array(instructionEntrySchema).optional(),
    prepTime: z.number().int().nonnegative().optional(),
    cookTime: z.number().int().nonnegative().optional(),
    servings: z.number().int().nonnegative().optional(),
    notes: z.string().nullable().optional(),
    /** The editor's signal that the user changed the draft before saving. */
    modified: z.boolean().optional().meta({
      description: 'Set it when a person edited the draft: a PARSED recipe then becomes PARSED_EDITED.',
    }),
  })
);

export const setRecipeTagsSchema = component(
  'SetRecipeTagsRequest',
  z.object({
    tags: z.array(z.string()).meta({
      description: 'Tag names. Ones that do not exist yet are created. Replaces the recipe\'s tags.',
    }),
  })
);

export const reorderImagesSchema = component(
  'ReorderImagesRequest',
  z.object({ imageIds: z.array(z.uuid()).meta({ description: 'Every image of the recipe, in the order you want.' }) })
);

export const setCoverImageSchema = component(
  'SetCoverImageRequest',
  z.object({ imageId: z.uuid() })
);

export const shareTokenSchema = component(
  'ShareToken',
  z.object({
    token: z.string().meta({ description: 'The public link is `/shared/<token>`; it is created on first call and then reused.' }),
  })
);

export const captureRequestSchema = component(
  'CaptureRequest',
  z.object({
    url: z.url().meta({ description: 'The recipe page to read.', example: 'https://example.com/recipes/lasagne' }),
  })
);

export const captureResultSchema = component(
  'CaptureResult',
  z.object({
    recipeId: z.uuid(),
    incomplete: z.boolean().meta({
      description:
        'True when the parsers came back with no ingredients or no steps. Worth retrying through POST /ai/capture.',
    }),
  })
);
