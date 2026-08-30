import { z } from 'zod';
import { component } from '../openapi/registry.js';
import { tagSchema } from './common.schema.js';

export const tagWithCountSchema = component(
  'TagWithCount',
  tagSchema.extend({
    recipeCount: z.number().int().meta({ description: 'How many recipes carry this tag, across every account.' }),
  })
);

export const renameTagSchema = component(
  'RenameTagRequest',
  z.object({ name: z.string().min(1).max(50) })
);

export const mergeTagSchema = component(
  'MergeTagRequest',
  z.object({
    targetId: z.uuid().meta({ description: 'The tag to merge into. This tag\'s recipes move there and it is deleted.' }),
  })
);
