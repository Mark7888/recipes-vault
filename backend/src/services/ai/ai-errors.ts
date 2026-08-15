/**
 * Every failure the AI assistant can produce is normalized into an AiError so
 * controllers never have to interpret provider-specific payloads, and the
 * frontend always gets a stable `code` plus a message it can show as-is.
 */
export type AiErrorCode =
  | 'AI_NOT_CONFIGURED'
  | 'AI_FORBIDDEN'
  | 'AI_INVALID_REQUEST'
  | 'AI_RATE_LIMITED'
  | 'AI_QUOTA_EXHAUSTED'
  | 'AI_CONTEXT_TOO_LONG'
  | 'AI_TIMEOUT'
  | 'AI_UNAVAILABLE'
  | 'AI_CONTENT_FILTERED'
  | 'AI_TRUNCATED'
  | 'AI_BAD_RESPONSE'
  | 'AI_NO_RECIPE'
  | 'AI_PAGE_UNREACHABLE'
  | 'AI_PAGE_EMPTY';

interface AiErrorOptions {
  /** HTTP status to answer the browser with. */
  status: number;
  /** Whether hitting "try again" has any chance of working. */
  retryable: boolean;
  /** Seconds to wait before retrying, when the provider told us. */
  retryAfterSeconds?: number;
  /** Provider-side detail — logged, never sent to the browser. */
  detail?: string;
}

export class AiError extends Error {
  readonly code: AiErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly retryAfterSeconds?: number;
  readonly detail?: string;

  constructor(code: AiErrorCode, message: string, options: AiErrorOptions) {
    super(message);
    this.name = 'AiError';
    this.code = code;
    this.status = options.status;
    this.retryable = options.retryable;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.detail = options.detail;
  }

  toResponseBody(): { error: string; code: AiErrorCode; retryable: boolean; retryAfterSeconds?: number } {
    return {
      error: this.message,
      code: this.code,
      retryable: this.retryable,
      ...(this.retryAfterSeconds !== undefined && { retryAfterSeconds: this.retryAfterSeconds }),
    };
  }
}

export const aiErrors = {
  notConfigured: () =>
    new AiError('AI_NOT_CONFIGURED', 'The AI assistant is not configured on this server.', {
      status: 503,
      retryable: false,
    }),

  forbidden: () =>
    new AiError('AI_FORBIDDEN', 'The AI assistant is not enabled for your account. Ask an admin to turn it on.', {
      status: 403,
      retryable: false,
    }),

  rateLimited: (retryAfterSeconds?: number, detail?: string) =>
    new AiError('AI_RATE_LIMITED', 'Too many requests to the AI assistant. Give it a moment and try again.', {
      status: 429,
      retryable: true,
      retryAfterSeconds,
      detail,
    }),

  quotaExhausted: (detail?: string) =>
    new AiError(
      'AI_QUOTA_EXHAUSTED',
      'The AI account is out of credits, so the assistant is unavailable until it is topped up.',
      { status: 402, retryable: false, detail }
    ),

  contextTooLong: (detail?: string) =>
    new AiError(
      'AI_CONTEXT_TOO_LONG',
      'This conversation got too long for the model. Start a new chat (or remove some screenshots) and try again.',
      { status: 413, retryable: false, detail }
    ),

  timeout: (detail?: string) =>
    new AiError('AI_TIMEOUT', 'The AI assistant took too long to answer. Please try again.', {
      status: 504,
      retryable: true,
      detail,
    }),

  unavailable: (detail?: string) =>
    new AiError('AI_UNAVAILABLE', 'The AI model is unavailable right now. Please try again in a bit.', {
      status: 503,
      retryable: true,
      detail,
    }),

  contentFiltered: (detail?: string) =>
    new AiError('AI_CONTENT_FILTERED', 'The AI provider refused this request. Try rewording your message.', {
      status: 422,
      retryable: false,
      detail,
    }),

  truncated: () =>
    new AiError('AI_TRUNCATED', 'The AI reply was cut off before it finished. Try again or ask for something shorter.', {
      status: 502,
      retryable: true,
    }),

  badResponse: (detail?: string) =>
    new AiError('AI_BAD_RESPONSE', 'The AI returned something unexpected. Please try again.', {
      status: 502,
      retryable: true,
      detail,
    }),

  noRecipe: () =>
    new AiError(
      'AI_NO_RECIPE',
      "There is no complete recipe in this chat yet. Ask the assistant for one first, then try saving again.",
      { status: 422, retryable: false }
    ),

  pageUnreachable: (detail?: string) =>
    new AiError(
      'AI_PAGE_UNREACHABLE',
      "Couldn't open that page, so there was nothing to hand the AI. Check the link and try again.",
      { status: 502, retryable: true, detail }
    ),

  pageEmpty: () =>
    new AiError(
      'AI_PAGE_EMPTY',
      'That page had no readable text to work from. It probably needs JavaScript or a login to show the recipe.',
      { status: 422, retryable: false }
    ),

  invalidRequest: (message: string) =>
    new AiError('AI_INVALID_REQUEST', message, { status: 400, retryable: false }),
};
