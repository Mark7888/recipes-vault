import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  ADMIN_USERNAME: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(8),
  IMAGES_DIR: z.string().default('./data/images'),
  // Public origin of the deployment (e.g. https://recipes.example.com). Only
  // needed for the absolute URLs in link previews, and only when the reverse
  // proxy in front of the app does not forward X-Forwarded-Proto / Host.
  // An empty value is the same as unset — Docker Compose always passes the
  // variable through, set or not.
  PUBLIC_BASE_URL: z.union([z.string().url(), z.literal('')]).optional(),
  FETCH_TIMEOUT_MS: z.coerce.number().default(10000),
  FETCH_MAX_BYTES: z.coerce.number().default(10 * 1024 * 1024), // 10MB

  // ── AI recipe assistant (OpenRouter) ──
  // Leaving OPENROUTER_API_KEY empty disables the assistant entirely: the API
  // reports it as unavailable and the frontend hides the chat option.
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  // Any OpenRouter model slug — swap it without touching code. The model must
  // support image input and structured (JSON schema) output.
  OPENROUTER_MODEL: z.string().default('google/gemini-3.1-flash-lite'),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().default(2048),
  AI_TIMEOUT_MS: z.coerce.number().default(60000),
  // Per-user request budget for the assistant (both chat and extraction).
  AI_RATE_LIMIT_PER_MINUTE: z.coerce.number().default(20),
  // How much of a page's text is handed to the model when a URL is parsed with
  // AI. Keeps the prompt — and its cost — bounded on bloated pages.
  AI_PAGE_MAX_CHARS: z.coerce.number().default(24000),
  // Sent to OpenRouter as HTTP-Referer / X-Title, which is what powers their
  // app leaderboard and makes requests identifiable in the dashboard.
  AI_APP_URL: z.string().optional(),
  AI_APP_NAME: z.string().default('RecipeVault'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();
