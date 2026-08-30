import { arrayOf, authedErrors, body, errors, type Json, pathParam, res, SESSION_ONLY_NOTE } from '../helpers.js';

export const apiKeyPaths: Json = {
  '/api-keys': {
    get: {
      tags: ['API keys'],
      operationId: 'listApiKeys',
      summary: 'List your API keys',
      description: 'Never includes the secrets — only what is needed to tell keys apart.' + SESSION_ONLY_NOTE,
      responses: {
        200: res('Your keys, newest first.', arrayOf('ApiKey')),
        403: errors.forbidden,
        ...authedErrors,
      },
    },
    post: {
      tags: ['API keys'],
      operationId: 'createApiKey',
      summary: 'Create an API key',
      description:
        'The response carries the only copy of the token — the server stores just its hash. Save it before ' +
        'you close the window.' +
        SESSION_ONLY_NOTE,
      requestBody: body('CreateApiKeyRequest'),
      responses: {
        201: res('The key, and its token, once.', 'CreatedApiKey'),
        400: errors.badRequest,
        403: errors.forbidden,
        409: res('You are already at the per-account key limit.', 'Error'),
        ...authedErrors,
      },
    },
  },

  '/api-keys/{id}': {
    delete: {
      tags: ['API keys'],
      operationId: 'revokeApiKey',
      summary: 'Revoke an API key',
      description:
        'Takes effect on the next request the key makes. The record of the key stays, marked revoked.' +
        SESSION_ONLY_NOTE,
      parameters: [pathParam('id', 'The key to revoke.')],
      responses: {
        204: res('Revoked.'),
        403: errors.forbidden,
        404: errors.notFound,
        ...authedErrors,
      },
    },
  },
};
