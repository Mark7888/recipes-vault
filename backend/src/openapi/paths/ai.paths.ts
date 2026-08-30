import { arrayOf, authedErrors, body, errors, type Json, res } from '../helpers.js';

/**
 * The assistant. Two gates sit in front of everything that spends tokens: the
 * per-user access flag an admin sets, and a much stricter rate limit than the
 * rest of the API. Both apply to API keys exactly as they apply to the browser —
 * a key belonging to an account without AI access gets the same 403.
 */
const AI_NOTE =
  '\n\nRequires the AI assistant to be configured on the server *and* enabled for your account by an admin. ' +
  'These endpoints have their own, much tighter rate limit.';

const aiErrorResponses = {
  400: errors.aiFailure,
  403: res('The assistant is not enabled for your account.', 'AiError'),
  429: res('The AI rate limit, which is separate from the general one.', 'AiError'),
  502: errors.aiFailure,
  503: res('No AI provider is configured on this server.', 'AiError'),
} as const;

export const aiPaths: Json = {
  '/ai/status': {
    get: {
      tags: ['AI'],
      operationId: 'getAiStatus',
      summary: 'Whether the assistant is available to you',
      description: 'Open to any signed-in caller, so a client can explain why the assistant is missing.',
      responses: { 200: res('The assistant\'s state for your account.', 'AiStatus'), ...authedErrors },
    },
  },

  '/ai/languages': {
    get: {
      tags: ['AI'],
      operationId: 'getAiLanguages',
      summary: 'Languages the assistant offers',
      responses: { 200: res('Supported languages.', arrayOf('AiLanguageOption')), ...authedErrors },
    },
  },

  '/ai/language': {
    patch: {
      tags: ['AI'],
      operationId: 'setAiLanguage',
      summary: 'Set the language the assistant works in',
      description: 'A preference, not a use of the assistant, so it works before an admin turns AI on for you.',
      requestBody: body('AiLanguageRequest'),
      responses: {
        200: res('The language now in effect.', { type: 'object', properties: { language: { type: 'string' } } }),
        400: errors.badRequest,
        ...authedErrors,
      },
    },
  },

  '/ai/chat': {
    post: {
      tags: ['AI'],
      operationId: 'aiChat',
      summary: 'Talk to the recipe assistant',
      description:
        'Stateless: send the whole conversation each time, and the reply is one assistant turn to append to it.' +
        AI_NOTE,
      requestBody: body('AiConversation'),
      responses: { 200: res('The assistant\'s answer.', 'AiChatReply'), ...aiErrorResponses, 401: errors.unauthorized },
    },
  },

  '/ai/recipe': {
    post: {
      tags: ['AI'],
      operationId: 'aiRecipeFromChat',
      summary: 'Turn a conversation into a saved recipe',
      description: 'Runs a structured pass over the chat and saves the result as a real recipe.' + AI_NOTE,
      requestBody: body('AiConversation'),
      responses: {
        201: res('The new recipe.', 'AiRecipeResult'),
        ...aiErrorResponses,
        401: errors.unauthorized,
        422: res('There is no complete recipe in the conversation yet.', 'AiError'),
      },
    },
  },

  '/ai/capture': {
    post: {
      tags: ['AI'],
      operationId: 'aiCaptureRecipe',
      summary: 'Have the AI read a page the parsers could not',
      description:
        'The AI alternative to POST /capture: the page\'s text goes to the model, while the site parsers still ' +
        'supply the images. Pass `recipeId` to replace a half-empty capture instead of creating a duplicate.' +
        AI_NOTE,
      requestBody: body('AiCaptureRequest'),
      responses: {
        200: res('An existing recipe was replaced.', 'AiRecipeResult'),
        201: res('A new recipe was created.', 'AiRecipeResult'),
        ...aiErrorResponses,
        401: errors.unauthorized,
        422: res('The page had no readable text.', 'AiError'),
      },
    },
  },

  '/ai/rework': {
    post: {
      tags: ['AI'],
      operationId: 'aiReworkRecipe',
      summary: 'Rewrite a saved recipe',
      description:
        'Translate it, scale it, make it vegan. Works from what is saved and replaces the recipe in place, so ' +
        'its images, share link and collections stay where they are.' +
        AI_NOTE,
      requestBody: body('AiReworkRequest'),
      responses: { 200: res('The reworked recipe.', 'AiRecipeResult'), ...aiErrorResponses, 401: errors.unauthorized },
    },
  },
};
