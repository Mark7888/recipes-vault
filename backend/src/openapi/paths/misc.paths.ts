import {
  arrayOf,
  authedErrors,
  body,
  errors,
  type Json,
  pathParam,
  queryParam,
  res,
  SESSION_ONLY_NOTE,
} from '../helpers.js';

/** Users, tags and the shopping list — small surfaces that do not each need their own file. */

export const userPaths: Json = {
  '/users/me': {
    get: {
      tags: ['Users'],
      operationId: 'getCurrentUser',
      summary: 'Who am I',
      description: 'Resolves the credential to an account — handy for checking which key you are holding.',
      responses: { 200: res('Your account.', 'CurrentUser'), ...authedErrors },
    },
    patch: {
      tags: ['Users'],
      operationId: 'updateCurrentUser',
      summary: 'Change your username or password',
      description: 'The current password is always required.' + SESSION_ONLY_NOTE,
      requestBody: body('UpdateCurrentUserRequest'),
      responses: {
        200: res('The updated account.', 'UpdatedUser'),
        400: errors.badRequest,
        401: res('The current password was wrong.', 'Error'),
        403: errors.forbidden,
        409: res('That username is taken.', 'Error'),
        429: errors.tooManyRequests,
      },
    },
  },

  '/users/search': {
    get: {
      tags: ['Users'],
      operationId: 'searchUsers',
      summary: 'Find users to share with',
      description: 'Needs at least two characters; returns at most ten. Yourself is never in the results.',
      parameters: [queryParam('q', 'Part of a username.', { type: 'string', minLength: 2 })],
      responses: { 200: res('Matching users.', arrayOf('UserRef')), ...authedErrors },
    },
  },
};

export const tagPaths: Json = {
  '/tags': {
    get: {
      tags: ['Tags'],
      operationId: 'searchTags',
      summary: 'Search tags',
      description: 'Tags are global across the instance. At most 20 matches.',
      parameters: [queryParam('search', 'Part of a tag name.', { type: 'string' })],
      responses: { 200: res('Matching tags.', arrayOf('Tag')), ...authedErrors },
    },
  },

  '/tags/all': {
    get: {
      tags: ['Tags'],
      operationId: 'listAllTags',
      summary: 'List every tag with its use count',
      responses: { 200: res('All tags, by name.', arrayOf('TagWithCount')), ...authedErrors },
    },
  },

  '/tags/{id}': {
    patch: {
      tags: ['Tags'],
      operationId: 'renameTag',
      summary: 'Rename a tag',
      description: 'Names are lower-cased. Renaming onto an existing name is refused — merge instead.',
      parameters: [pathParam('id', 'The tag.')],
      requestBody: body('RenameTagRequest'),
      responses: { 200: res('The renamed tag.', 'Tag'), 400: errors.badRequest, ...authedErrors },
    },
    delete: {
      tags: ['Tags'],
      operationId: 'deleteTag',
      summary: 'Delete a tag',
      description: 'Removes it from every recipe that carried it.',
      parameters: [pathParam('id', 'The tag.')],
      responses: { 204: res('Deleted.'), 400: errors.badRequest, ...authedErrors },
    },
  },

  '/tags/{id}/merge': {
    post: {
      tags: ['Tags'],
      operationId: 'mergeTag',
      summary: 'Merge a tag into another',
      description: 'Moves this tag\'s recipes onto the target and deletes this one.',
      parameters: [pathParam('id', 'The tag to merge away.')],
      requestBody: body('MergeTagRequest'),
      responses: { 200: res('The surviving tag.', 'Tag'), 400: errors.badRequest, ...authedErrors },
    },
  },
};

export const shoppingListPaths: Json = {
  '/shopping-list': {
    get: {
      tags: ['Shopping list'],
      operationId: 'getShoppingList',
      summary: 'Get your shopping list',
      responses: { 200: res('Items, oldest first.', arrayOf('ShoppingListItem')), ...authedErrors },
    },
  },

  '/shopping-list/items': {
    post: {
      tags: ['Shopping list'],
      operationId: 'addShoppingListItem',
      summary: 'Add one item',
      requestBody: body('ShoppingListItemInput'),
      responses: {
        201: res('The rows that were touched, merges included.', arrayOf('ShoppingListItem')),
        400: errors.badRequest,
        ...authedErrors,
      },
    },
  },

  '/shopping-list/items/bulk': {
    post: {
      tags: ['Shopping list'],
      operationId: 'addShoppingListItems',
      summary: 'Add several items at once',
      description: 'How a recipe\'s ingredients land on the list.',
      requestBody: body('BulkShoppingListItemsRequest'),
      responses: {
        201: res('The rows that were touched.', arrayOf('ShoppingListItem')),
        400: errors.badRequest,
        ...authedErrors,
      },
    },
  },

  '/shopping-list/items/{id}': {
    patch: {
      tags: ['Shopping list'],
      operationId: 'updateShoppingListItem',
      summary: 'Edit an item',
      parameters: [pathParam('id', 'The item.')],
      requestBody: body('UpdateShoppingListItemRequest'),
      responses: { 200: res('Updated.', 'Ok'), 400: errors.badRequest, 404: errors.notFound, ...authedErrors },
    },
    delete: {
      tags: ['Shopping list'],
      operationId: 'deleteShoppingListItem',
      summary: 'Remove an item',
      parameters: [pathParam('id', 'The item.')],
      responses: { 204: res('Removed.'), 404: errors.notFound, ...authedErrors },
    },
  },

  '/shopping-list/bought': {
    post: {
      tags: ['Shopping list'],
      operationId: 'setShoppingItemsBought',
      summary: 'Tick items off (or back on)',
      requestBody: body('SetBoughtRequest'),
      responses: {
        200: res('The updated items.', arrayOf('ShoppingListItem')),
        400: errors.badRequest,
        ...authedErrors,
      },
    },
  },

  '/shopping-list/clear': {
    post: {
      tags: ['Shopping list'],
      operationId: 'clearShoppingList',
      summary: 'Clear the list',
      description: 'Files what was ticked off into history and empties the list, unbought items included.',
      responses: { 200: res('The history entry, if anything was bought.', 'ClearShoppingListResult'), ...authedErrors },
    },
  },

  '/shopping-list/history': {
    get: {
      tags: ['Shopping list'],
      operationId: 'getShoppingHistory',
      summary: 'Past shopping trips',
      responses: { 200: res('History, newest first.', arrayOf('ShoppingHistoryEntry')), ...authedErrors },
    },
  },

  '/shopping-list/history/{id}/readd': {
    post: {
      tags: ['Shopping list'],
      operationId: 'readdShoppingHistoryEntry',
      summary: 'Put a past trip back on the list',
      parameters: [pathParam('id', 'The history entry.')],
      responses: {
        200: res('The items now on the list.', arrayOf('ShoppingListItem')),
        404: errors.notFound,
        ...authedErrors,
      },
    },
  },

  '/shopping-list/history/{id}': {
    delete: {
      tags: ['Shopping list'],
      operationId: 'deleteShoppingHistoryEntry',
      summary: 'Delete a history entry',
      parameters: [pathParam('id', 'The history entry.')],
      responses: { 204: res('Deleted.'), 404: errors.notFound, ...authedErrors },
    },
  },
};
