import { z } from 'zod';
import { env } from '../config/env.js';
import { schemaRegistry } from './registry.js';
import { json, type Json } from './helpers.js';
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
import '../schemas/ai.schema.js';

const DESCRIPTION = `
The same API the RecipeVault web app runs on.

## Authentication

Create a key under **Settings → API keys** in the web app, then send it on every
request:

\`\`\`
Authorization: Bearer rv_your_token_here
\`\`\`

\`X-API-Key: rv_your_token_here\` works too, if that suits your client better.

A key acts as the user who created it and has exactly that user's permissions —
the same recipes, the same collection roles, the same access (or lack of it) to
the AI assistant. There is nothing a key can reach that its owner cannot, and
nothing its owner can reach that the key cannot.

Keys carry a name and, optionally, an expiry. Revoking one takes effect
immediately.

Signing in and managing keys are not part of this API. They happen in the web
app, over a browser session, so that a leaked key can never mint another key or
change the password of the account it belongs to.

## Rate limiting

Two budgets, both per account, and shared between your browser session and all
of your API keys:

| Scope | Limit |
| --- | --- |
| Everything under \`/api\` | ${env.API_RATE_LIMIT_PER_MINUTE} requests/minute |
| The \`/ai/*\` endpoints that spend credits | ${env.AI_RATE_LIMIT_PER_MINUTE} requests/minute |

Sign-in and registration have their own per-IP limit, in the web app.

Every response carries \`RateLimit-Limit\`, \`RateLimit-Remaining\` and
\`RateLimit-Reset\` (seconds). A rejected request answers **429** with
\`Retry-After\`.

## Conventions

- All paths are relative to \`/api\`.
- Errors are \`{ "error": "a message you can show" }\`. The AI endpoints add a
  stable \`code\` and a \`retryable\` flag.
- Timestamps are RFC 3339 strings, and IDs are UUIDs.
- Image paths are relative to \`/images/\`.

Two other route families are likewise outside this contract and unreachable
with a key: \`/api/auth/*\`, which exists for the web app's own sign-in, and
\`/api/admin/*\`, which authenticates with the server's own admin credentials
rather than a user's.
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
        description: 'An API key (`rv_…`), created under Settings → API keys in the web app.',
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
    ...userPaths,
    ...recipePaths,
    ...collectionPaths,
    ...shoppingListPaths,
    ...tagPaths,
    ...aiPaths,
  },
};
