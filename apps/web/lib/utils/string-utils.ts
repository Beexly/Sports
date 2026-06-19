/**
 * String utility functions — pure, zero dependencies.
 *
 * URL slugs, text truncation, highlighting, case transforms,
 * and common formatting for the UI layer.
 */

/**
 * Convert a string to a URL-safe slug.
 * "Kansas City Chiefs vs LA Rams" → "kansas-city-chiefs-vs-la-rams"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9\s-]/g, "")   // keep alphanumeric, spaces, dashes
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Truncate text to maxLen characters, appending ellipsis if truncated.
 * truncate("Hello World", 7) → "Hell..."
 */
export function truncate(text: string, maxLen: number, ellipsis = "..."): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, Math.max(0, maxLen - ellipsis.length)) + ellipsis;
}

/**
 * Truncate at a word boundary.
 * truncateWords("Hello World Foo", 12) → "Hello World..."
 */
export function truncateWords(text: string, maxLen: number, ellipsis = "..."): string {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen - ellipsis.length + 1);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace <= 0) return cut.trimEnd() + ellipsis;
  return cut.slice(0, lastSpace).trimEnd() + ellipsis;
}

/**
 * Capitalize first letter of each word.
 * "hello world" → "Hello World"
 */
export function titleCase(text: string): string {
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Capitalize first letter only.
 * "hello world" → "Hello world"
 */
export function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Convert to camelCase.
 * "hello-world_foo" → "helloWorldFoo"
 */
export function camelCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/[-_\s]+(.)/g, (_, c: string) => c.toUpperCase());
}

/**
 * Convert to snake_case.
 * "helloWorld" → "hello_world"
 * "Hello World" → "hello_world"
 */
export function snakeCase(text: string): string {
  return text
    .replace(/([A-Z])/g, "_$1")
    .replace(/[-\s]+/g, "_")
    .toLowerCase()
    .replace(/^_/, "");
}

/**
 * Convert to kebab-case.
 * "helloWorld" → "hello-world"
 */
export function kebabCase(text: string): string {
  return snakeCase(text).replace(/_/g, "-");
}

/**
 * Pad a string on the left.
 * padLeft("5", 3, "0") → "005"
 */
export function padLeft(text: string, length: number, char = " "): string {
  return text.padStart(length, char);
}

/**
 * Pad a string on the right.
 */
export function padRight(text: string, length: number, char = " "): string {
  return text.padEnd(length, char);
}

/**
 * Repeat a string N times.
 */
export function repeat(text: string, n: number): string {
  return text.repeat(Math.max(0, n));
}

/**
 * Highlight occurrences of a query within text.
 * Returns an array of {text, highlight} segments for rendering.
 * highlight("Hello World", "world") → [{text:"Hello "},{text:"World",highlight:true}]
 */
export interface TextSegment {
  readonly text: string;
  readonly highlight?: boolean;
}

export function highlight(text: string, query: string, caseInsensitive = true): TextSegment[] {
  if (!query) return [{ text }];
  const flags = caseInsensitive ? "gi" : "g";
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})`, flags);
  const parts = text.split(re);
  return parts
    .filter((p) => p.length > 0)
    .map((part) => ({
      text: part,
      highlight: re.test(part) ? true : undefined,
    }));
}

/**
 * Count occurrences of a substring.
 */
export function countOccurrences(text: string, sub: string): number {
  if (!sub) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(sub, pos)) !== -1) {
    count++;
    pos += sub.length;
  }
  return count;
}

/**
 * Strip all HTML tags from a string.
 * "<p>Hello <b>World</b></p>" → "Hello World"
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Escape HTML special characters.
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
 * Normalize whitespace: collapse multiple spaces/newlines to a single space.
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Parse initials from a full name.
 * "John Michael Smith" → "JMS"
 * "LeBron James" → "LJ"
 */
export function initials(name: string, maxChars = 3): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, maxChars)
    .join("");
}

/**
 * Generate a simple hash code from a string (djb2).
 * Useful for generating consistent colors or IDs from strings.
 * Not cryptographic — display/UI use only.
 */
export function hashCode(text: string): number {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
  }
  return hash >>> 0; // unsigned 32-bit
}

/**
 * Convert a hash code to a hex color string.
 * hashToColor("Chiefs") → "#3a5f7d" (consistent per string)
 */
export function hashToColor(text: string): string {
  const hash = hashCode(text);
  const r = (hash & 0xff0000) >> 16;
  const g = (hash & 0x00ff00) >> 8;
  const b = hash & 0x0000ff;
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Naive plural: append "s" if count !== 1.
 * pluralize(1, "pick") → "pick"
 * pluralize(2, "pick") → "picks"
 * pluralize(0, "pick", "picks") → "picks"
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

/**
 * Format an ordinal number.
 * ordinal(1) → "1st", ordinal(2) → "2nd", ordinal(11) → "11th"
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
 * Check if a string is a valid URL (permissive).
 */
export function isUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Extract the domain from a URL.
 * "https://www.example.com/path" → "example.com"
 */
export function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Mask sensitive text leaving only the last N chars visible.
 * maskEnd("ABCDE1234", 4) → "*****1234"
 */
export function maskEnd(text: string, visibleChars: number, maskChar = "*"): string {
  if (text.length <= visibleChars) return text;
  return maskChar.repeat(text.length - visibleChars) + text.slice(-visibleChars);
}

/**
 * Convert bytes to a human-readable string.
 * formatBytes(1536) → "1.5 KB"
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(decimals).replace(/\.0$/, "")} ${sizes[i] ?? "B"}`;
}
