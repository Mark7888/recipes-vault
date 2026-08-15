import { apiClient } from './client';

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Attached screenshots as data URLs; only ever set on user messages. */
  images?: string[];
}

export interface AiStatus {
  /** The server has an API key — without it the assistant does not exist. */
  configured: boolean;
  /** This account is allowed to use it (an admin turned it on). */
  enabled: boolean;
  model: string | null;
}

export interface AiChatResponse {
  message: AiChatMessage;
  truncated: boolean;
}

/** Shape of every failure the AI endpoints return. */
export interface AiErrorBody {
  error: string;
  code: string;
  retryable: boolean;
  retryAfterSeconds?: number;
}

export interface AiCaptureParams {
  url: string;
  /**
   * Re-parsing an existing recipe: the AI result replaces it rather than
   * creating a second copy of the same page.
   */
  recipeId?: string;
}

export const aiApi = {
  status: () => apiClient.get<AiStatus>('/ai/status').then(r => r.data),

  chat: (messages: AiChatMessage[]) =>
    apiClient.post<AiChatResponse>('/ai/chat', { messages }).then(r => r.data),

  createRecipe: (messages: AiChatMessage[]) =>
    apiClient.post<{ recipeId: string }>('/ai/recipe', { messages }).then(r => r.data),

  capture: ({ url, recipeId }: AiCaptureParams) =>
    apiClient.post<{ recipeId: string }>('/ai/capture', { url, ...(recipeId ? { recipeId } : {}) })
      .then(r => r.data),
};
