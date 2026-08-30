import {
  arrayOf,
  authedErrors,
  body,
  errors,
  type Json,
  multipartBody,
  pathParam,
  publicOperation,
  queryParam,
  res,
} from '../helpers.js';

const recipeId = pathParam('id', 'The recipe.');

export const recipePaths: Json = {
  '/recipes': {
    get: {
      tags: ['Recipes'],
      operationId: 'listRecipes',
      summary: 'List your recipes',
      description: 'Everything you own, filtered and paged. Recipes shared with you appear under their collection.',
      parameters: [
        queryParam('search', 'Matches the title.', { type: 'string' }),
        queryParam('tags[]', 'Tag names; a recipe must carry all of them.', {
          type: 'array',
          items: { type: 'string' },
        }),
        queryParam('site', 'Source domain, e.g. "example.com".', { type: 'string' }),
        queryParam('origin', 'How the recipe got here. UNKNOWN covers recipes saved before this was recorded.', {
          type: 'string',
          enum: ['MANUAL', 'PARSED', 'PARSED_EDITED', 'AI_PARSED', 'AI_GENERATED', 'UNKNOWN'],
        }),
        queryParam('sort', 'Ordering.', {
          type: 'string',
          enum: ['newest', 'oldest', 'title-asc', 'title-desc', 'prep-time'],
          default: 'newest',
        }),
        queryParam('limit', 'Page size.', { type: 'integer', minimum: 1, maximum: 100, default: 24 }),
        queryParam('offset', 'How many to skip.', { type: 'integer', minimum: 0, default: 0 }),
      ],
      responses: { 200: res('A page of recipes.', 'RecipeList'), ...authedErrors },
    },
    post: {
      tags: ['Recipes'],
      operationId: 'createRecipe',
      summary: 'Create a blank recipe',
      description: 'Starts an empty recipe you then fill in with PATCH /recipes/{id}.',
      requestBody: body('CreateRecipeRequest', { required: false }),
      responses: { 201: res('The new recipe.', 'Recipe'), 400: errors.badRequest, ...authedErrors },
    },
  },

  '/recipes/sites': {
    get: {
      tags: ['Recipes'],
      operationId: 'listRecipeSites',
      summary: 'List the sites you have captured from',
      description: 'The domains behind your recipes, for the `site` filter.',
      responses: {
        200: res('Domains, sorted.', { type: 'array', items: { type: 'string' } }),
        ...authedErrors,
      },
    },
  },

  '/recipes/{id}': {
    get: {
      tags: ['Recipes'],
      operationId: 'getRecipe',
      summary: 'Get one recipe',
      description: 'Yours, or one shared with you through a collection.',
      parameters: [recipeId],
      responses: {
        200: res('The recipe.', 'Recipe'),
        403: errors.forbidden,
        404: errors.notFound,
        ...authedErrors,
      },
    },
    patch: {
      tags: ['Recipes'],
      operationId: 'updateRecipe',
      summary: 'Update a recipe',
      description: 'Owner only. Every field is optional; only what you send changes.',
      parameters: [recipeId],
      requestBody: body('UpdateRecipeRequest'),
      responses: {
        200: res('The updated recipe.', 'Recipe'),
        400: errors.badRequest,
        403: errors.forbidden,
        404: errors.notFound,
        ...authedErrors,
      },
    },
    delete: {
      tags: ['Recipes'],
      operationId: 'deleteRecipe',
      summary: 'Delete a recipe',
      description: 'Owner only. Its images go with it.',
      parameters: [recipeId],
      responses: { 204: res('Deleted.'), 403: errors.forbidden, 404: errors.notFound, ...authedErrors },
    },
  },

  '/recipes/{id}/duplicate': {
    post: {
      tags: ['Recipes'],
      operationId: 'duplicateRecipe',
      summary: 'Copy a recipe into your library',
      description: 'Works on any recipe you can read, so this is how you keep a copy of one shared with you.',
      parameters: [recipeId],
      responses: {
        201: res('The copy, owned by you.', 'Recipe'),
        403: errors.forbidden,
        404: errors.notFound,
        ...authedErrors,
      },
    },
  },

  '/recipes/{id}/tags': {
    post: {
      tags: ['Recipes'],
      operationId: 'setRecipeTags',
      summary: 'Replace a recipe\'s tags',
      description: 'Owner only. Tags are global and lower-cased; unknown names are created.',
      parameters: [recipeId],
      requestBody: body('SetRecipeTagsRequest'),
      responses: {
        200: res('The recipe with its new tags.', 'Recipe'),
        400: errors.badRequest,
        403: errors.forbidden,
        404: errors.notFound,
        ...authedErrors,
      },
    },
  },

  '/recipes/{id}/images': {
    get: {
      tags: ['Recipes'],
      operationId: 'listRecipeImages',
      summary: 'List a recipe\'s images',
      parameters: [recipeId],
      responses: { 200: res('Images in display order.', arrayOf('Image')), 403: errors.forbidden, ...authedErrors },
    },
    post: {
      tags: ['Recipes'],
      operationId: 'uploadRecipeImage',
      summary: 'Upload an image',
      description: 'Owner only. Up to 8 MB; the file is re-encoded on the way in.',
      parameters: [recipeId],
      requestBody: multipartBody({ image: { type: 'string', format: 'binary' } }, ['image']),
      responses: {
        201: res('The stored image.', 'Image'),
        400: errors.badRequest,
        403: errors.forbidden,
        404: errors.notFound,
        ...authedErrors,
      },
    },
  },

  '/recipes/{id}/images/reorder': {
    patch: {
      tags: ['Recipes'],
      operationId: 'reorderRecipeImages',
      summary: 'Reorder a recipe\'s images',
      parameters: [recipeId],
      requestBody: body('ReorderImagesRequest'),
      responses: {
        204: res('Reordered.'),
        400: errors.badRequest,
        403: errors.forbidden,
        404: errors.notFound,
        ...authedErrors,
      },
    },
  },

  '/recipes/{id}/images/{imageId}': {
    delete: {
      tags: ['Recipes'],
      operationId: 'deleteRecipeImage',
      summary: 'Delete an image',
      parameters: [recipeId, pathParam('imageId', 'The image to remove.')],
      responses: { 204: res('Deleted.'), 403: errors.forbidden, 404: errors.notFound, ...authedErrors },
    },
  },

  '/recipes/{id}/cover-image': {
    patch: {
      tags: ['Recipes'],
      operationId: 'setRecipeCoverImage',
      summary: 'Choose the cover image',
      parameters: [recipeId],
      requestBody: body('SetCoverImageRequest'),
      responses: {
        200: res('The cover was set.', 'Ok'),
        400: errors.badRequest,
        403: errors.forbidden,
        404: errors.notFound,
        ...authedErrors,
      },
    },
  },

  '/recipes/{id}/collections': {
    get: {
      tags: ['Recipes'],
      operationId: 'getRecipeCollections',
      summary: 'Which of your collections hold this recipe',
      parameters: [recipeId],
      responses: {
        200: res('One entry per collection you are in that contains it.', {
          type: 'array',
          items: {
            type: 'object',
            properties: { collectionId: { type: 'string', format: 'uuid' }, addedById: { type: 'string', format: 'uuid' } },
            required: ['collectionId', 'addedById'],
          },
        }),
        ...authedErrors,
      },
    },
  },

  '/recipes/{id}/share': {
    post: {
      tags: ['Recipes'],
      operationId: 'shareRecipe',
      summary: 'Get the public share link token',
      description: 'Owner only. Creates the token the first time and returns the same one afterwards.',
      parameters: [recipeId],
      responses: {
        200: res('The share token.', 'ShareToken'),
        403: errors.forbidden,
        404: errors.notFound,
        ...authedErrors,
      },
    },
  },

  '/shared/{token}': {
    get: {
      ...publicOperation,
      tags: ['Recipes'],
      operationId: 'getSharedRecipe',
      summary: 'Read a shared recipe',
      description: 'No credential needed — knowing the token is the permission.',
      parameters: [pathParam('token', 'From POST /recipes/{id}/share.', { type: 'string' })],
      responses: { 200: res('The recipe.', 'Recipe'), 404: errors.notFound, 429: errors.tooManyRequests },
    },
  },

  '/capture': {
    post: {
      tags: ['Capture'],
      operationId: 'captureRecipe',
      summary: 'Capture a recipe from a URL',
      description:
        'Fetches the page, reads it with the matching site parser (falling back to JSON-LD and then to a ' +
        'generic reader) and saves the result as a new recipe. Images are downloaded in the background, so ' +
        'they may appear a moment after the recipe does.',
      requestBody: body('CaptureRequest'),
      responses: {
        201: res('The captured recipe.', 'CaptureResult'),
        400: res('The URL was rejected, or the page could not be read.', 'Error'),
        ...authedErrors,
      },
    },
  },
};
