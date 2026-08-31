import { z } from 'zod';
import { MAX_KEY_NAME_LENGTH } from '../services/api-keys.service.js';

/**
 * Request validator for key management, which lives in the web UI only —
 * `/api/api-keys/*` is session-gated and absent from the published contract, so
 * this is not registered as an OpenAPI component.
 */
export const createApiKeySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give the key a name so you can tell it apart later.')
    .max(MAX_KEY_NAME_LENGTH, `Keep the name under ${MAX_KEY_NAME_LENGTH} characters.`),
  /**
   * Absent or null means the key never expires — the caller has to say so
   * explicitly rather than getting an endless key by forgetting the field.
   */
  expiresAt: z.iso
    .datetime({ offset: true })
    .nullish()
    .refine((value) => !value || new Date(value).getTime() > Date.now(), 'The expiry date has to be in the future.'),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
