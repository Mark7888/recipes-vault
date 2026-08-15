import axios, { AxiosError } from 'axios';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { AiError, aiErrors } from './ai-errors.js';

/**
 * Thin OpenRouter (OpenAI-compatible) chat-completions client. Nothing above
 * this file knows which provider is in use — swapping models is an env change,
 * and swapping providers means reimplementing only this module.
 */

export type ChatRole = 'user' | 'assistant';

/** A turn as it travels between the browser and this server. */
export interface ChatMessage {
  role: ChatRole;
  content: string;
  /** Attached screenshots, as `data:image/...;base64,...` URLs. */
  images?: string[];
}

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

interface ProviderMessage {
  role: 'system' | ChatRole;
  content: string | ContentPart[];
}

interface CompletionRequest {
  system: string;
  messages: ChatMessage[];
  /** OpenAI-style `response_format`, for structured output. */
  responseFormat?: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
}

export interface CompletionResult {
  content: string;
  /** True when the model hit the output budget mid-answer. */
  truncated: boolean;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

interface ProviderResponse {
  choices?: {
    message?: { content?: string | ContentPart[] | null };
    finish_reason?: string | null;
    native_finish_reason?: string | null;
    error?: { code?: number | string; message?: string };
  }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  error?: { code?: number | string; message?: string; metadata?: Record<string, unknown> };
}

export function isAiConfigured(): boolean {
  return !!env.OPENROUTER_API_KEY;
}

export function getAiModel(): string {
  return env.OPENROUTER_MODEL;
}

function toProviderMessages(system: string, messages: ChatMessage[]): ProviderMessage[] {
  const out: ProviderMessage[] = [{ role: 'system', content: system }];
  for (const message of messages) {
    // Images only ever ride along with user turns, and a multipart body is
    // only worth building when there actually are attachments.
    if (message.role === 'user' && message.images && message.images.length > 0) {
      const parts: ContentPart[] = message.images.map((url) => ({ type: 'image_url' as const, image_url: { url } }));
      out.push({
        role: 'user',
        content: [{ type: 'text', text: message.content || 'Please look at the attached image(s).' }, ...parts],
      });
    } else {
      out.push({ role: message.role, content: message.content });
    }
  }
  return out;
}

/** Flattens the content of a reply, which may come back as parts rather than a string. */
function readContent(raw: string | ContentPart[] | null | undefined): string {
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) {
    return raw
      .map((part) => (part.type === 'text' ? part.text : ''))
      .join('')
      .trim();
  }
  return '';
}

function looksLikeContextOverflow(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('context length') ||
    lower.includes('context_length') ||
    lower.includes('maximum context') ||
    lower.includes('too many tokens') ||
    lower.includes('token limit') ||
    lower.includes('prompt is too long')
  );
}

/**
 * Turns whatever the provider said into an AiError. OpenRouter reports failures
 * two ways: as an HTTP status, and as a 200 response carrying an `error` object
 * (that is what a mid-stream provider failure looks like), so both land here.
 */
function mapProviderError(status: number | undefined, rawMessage: string | undefined, retryAfterHeader?: string): AiError {
  const detail = rawMessage ?? `status ${status ?? 'unknown'}`;
  const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) || undefined : undefined;

  if (rawMessage && looksLikeContextOverflow(rawMessage)) return aiErrors.contextTooLong(detail);

  switch (status) {
    case 400:
      // A 400 from the provider is our bug (or an oversized prompt), never
      // something the user can fix by rephrasing — keep the message generic.
      return aiErrors.badResponse(detail);
    case 401:
      return new AiError('AI_NOT_CONFIGURED', 'The AI API key was rejected. Check the server configuration.', {
        status: 503,
        retryable: false,
        detail,
      });
    case 402:
      return aiErrors.quotaExhausted(detail);
    case 403:
      return aiErrors.contentFiltered(detail);
    case 408:
      return aiErrors.timeout(detail);
    case 413:
      return aiErrors.contextTooLong(detail);
    case 429:
      return aiErrors.rateLimited(retryAfterSeconds, detail);
    case 502:
    case 503:
      return aiErrors.unavailable(detail);
    default:
      if (status && status >= 500) return aiErrors.unavailable(detail);
      return aiErrors.badResponse(detail);
  }
}

export async function requestCompletion(request: CompletionRequest): Promise<CompletionResult> {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) throw aiErrors.notConfigured();

  const body = {
    model: env.OPENROUTER_MODEL,
    messages: toProviderMessages(request.system, request.messages),
    max_tokens: request.maxTokens ?? env.AI_MAX_OUTPUT_TOKENS,
    temperature: request.temperature ?? 0.7,
    ...(request.responseFormat && { response_format: request.responseFormat }),
  };

  let response;
  try {
    response = await axios.post<ProviderResponse>(`${env.OPENROUTER_BASE_URL}/chat/completions`, body, {
      timeout: env.AI_TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(env.AI_APP_URL && { 'HTTP-Referer': env.AI_APP_URL }),
        'X-Title': env.AI_APP_NAME,
      },
    });
  } catch (err) {
    const axiosError = err as AxiosError<{ error?: { message?: string; code?: number | string } }>;

    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      logger.warn({ model: env.OPENROUTER_MODEL }, 'AI request timed out');
      throw aiErrors.timeout(axiosError.message);
    }
    if (!axiosError.response) {
      // DNS failure, refused connection, TLS problem — the provider is simply
      // not reachable from here.
      logger.error({ err: axiosError, model: env.OPENROUTER_MODEL }, 'AI provider unreachable');
      throw aiErrors.unavailable(axiosError.message);
    }

    const { status, data, headers } = axiosError.response;
    const message = data?.error?.message ?? axiosError.message;
    logger.error({ status, message, model: env.OPENROUTER_MODEL }, 'AI provider returned an error');
    throw mapProviderError(status, message, headers?.['retry-after'] as string | undefined);
  }

  const data = response.data;

  // A 200 can still carry a provider-side failure.
  if (data.error) {
    const status = typeof data.error.code === 'number' ? data.error.code : undefined;
    logger.error({ status, message: data.error.message, model: env.OPENROUTER_MODEL }, 'AI provider error in 200 body');
    throw mapProviderError(status, data.error.message);
  }

  const choice = data.choices?.[0];
  if (!choice) {
    logger.error({ model: env.OPENROUTER_MODEL }, 'AI response contained no choices');
    throw aiErrors.badResponse('no choices in response');
  }
  if (choice.error) {
    const status = typeof choice.error.code === 'number' ? choice.error.code : undefined;
    throw mapProviderError(status, choice.error.message);
  }

  const finishReason = choice.finish_reason ?? choice.native_finish_reason ?? null;
  if (finishReason === 'content_filter') throw aiErrors.contentFiltered('finish_reason=content_filter');

  const content = readContent(choice.message?.content);
  if (!content) {
    // An empty body with finish_reason=length means the output budget was spent
    // before a single token of answer made it out.
    if (finishReason === 'length') throw aiErrors.truncated();
    logger.error({ finishReason, model: env.OPENROUTER_MODEL }, 'AI returned an empty message');
    throw aiErrors.badResponse('empty message content');
  }

  // A partial answer is still worth showing in the chat, so surface truncation
  // as a flag and let the caller decide (extraction can't use partial JSON).
  return {
    content,
    truncated: finishReason === 'length',
    usage: {
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens,
    },
  };
}
