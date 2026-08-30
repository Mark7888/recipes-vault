import { body, errors, type Json, pathParam, publicOperation, res } from '../helpers.js';

export const authPaths: Json = {
  '/auth/invites/{token}': {
    get: {
      ...publicOperation,
      tags: ['Auth'],
      operationId: 'checkInvite',
      summary: 'Check an invite token',
      description: 'Whether an invite link can still be used to register.',
      parameters: [pathParam('token', 'The invite token from the link.', { type: 'string' })],
      responses: { 200: res('The token\'s status.', 'InviteStatus'), 429: errors.tooManyRequests },
    },
  },

  '/auth/register': {
    post: {
      ...publicOperation,
      tags: ['Auth'],
      operationId: 'register',
      summary: 'Register with an invite',
      description: 'Consumes the invite, creates the account and its recipe book, and signs you in.',
      requestBody: body('RegisterRequest'),
      responses: {
        201: res('The account was created.', 'AuthResult'),
        400: errors.badRequest,
        409: errors.conflict,
        429: errors.tooManyRequests,
      },
    },
  },

  '/auth/login': {
    post: {
      ...publicOperation,
      tags: ['Auth'],
      operationId: 'login',
      summary: 'Sign in',
      description:
        'Returns a 15-minute access token and sets the refresh cookie. API clients normally want an API ' +
        'key instead — see the Authentication section.',
      requestBody: body('LoginRequest'),
      responses: {
        200: res('Signed in.', 'AuthResult'),
        401: res('Wrong username or password.', 'Error'),
        429: errors.tooManyRequests,
      },
    },
  },

  '/auth/refresh': {
    post: {
      ...publicOperation,
      tags: ['Auth'],
      operationId: 'refreshAccessToken',
      summary: 'Renew the access token',
      description: 'Reads the httpOnly refresh cookie set at login.',
      responses: {
        200: res('A fresh access token.', 'AccessToken'),
        401: res('No usable refresh cookie.', 'Error'),
        429: errors.tooManyRequests,
      },
    },
  },

  '/auth/logout': {
    post: {
      ...publicOperation,
      tags: ['Auth'],
      operationId: 'logout',
      summary: 'Clear the refresh cookie',
      description: 'Does not touch API keys — revoke those from Settings, or with DELETE /api-keys/{id}.',
      responses: { 200: res('Signed out.', 'Ok'), 429: errors.tooManyRequests },
    },
  },

  '/auth/reset-password': {
    post: {
      ...publicOperation,
      tags: ['Auth'],
      operationId: 'resetPassword',
      summary: 'Set a new password from a reset link',
      requestBody: body('ResetPasswordRequest'),
      responses: { 200: res('The password was changed.', 'Ok'), 400: errors.badRequest, 429: errors.tooManyRequests },
    },
  },
};
