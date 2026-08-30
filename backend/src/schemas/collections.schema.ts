import { z } from 'zod';
import { component } from '../openapi/registry.js';
import { dateTime, roleSchema, userRefSchema } from './common.schema.js';
import { recipeListItemSchema } from './recipes.schema.js';

export const membershipSchema = component(
  'CollectionMembership',
  z.object({
    id: z.uuid(),
    collectionId: z.uuid(),
    userId: z.uuid(),
    role: roleSchema,
    user: userRefSchema.optional(),
  })
);

export const ownershipTransferSchema = component(
  'OwnershipTransfer',
  z.object({
    id: z.uuid(),
    collectionId: z.uuid(),
    fromUserId: z.uuid(),
    toUserId: z.uuid(),
    createdAt: dateTime(),
    fromUser: userRefSchema.optional(),
    toUser: userRefSchema.optional(),
  }).meta({
    description: 'A pending hand-over of a collection. At most one per collection.',
  })
);

const collectionCore = {
  id: z.uuid(),
  name: z.string(),
  isDefault: z.boolean().meta({
    description:
      "True for a user's own recipe book — the collection that always holds everything they own. " +
      'A book cannot be renamed, deleted or handed over, and everyone else on it is a VIEWER.',
  }),
  defaultForUserId: z.uuid().nullable(),
  defaultForUser: userRefSchema.nullable().optional(),
  createdAt: dateTime(),
  members: z.array(membershipSchema),
  pendingTransfer: ownershipTransferSchema.nullable().optional(),
};

export const collectionSummarySchema = component(
  'CollectionSummary',
  z.object({
    ...collectionCore,
    _count: z.object({ recipes: z.number().int() }).optional(),
  })
);

export const collectionRecipeSchema = component(
  'CollectionRecipe',
  z.object({
    id: z.string().meta({ description: 'The membership row\'s id. Synthetic ("default:<recipeId>") inside a recipe book.' }),
    recipeId: z.uuid(),
    collectionId: z.uuid(),
    addedById: z.uuid(),
    addedBy: userRefSchema.optional(),
    recipe: recipeListItemSchema,
  })
);

export const collectionSchema = component(
  'Collection',
  z.object({
    ...collectionCore,
    recipes: z.array(collectionRecipeSchema),
  })
);

export const incomingTransferSchema = component(
  'IncomingTransfer',
  ownershipTransferSchema.extend({
    collection: z.object({
      id: z.uuid(),
      name: z.string(),
      isDefault: z.boolean(),
      defaultForUserId: z.uuid().nullable(),
      createdAt: dateTime(),
      _count: z.object({ recipes: z.number().int() }),
    }),
  })
);

export const createCollectionSchema = component(
  'CreateCollectionRequest',
  z.object({ name: z.string().min(1).max(100) })
);

export const renameCollectionSchema = component(
  'RenameCollectionRequest',
  z.object({ name: z.string().min(1).max(100) })
);

export const addMemberSchema = component(
  'AddCollectionMemberRequest',
  z.object({
    userId: z.uuid().meta({ description: 'Find it with GET /users/search.' }),
    role: roleSchema,
  })
);

export const updateMemberRoleSchema = component(
  'UpdateMemberRoleRequest',
  z.object({ role: roleSchema })
);

export const addCollectionRecipeSchema = component(
  'AddCollectionRecipeRequest',
  z.object({ recipeId: z.uuid() })
);

export const transferOwnershipSchema = component(
  'TransferOwnershipRequest',
  z.object({ toUserId: z.uuid().meta({ description: 'Must already be a member of the collection.' }) })
);
