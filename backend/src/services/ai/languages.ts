/**
 * The languages the assistant can be asked to work in.
 *
 * One list, served to the browser by `GET /ai/languages`, so the dropdown in
 * the preferences and the validation on the way back in can never drift apart.
 * Codes are BCP-47: a bare primary subtag unless the written forms genuinely
 * differ (`pt` vs `pt-BR`, `zh` vs `zh-Hant`).
 */

export interface AiLanguage {
  /** BCP-47 tag, stored on the user and sent to the model by name. */
  code: string;
  /** English name — what the model is told to write in. */
  name: string;
  /** The language's own name, for the dropdown. */
  nativeName: string;
}

/** What everyone who never picked anything gets. */
export const DEFAULT_AI_LANGUAGE = 'en';

// English first (the fallback everything lands on), then alphabetical by name.
export const AI_LANGUAGES: AiLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'pt-BR', name: 'Brazilian Portuguese', nativeName: 'Português brasileiro' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti' },
  { code: 'tl', name: 'Filipino', nativeName: 'Filipino' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақша' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски' },
  { code: 'zh', name: 'Simplified Chinese', nativeName: '简体中文' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'zh-Hant', name: 'Traditional Chinese', nativeName: '繁體中文' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
];

const BY_CODE = new Map(AI_LANGUAGES.map((lang) => [lang.code.toLowerCase(), lang]));

export function isSupportedLanguage(code: string): boolean {
  return BY_CODE.has(code.toLowerCase());
}

/**
 * The English name the prompts use. Falls back to English rather than throwing:
 * a code that somehow got past validation must not cost anyone their request.
 */
export function getLanguageName(code: string): string {
  return BY_CODE.get(code.toLowerCase())?.name ?? 'English';
}

/**
 * Maps a browser language tag onto one of the codes above — "de-AT" to German,
 * "zh-TW" to Traditional Chinese — or null when nothing here matches.
 */
export function resolveLanguageTag(tag: string): string | null {
  const cleaned = tag.trim().toLowerCase();
  if (!cleaned) return null;

  const exact = BY_CODE.get(cleaned);
  if (exact) return exact.code;

  const [primary, ...rest] = cleaned.split('-');

  // Chinese is written in two scripts, and which one a tag means is carried by
  // its script or its region rather than by the primary subtag.
  if (primary === 'zh') {
    const traditional = rest.some((part) => ['hant', 'tw', 'hk', 'mo'].includes(part));
    return traditional ? 'zh-Hant' : 'zh';
  }

  return BY_CODE.get(primary)?.code ?? null;
}

/**
 * Picks a language out of an `Accept-Language` header, best quality first.
 * Used at registration for clients that send no explicit preference.
 */
export function resolveAcceptLanguage(header: string | undefined): string | null {
  if (!header) return null;

  const candidates = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.split(';').map((s) => s.trim());
      const q = params.find((p) => p.startsWith('q='));
      const quality = q ? Number.parseFloat(q.slice(2)) : 1;
      return { tag, quality: Number.isFinite(quality) ? quality : 0 };
    })
    .filter((entry) => entry.tag && entry.tag !== '*' && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of candidates) {
    const resolved = resolveLanguageTag(tag);
    if (resolved) return resolved;
  }
  return null;
}
