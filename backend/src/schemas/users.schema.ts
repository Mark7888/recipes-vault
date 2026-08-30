import { z } from 'zod';
import { component } from '../openapi/registry.js';
import { dateTime } from './common.schema.js';

export const currentUserSchema = component(
  'CurrentUser',
  z.object({
    id: z.uuid(),
    username: z.string(),
    createdAt: dateTime(),
    aiEnabled: z.boolean().meta({
      description: 'Whether an admin has turned the AI assistant on for this account. Governs the /ai endpoints too.',
    }),
    aiLanguage: z.string().meta({ description: 'Language tag the assistant answers and writes in.' }),
  })
);

export const updateCurrentUserSchema = component(
  'UpdateCurrentUserRequest',
  z.object({
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/).optional(),
    currentPassword: z.string().min(1).meta({ description: 'Always required, even when only the username changes.' }),
    newPassword: z.string().min(8).optional().meta({
      description: 'At least 8 characters, with one uppercase letter and one number.',
    }),
  })
);

export const updatedUserSchema = component(
  'UpdatedUser',
  z.object({ id: z.uuid(), username: z.string(), createdAt: dateTime() })
);
