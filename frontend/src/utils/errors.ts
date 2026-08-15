import type { AiErrorBody } from '../api/ai.api';

export function getErrorMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
  return msg || fallback;
}

export interface AiFailure {
  message: string;
  code: string;
  retryable: boolean;
  retryAfterSeconds?: number;
}

/**
 * The AI endpoints answer failures with a message written for the user plus a
 * stable code, so the UI can show the message as-is and only has to special-case
 * the handful of codes that change what it offers next.
 */
export function getAiFailure(err: unknown): AiFailure {
  const response = (err as { response?: { status?: number; data?: Partial<AiErrorBody> } })?.response;
  const body = response?.data;

  if (body?.error && body.code) {
    return {
      message: body.error,
      code: body.code,
      retryable: !!body.retryable,
      retryAfterSeconds: body.retryAfterSeconds,
    };
  }

  // No structured body: either the network dropped or something upstream of the
  // route (a proxy, the SPA fallback) answered instead.
  if (!response) {
    return { message: 'Could not reach the server. Check your connection and try again.', code: 'NETWORK', retryable: true };
  }
  return {
    message: body?.error || 'Something went wrong talking to the AI assistant. Please try again.',
    code: 'UNKNOWN',
    retryable: true,
  };
}
