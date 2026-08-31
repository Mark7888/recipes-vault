import { z } from 'zod';
import { component } from '../openapi/registry.js';
import { dateTime } from './common.schema.js';

export const shoppingItemSchema = component(
  'ShoppingListItem',
  z.object({
    id: z.uuid(),
    userId: z.uuid(),
    name: z.string(),
    amount: z.string(),
    unit: z.string(),
    bought: z.boolean().meta({ description: 'True once ticked off, until the list is cleared.' }),
    recipeId: z.uuid().nullable(),
    recipeTitle: z.string().nullable().meta({
      description: 'Snapshot of the source recipe\'s title, kept so grouping survives the recipe being deleted.',
    }),
    createdAt: dateTime(),
  })
);

export const shoppingItemInputSchema = component(
  'ShoppingListItemInput',
  z.object({
    name: z.string().min(1),
    amount: z.string().optional(),
    unit: z.string().optional(),
    recipeId: z.uuid().nullish().meta({ description: 'Where the item came from; omit for a hand-added one.' }),
    recipeTitle: z.string().nullish(),
  }).meta({
    description:
      'Items are merged into an existing unbought row with the same name, unit and source, by summing the amounts.',
  })
);

export const bulkShoppingItemsSchema = component(
  'BulkShoppingListItemsRequest',
  z.object({ items: z.array(shoppingItemInputSchema).min(1) })
);

export const updateShoppingItemSchema = component(
  'UpdateShoppingListItemRequest',
  z.object({
    name: z.string().min(1).optional(),
    amount: z.string().optional(),
    unit: z.string().optional(),
    bought: z.boolean().optional(),
  })
);

export const setBoughtSchema = component(
  'SetBoughtRequest',
  z.object({
    ids: z.array(z.uuid()).min(1),
    bought: z.boolean().default(true),
  })
);

export const shoppingHistoryEntrySchema = component(
  'ShoppingHistoryEntry',
  z.object({
    id: z.uuid(),
    userId: z.uuid(),
    items: z.array(
      z.object({
        name: z.string(),
        amount: z.string(),
        unit: z.string(),
        recipeId: z.uuid().nullish(),
        recipeTitle: z.string().nullish(),
      })
    ).meta({ description: 'Snapshot of what was bought when the list was cleared.' }),
    createdAt: dateTime(),
  })
);

export const clearShoppingListResultSchema = component(
  'ClearShoppingListResult',
  z.object({
    entry: shoppingHistoryEntrySchema.nullable().meta({
      description: 'The history entry the cleared items were filed under, or null if nothing was ticked off.',
    }),
  })
);
