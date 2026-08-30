import { z } from 'zod';
import { component } from '../openapi/registry.js';
import { MAX_KEY_NAME_LENGTH } from '../services/api-keys.service.js';

export const createApiKeySchema = component(
  'CreateApiKeyRequest',
  z.object({
    name: z
      .string()
      .trim()
      .min(1, 'Give the key a name so you can tell it apart later.')
      .max(MAX_KEY_NAME_LENGTH, `Keep the name under ${MAX_KEY_NAME_LENGTH} characters.`)
      .meta({ description: 'What this key is for, e.g. "Home Assistant".', example: 'Home Assistant' }),
    /**
     * Absent or null means the key never expires — the caller has to say so
     * explicitly rather than getting an endless key by forgetting the field.
     */
    expiresAt: z.iso
      .datetime({ offset: true })
      .nullish()
      .refine((value) => !value || new Date(value).getTime() > Date.now(), 'The expiry date has to be in the future.')
      .meta({
        description: 'When the key stops working (RFC 3339). Null or omitted means it never expires.',
        example: '2027-01-01T00:00:00Z',
      }),
  })
);

export const apiKeySchema = component(
  'ApiKey',
  z.object({
    id: z.uuid(),
    name: z.string(),
    prefix: z.string().meta({
      description: 'The first characters of the token, so keys can be told apart in a list.',
      example: 'rv_3f9a1c2b',
    }),
    expiresAt: z.iso.datetime().nullable(),
    lastUsedAt: z.iso.datetime().nullable(),
    revokedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
    expired: z.boolean(),
    active: z.boolean().meta({ description: 'Neither revoked nor expired — this key works right now.' }),
  })
);

export const createdApiKeySchema = component(
  'CreatedApiKey',
  z.object({
    key: apiKeySchema,
    token: z.string().meta({
      description:
        'The secret. Shown once, here, and never again — it is stored only as a hash. Send it as ' +
        '`Authorization: Bearer <token>` or `X-API-Key: <token>`.',
      example: 'rv_3f9a1c2b5d7e9f0a1b2c3d4e5f60718293a4b5c6d7e8f90',
    }),
  })
);

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
