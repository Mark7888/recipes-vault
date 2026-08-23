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
  /** BCP-47 code the assistant answers and writes recipes in by default. */
  language: string;
}

/** One entry of the language dropdown, as the server lists them. */
export interface AiLanguage {
  code: string;
  /** English name, e.g. "German". */
  name: string;
  /** The language's own name, e.g. "Deutsch". */
  nativeName: string;
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
  /** Extra wording from the user, e.g. "translate it to German". */
  instructions?: string;
}

export interface AiReworkParams {
  recipeId: string;
  /** What the AI should do with the saved recipe. Required — it is the whole ask. */
  instructions: string;
}

export const aiApi = {
  status: () => apiClient.get<AiStatus>('/ai/status').then(r => r.data),

  languages: () => apiClient.get<AiLanguage[]>('/ai/languages').then(r => r.data),

  setLanguage: (language: string) =>
    apiClient.patch<{ language: string }>('/ai/language', { language }).then(r => r.data),

  chat: (messages: AiChatMessage[]) =>
    apiClient.post<AiChatResponse>('/ai/chat', { messages }).then(r => r.data),

  createRecipe: (messages: AiChatMessage[]) =>
    apiClient.post<{ recipeId: string }>('/ai/recipe', { messages }).then(r => r.data),

  capture: ({ url, recipeId, instructions }: AiCaptureParams) =>
    apiClient.post<{ recipeId: string }>('/ai/capture', {
      url,
      ...(recipeId ? { recipeId } : {}),
      ...(instructions?.trim() ? { instructions: instructions.trim() } : {}),
    }).then(r => r.data),

  rework: ({ recipeId, instructions }: AiReworkParams) =>
    apiClient.post<{ recipeId: string }>('/ai/rework', { recipeId, instructions: instructions.trim() })
      .then(r => r.data),
};
