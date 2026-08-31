import { ref } from './registry.js';

/**
 * Small builders for the path fragments. They exist so a route's entry reads
 * as what it is — "POST a body of X, get back a Y" — instead of four nested
 * levels of OpenAPI boilerplate repeated fifty times.
 */

export type Json = Record<string, unknown>;

/** A response or request body of `application/json`, given a component id or an inline schema. */
export function json(schema: string | Json): Json {
  return { 'application/json': { schema: typeof schema === 'string' ? ref(schema) : schema } };
}

export function arrayOf(schemaId: string): Json {
  return { type: 'array', items: ref(schemaId) };
}

export function body(schema: string | Json, options: { required?: boolean } = {}): Json {
  return { required: options.required ?? true, content: json(schema) };
}

/** Multipart bodies (image upload) — the one place JSON is not the medium. */
export function multipartBody(properties: Json, required: string[]): Json {
  return {
    required: true,
    content: {
      'multipart/form-data': { schema: { type: 'object', properties, required } },
    },
  };
}

export function res(description: string, schema?: string | Json): Json {
  return schema ? { description, content: json(schema) } : { description };
}

export function noContent(description: string): Json {
  return { description };
}

export function pathParam(name: string, description: string, schema: Json = { type: 'string', format: 'uuid' }): Json {
  return { name, in: 'path', required: true, description, schema };
}

export function queryParam(name: string, description: string, schema: Json): Json {
  return { name, in: 'query', required: false, description, schema };
}

/** Reusable error responses, declared once in the document's components. */
export const errors = {
  badRequest: { $ref: '#/components/responses/BadRequest' },
  unauthorized: { $ref: '#/components/responses/Unauthorized' },
  forbidden: { $ref: '#/components/responses/Forbidden' },
  notFound: { $ref: '#/components/responses/NotFound' },
  tooManyRequests: { $ref: '#/components/responses/TooManyRequests' },
  aiFailure: { $ref: '#/components/responses/AiFailure' },
} as const;

/** The errors every authenticated endpoint can answer with. */
export const authedErrors = {
  401: errors.unauthorized,
  429: errors.tooManyRequests,
} as const;

/** Marks an operation as reachable without any credential. */
export const publicOperation = { security: [] as unknown[] };

/**
 * Appended to the description of the handful of operations an API key is
 * deliberately not allowed to reach.
 */
export const SESSION_ONLY_NOTE =
  '\n\n**Session only.** API keys cannot call this: a key must not be able to mint keys or change the ' +
  'credentials of the account it belongs to.';
