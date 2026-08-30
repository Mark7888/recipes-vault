import { arrayOf, authedErrors, body, errors, type Json, pathParam, res } from '../helpers.js';

const collectionId = pathParam('id', 'The collection.');

/** Every write here answers 400 when the service refuses (wrong role, a book, a pending transfer). */
const writeErrors = {
  400: errors.badRequest,
  403: errors.forbidden,
  ...authedErrors,
} as const;

export const collectionPaths: Json = {
  '/collections': {
    get: {
      tags: ['Collections'],
      operationId: 'listCollections',
      summary: 'List the collections you are in',
      description: 'Includes your own recipe book, which is created on first read if it does not exist yet.',
      responses: { 200: res('Your collections.', arrayOf('CollectionSummary')), ...authedErrors },
    },
    post: {
      tags: ['Collections'],
      operationId: 'createCollection',
      summary: 'Create a collection',
      requestBody: body('CreateCollectionRequest'),
      responses: { 201: res('The new collection, with you as OWNER.', 'CollectionSummary'), ...writeErrors },
    },
  },

  '/collections/transfers/incoming': {
    get: {
      tags: ['Collections'],
      operationId: 'listIncomingTransfers',
      summary: 'Collections someone wants to hand you',
      responses: { 200: res('Pending transfers addressed to you.', arrayOf('IncomingTransfer')), ...authedErrors },
    },
  },

  '/collections/{id}': {
    get: {
      tags: ['Collections'],
      operationId: 'getCollection',
      summary: 'Get a collection and its recipes',
      description: 'Any member may read. A recipe book lists everything its owner owns.',
      parameters: [collectionId],
      responses: {
        200: res('The collection.', 'Collection'),
        403: errors.forbidden,
        404: errors.notFound,
        ...authedErrors,
      },
    },
    patch: {
      tags: ['Collections'],
      operationId: 'renameCollection',
      summary: 'Rename a collection',
      description: 'OWNER only. A recipe book cannot be renamed.',
      parameters: [collectionId],
      requestBody: body('RenameCollectionRequest'),
      responses: { 200: res('The renamed collection.', 'CollectionSummary'), ...writeErrors },
    },
    delete: {
      tags: ['Collections'],
      operationId: 'deleteCollection',
      summary: 'Delete a collection',
      description: 'OWNER only. The recipes themselves are not deleted. A recipe book cannot be deleted.',
      parameters: [collectionId],
      responses: { 204: res('Deleted.'), ...writeErrors },
    },
  },

  '/collections/{id}/members': {
    post: {
      tags: ['Collections'],
      operationId: 'addCollectionMember',
      summary: 'Share a collection with someone',
      description: 'OWNER only. Everyone added to a recipe book is a VIEWER.',
      parameters: [collectionId],
      requestBody: body('AddCollectionMemberRequest'),
      responses: { 201: res('The new membership.', 'CollectionMembership'), ...writeErrors },
    },
  },

  '/collections/{id}/members/{userId}': {
    patch: {
      tags: ['Collections'],
      operationId: 'updateCollectionMemberRole',
      summary: 'Change a member\'s role',
      description: 'OWNER only. Ownership moves through a transfer, not through this.',
      parameters: [collectionId, pathParam('userId', 'The member.')],
      requestBody: body('UpdateMemberRoleRequest'),
      responses: { 200: res('The updated membership.', 'CollectionMembership'), ...writeErrors },
    },
    delete: {
      tags: ['Collections'],
      operationId: 'removeCollectionMember',
      summary: 'Remove a member',
      description: 'OWNER only.',
      parameters: [collectionId, pathParam('userId', 'The member.')],
      responses: { 204: res('Removed.'), ...writeErrors },
    },
  },

  '/collections/{id}/leave': {
    post: {
      tags: ['Collections'],
      operationId: 'leaveCollection',
      summary: 'Leave a collection',
      description: 'Any member but the OWNER, who has to hand it over or delete it instead.',
      parameters: [collectionId],
      responses: { 204: res('You are no longer a member.'), ...writeErrors },
    },
  },

  '/collections/{id}/transfer': {
    post: {
      tags: ['Collections'],
      operationId: 'transferCollectionOwnership',
      summary: 'Offer ownership to another member',
      description: 'OWNER only. Nothing changes until they accept; you become an EDITOR when they do.',
      parameters: [collectionId],
      requestBody: body('TransferOwnershipRequest'),
      responses: { 201: res('The pending transfer.', 'OwnershipTransfer'), ...writeErrors },
    },
  },

  '/collections/{id}/transfer/cancel': {
    post: {
      tags: ['Collections'],
      operationId: 'cancelCollectionTransfer',
      summary: 'Withdraw a transfer you offered',
      description: 'Sender only. Already resolved counts as success — the transfer is gone either way.',
      parameters: [collectionId],
      responses: { 204: res('No transfer is pending.'), ...writeErrors },
    },
  },

  '/collections/{id}/transfer/accept': {
    post: {
      tags: ['Collections'],
      operationId: 'acceptCollectionTransfer',
      summary: 'Accept ownership',
      description: 'Recipient only. You become OWNER and the sender becomes an EDITOR.',
      parameters: [collectionId],
      responses: { 204: res('You now own it.'), ...writeErrors },
    },
  },

  '/collections/{id}/transfer/reject': {
    post: {
      tags: ['Collections'],
      operationId: 'rejectCollectionTransfer',
      summary: 'Decline ownership',
      description: 'Recipient only. Roles are left as they were.',
      parameters: [collectionId],
      responses: { 204: res('Declined.'), ...writeErrors },
    },
  },

  '/collections/{id}/recipes': {
    post: {
      tags: ['Collections'],
      operationId: 'addRecipeToCollection',
      summary: 'Put a recipe in a collection',
      description: 'OWNER or EDITOR. A recipe book fills itself, so it rejects this.',
      parameters: [collectionId],
      requestBody: body('AddCollectionRecipeRequest'),
      responses: { 201: res('The recipe is in the collection.', 'CollectionRecipe'), ...writeErrors },
    },
  },

  '/collections/{id}/recipes/{recipeId}': {
    delete: {
      tags: ['Collections'],
      operationId: 'removeRecipeFromCollection',
      summary: 'Take a recipe out of a collection',
      description: 'OWNER or EDITOR — an EDITOR may only remove what they added themselves.',
      parameters: [collectionId, pathParam('recipeId', 'The recipe to remove.')],
      responses: { 204: res('Removed.'), ...writeErrors },
    },
  },
};
