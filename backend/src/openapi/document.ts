import { z } from 'zod';
import { env } from '../config/env.js';
import { schemaRegistry } from './registry.js';
import { json, type Json } from './helpers.js';
import { authPaths } from './paths/auth.paths.js';
import { apiKeyPaths } from './paths/api-keys.paths.js';
import { recipePaths } from './paths/recipes.paths.js';
import { collectionPaths } from './paths/collections.paths.js';
import { shoppingListPaths, tagPaths, userPaths } from './paths/misc.paths.js';
import { aiPaths } from './paths/ai.paths.js';

// Importing the schema modules is what puts their components in the registry:
// each `component()` call registers as the module is evaluated. The path files
// only ever reference them by name, so these imports are the link between the
// two halves.
import '../schemas/common.schema.js';
import '../schemas/recipes.schema.js';
import '../schemas/collections.schema.js';
import '../schemas/shopping-list.schema.js';
import '../schemas/tags.schema.js';
import '../schemas/users.schema.js';
import '../schemas/auth.schema.js';
import '../schemas/ai.schema.js';
import '../schemas/api-keys.schema.js';

const DESCRIPTION = `
The same API the RecipeVault web app runs on.

## Authentication

Create a key under **Settings → API keys**, then send it on every request:

\`\`\`
Authorization: Bearer rv_your_token_here
\`\`\`

\`X-API-Key: rv_your_token_here\` works too, if that suits your client better.

A key acts as the user who created it and has exactly that user's permissions —
the same recipes, the same collection roles, the same access (or lack of it) to
the AI assistant. There is nothing a key can reach that its owner cannot, and
nothing its owner can reach that the key cannot, with two deliberate exceptions:
a key cannot create or revoke API keys, and it cannot change the account's
username or password. Both of those need a signed-in browser session, so that a
leaked key can always be taken away.

Keys carry a name and, optionally, an expiry. Revoking one takes effect
immediately.

The browser app authenticates differently — a short-lived JWT from
\`POST /auth/login\` plus a refresh cookie — and every endpoint below accepts
either credential.

## Rate limiting

Two budgets, both per account, and shared between your browser session and all
of your API keys:

| Scope | Limit |
| --- | --- |
| Everything under \`/api\` | ${env.API_RATE_LIMIT_PER_MINUTE} requests/minute |
| The \`/ai/*\` endpoints that spend credits | ${env.AI_RATE_LIMIT_PER_MINUTE} requests/minute |

Sign-in and registration are limited separately, per IP address.

Every response carries \`RateLimit-Limit\`, \`RateLimit-Remaining\` and
\`RateLimit-Reset\` (seconds). A rejected request answers **429** with
\`Retry-After\`.

## Conventions

- All paths are relative to \`/api\`.
- Errors are \`{ "error": "a message you can show" }\`. The AI endpoints add a
  stable \`code\` and a \`retryable\` flag.
- Timestamps are RFC 3339 strings, and IDs are UUIDs.
- Image paths are relative to \`/images/\`.

The admin endpoints (\`/api/admin/*\`) are not part of this contract: they
authenticate with the server's own admin credentials rather than a user's, and
API keys cannot reach them.
`.trim();

/**
 * JSON Schema draft 2020-12 is what OpenAPI 3.1 speaks, so zod's output drops
 * straight in. `$schema` and `$id` are stripped: correct but redundant once the
 * schema sits under `components/schemas`, and only noise for a reader.
 */
function components(): Json {
  const { schemas } = z.toJSONSchema(schemaRegistry, {
    uri: (id) => `#/components/schemas/${id}`,
    target: 'draft-2020-12',
    io: 'input',
  });

  const cleaned: Json = {};
  for (const [id, schema] of Object.entries(schemas)) {
    const copy = { ...(schema as Json) };
    delete copy.$schema;
    delete copy.$id;
    cleaned[id] = copy;
  }
  return cleaned;
}

const responses: Json = {
  BadRequest: { description: 'The request body or parameters did not validate.', content: json('Error') },
  Unauthorized: { description: 'No credential, or one that is expired, revoked or unknown.', content: json('Error') },
  Forbidden: { description: 'Authenticated, but not allowed to do this.', content: json('Error') },
  NotFound: { description: 'No such resource, or none you can see.', content: json('Error') },
  Conflict: { description: 'The request collides with something that already exists.', content: json('Error') },
  TooManyRequests: {
    description: 'Rate limited. Wait the number of seconds in `Retry-After`.',
    headers: {
      'Retry-After': { description: 'Seconds to wait.', schema: { type: 'integer' } },
      'RateLimit-Limit': { description: 'Requests allowed per window.', schema: { type: 'integer' } },
      'RateLimit-Remaining': { description: 'Requests left in this window.', schema: { type: 'integer' } },
      'RateLimit-Reset': { description: 'Seconds until the window frees up.', schema: { type: 'integer' } },
    },
    content: json('RateLimitError'),
  },
  AiFailure: { description: 'The assistant could not answer. `code` says why.', content: json('AiError') },
};

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'RecipeVault API',
    version: '1.0.0',
    description: DESCRIPTION,
  },
  servers: [
    {
      url: env.PUBLIC_BASE_URL ? `${env.PUBLIC_BASE_URL.replace(/\/$/, '')}/api` : '/api',
      description: 'This deployment',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Sessions for the web app. API clients use a key instead.' },
    { name: 'API keys', description: 'Create and revoke the tokens this API authenticates with.' },
    { name: 'Recipes', description: 'The library: recipes, their images, tags and share links.' },
    { name: 'Capture', description: 'Turn a recipe URL into a saved recipe.' },
    { name: 'Collections', description: 'Grouping and sharing recipes, with Owner / Editor / Viewer roles.' },
    { name: 'Shopping list', description: 'The list, and the history of past trips.' },
    { name: 'Tags', description: 'Instance-wide tags, and the housekeeping on them.' },
    { name: 'AI', description: 'The optional assistant. Off unless an admin enabled it for your account.' },
    { name: 'Users', description: 'Your own account, and finding people to share with.' },
  ],
  // Applies to every operation unless it opts out with `security: []`. Two
  // schemes because the same credential is accepted in either header.
  security: [{ bearerAuth: [] }, { apiKeyHeader: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description:
          'An API key (`rv_…`) or a session access token from `POST /auth/login`. Both are accepted here.',
      },
      apiKeyHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'An API key, for clients that would rather not use the Authorization header.',
      },
    },
    schemas: components(),
    responses,
  },
  paths: {
    ...authPaths,
    ...apiKeyPaths,
    ...userPaths,
    ...recipePaths,
    ...collectionPaths,
    ...shoppingListPaths,
    ...tagPaths,
    ...aiPaths,
  },
};
