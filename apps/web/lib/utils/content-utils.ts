/**
 * Content text utilities — pure, zero dependencies.
 *
 * Text truncation, excerpt generation, sentence extraction, keyword
 * highlighting, markdown snippet building, and sport-specific content
 * helpers for sports picks content and blog post generation.
 */

/**
 * Truncate text to maxLength (including ellipsis length).
 * Breaks at a word boundary when possible.
 * Returns original if text.length <= maxLength.
 */
export function truncate(text: string, maxLength: number, ellipsis = "…"): string {
  if (text.length <= maxLength) return text;
  const budget = maxLength - ellipsis.length;
  if (budget <= 0) return ellipsis.slice(0, maxLength);
  const cut = text.slice(0, budget + 1);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace <= 0) return cut.slice(0, budget).trimEnd() + ellipsis;
  return cut.slice(0, lastSpace).trimEnd() + ellipsis;
}

/**
 * Return first maxWords words followed by ellipsis if the text was truncated.
 * Splits on whitespace.
 */
export function excerpt(text: string, maxWords: number, ellipsis = "…"): string {
  const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length <= maxWords) return words.join(" ");
  return words.slice(0, maxWords).join(" ") + ellipsis;
}

/**
 * Extract the first sentence (ending at ., !, or ?).
 * Returns trimmed result.
 */
export function firstSentence(text: string): string {
  const match = text.match(/^.*?[.!?](?=\s|$)/);
  return match ? match[0].trim() : text.trim();
}

/**
 * Extract the first n sentences.
 * Sentences end at ., !, or ? followed by whitespace or end of string.
 */
export function firstSentences(text: string, n: number): string {
  const re = /.*?[.!?](?=\s|$)/g;
  const sentences: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null && sentences.length < n) {
    sentences.push(match[0].trim());
  }
  return sentences.join(" ");
}

/**
 * Remove HTML tags from string using regex (no DOM).
 * Also decodes basic HTML entities.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'");
}

/**
 * Escape HTML special characters for safe insertion into HTML.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Wrap keyword occurrences in <{tag}>...</{tag}>.
 * Case-insensitive, whole-word matching.
 */
export function highlightKeywords(
  text: string,
  keywords: readonly string[],
  tag = "mark"
): string {
  if (keywords.length === 0) return text;
  let result = text;
  for (const kw of keywords) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "gi");
    result = result.replace(re, (match) => `<${tag}>${match}</${tag}>`);
  }
  return result;
}

/**
 * Title-case exceptions that stay lowercase unless they are the first word.
 */
const TITLE_CASE_EXCEPTIONS = new Set([
  "a", "an", "the", "and", "but", "or", "for", "nor",
  "on", "at", "to", "with", "in", "by", "of", "up",
]);

/**
 * Convert text to title case, respecting common exception words.
 * "chiefs at raiders" → "Chiefs at Raiders"
 */
export function titleCase(text: string): string {
  return text
    .split(/(\s+)/)
    .map((token, index) => {
      if (/^\s+$/.test(token)) return token;
      const lower = token.toLowerCase();
      // First word is always capitalized
      const isFirst = index === 0 || text.slice(0, text.indexOf(token)).trim() === "";
      if (isFirst || !TITLE_CASE_EXCEPTIONS.has(lower)) {
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      }
      return lower;
    })
    .join("");
}

/**
 * Capitalize the first character of the string, leave rest unchanged.
 */
export function sentenceCase(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Count non-empty words split by whitespace.
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Count sentences terminated by ., !, or ?.
 */
export function countSentences(text: string): number {
  const matches = text.match(/[.!?]/g);
  return matches ? matches.length : 0;
}

/**
 * Estimate reading time in minutes (rounded to 1 decimal, minimum 1).
 */
export function readingTimeMinutes(text: string, wpm = 200): number {
  const words = countWords(text);
  const raw = words / wpm;
  return Math.max(1, Math.round(raw * 10) / 10);
}

/**
 * Build a short 1-2 sentence pick summary.
 * Format: "{pick} ({odds}) in {sport}. {reasoning trimmed}"
 */
export function buildPickSummary(params: {
  pick: string;
  sport: string;
  odds: string;
  reasoning?: string;
  maxLength?: number;
}): string {
  const { pick, sport, odds, reasoning, maxLength } = params;
  let result = `${pick} (${odds}) in ${sport}.`;
  if (reasoning) {
    const trimmedReasoning = reasoning.trim();
    if (trimmedReasoning) {
      result = `${result} ${trimmedReasoning}`;
    }
  }
  if (maxLength !== undefined) {
    result = truncate(result, maxLength);
  }
  return result;
}

/**
 * Build a game headline.
 * "{awayTeam} at {homeTeam} — {sport} | {gameTime}"
 */
export function buildHeadline(params: {
  homeTeam: string;
  awayTeam: string;
  sport: string;
  gameTime?: string;
}): string {
  const { homeTeam, awayTeam, sport, gameTime } = params;
  const timePart = gameTime ? ` | ${gameTime}` : "";
  return `${awayTeam} at ${homeTeam} — ${sport}${timePart}`;
}

/**
 * Convert an array of strings to English prose with Oxford comma.
 * ["a", "b", "c"] → "a, b, and c"
 */
export function listToProseEn(items: readonly string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  const last = items[items.length - 1];
  const rest = items.slice(0, -1).join(", ");
  return `${rest}, and ${last}`;
}

/**
 * Convert integer to ordinal string.
 * 1 → "1st", 2 → "2nd", 3 → "3rd", 11 → "11th", 21 → "21st"
 */
export function ordinal(n: number): string {
  const abs = Math.abs(Math.floor(n));
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
}

/**
 * Return "{count} {singular}" or "{count} {plural}".
 * If plural not provided, appends "s" to singular.
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  const word = count === 1 ? singular : (plural ?? `${singular}s`);
  return `${count} ${word}`;
}

/**
 * Capitalize first character only.
 */
export function initCap(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert camelCase to kebab-case.
 * "myPickCard" → "my-pick-card"
 */
export function camelToKebab(str: string): string {
  return str
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "");
}

/**
 * Convert kebab-case to camelCase.
 * "my-pick-card" → "myPickCard"
 */
export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Convert camelCase to snake_case.
 * "myPickCard" → "my_pick_card"
 */
export function camelToSnake(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

/**
 * Convert snake_case to camelCase.
 * "my_pick_card" → "myPickCard"
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Pad string from left to specified length.
 */
export function padStart(str: string, length: number, char = " "): string {
  return str.padStart(length, char);
}

/**
 * Pad string from right to specified length.
 */
export function padEnd(str: string, length: number, char = " "): string {
  return str.padEnd(length, char);
}

/**
 * Count non-overlapping occurrences of substring in text.
 */
export function countOccurrences(text: string, substring: string): number {
  if (!substring) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(substring, pos)) !== -1) {
    count++;
    pos += substring.length;
  }
  return count;
}

/**
 * Replace all occurrences of a literal string (not regex).
 */
export function replaceAll(text: string, search: string, replacement: string): string {
  if (!search) return text;
  return text.split(search).join(replacement);
}

/**
 * Replace multiple whitespace (spaces, tabs, newlines) with single space, then trim.
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Split text into chunks of at most maxCharsPerChunk chars, breaking at word boundaries.
 */
export function splitIntoChunks(text: string, maxCharsPerChunk: number): string[] {
  if (text.length === 0) return [];
  if (maxCharsPerChunk <= 0) return [];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxCharsPerChunk) {
      chunks.push(remaining);
      break;
    }
    // Look for last space within budget
    const slice = remaining.slice(0, maxCharsPerChunk + 1);
    const lastSpace = slice.lastIndexOf(" ");
    if (lastSpace <= 0) {
      // No word boundary — hard cut
      chunks.push(remaining.slice(0, maxCharsPerChunk));
      remaining = remaining.slice(maxCharsPerChunk).trimStart();
    } else {
      chunks.push(remaining.slice(0, lastSpace));
      remaining = remaining.slice(lastSpace + 1);
    }
  }

  return chunks;
}

/**
 * Build an SEO meta description: strip HTML, normalize whitespace, truncate to maxLength.
 */
export function buildMetaDescription(text: string, maxLength = 160): string {
  const clean = normalizeWhitespace(stripHtml(text));
  return truncate(clean, maxLength);
}
