/**
 * String utility functions — pure, zero dependencies.
 *
 * URL slugs, text truncation, highlighting, case transforms,
 * common formatting, diff/similarity, and sports-specific helpers.
 */

// ---------------------------------------------------------------------------
// Template interpolation
// ---------------------------------------------------------------------------

/**
 * Replace {{key}} and {{key:format}} placeholders in a template string.
 *
 * Format options:
 *   :upper   → toUpperCase
 *   :lower   → toLowerCase
 *   :title   → title case
 *   :n2      → toFixed(2)
 *   :n0      → toFixed(0)
 *   :pct     → (value * 100).toFixed(1) + '%'
 *   :+/-     → prefix positive numbers with '+', negative with '-'
 *
 * Missing keys are left as-is. Falsy values (except 0) become ''.
 */
export function interpolate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)(?::([^}]+))?\}\}/g, (_match, key: string, fmt: string | undefined) => {
    if (!(key in vars)) return _match;
    const raw = vars[key];
    if (raw === null || raw === undefined || raw === false || raw === '') return '';
    const val = raw;
    if (fmt === 'upper') return String(val).toUpperCase();
    if (fmt === 'lower') return String(val).toLowerCase();
    if (fmt === 'title') return titleCase(String(val));
    if (fmt === 'n2') return Number(val).toFixed(2);
    if (fmt === 'n0') return Number(val).toFixed(0);
    if (fmt === 'pct') return (Number(val) * 100).toFixed(1) + '%';
    if (fmt === '+/-') {
      const n = Number(val);
      return n > 0 ? `+${n}` : String(n);
    }
    return String(val);
  });
}

/**
 * Support {{#if key}}...{{/if}} and {{#if key}}...{{#else}}...{{/if}} blocks.
 * Truthy key = render first block; falsy = render else block (or empty).
 * Nested ifs NOT supported.
 */
export function interpolateConditional(template: string, vars: Record<string, unknown>): string {
  return template.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, key: string, body: string) => {
      const val = vars[key];
      const truthy = Boolean(val);
      const elseIdx = body.indexOf('{{#else}}');
      if (elseIdx === -1) {
        return truthy ? body : '';
      }
      const ifBlock = body.slice(0, elseIdx);
      const elseBlock = body.slice(elseIdx + 9); // '{{#else}}'.length === 9
      return truthy ? ifBlock : elseBlock;
    },
  );
}

/**
 * Render {{#each items}}...{{/each}} blocks.
 * Within the block: {{item}} = current element, {{index}} = 0-based index,
 * {{first}} = "true"/"false", {{last}} = "true"/"false".
 * Optional vars are interpolated in the outer template before list rendering.
 */
export function interpolateList(
  template: string,
  items: unknown[],
  vars?: Record<string, unknown>,
): string {
  const outer = vars ? interpolate(template, vars) : template;
  return outer.replace(/\{\{#each items\}\}([\s\S]*?)\{\{\/each\}\}/g, (_match, block: string) => {
    return items
      .map((item, index) => {
        return block
          .replace(/\{\{item\}\}/g, String(item))
          .replace(/\{\{index\}\}/g, String(index))
          .replace(/\{\{first\}\}/g, index === 0 ? 'true' : 'false')
          .replace(/\{\{last\}\}/g, index === items.length - 1 ? 'true' : 'false');
      })
      .join('');
  });
}

// ---------------------------------------------------------------------------
// Case transforms
// ---------------------------------------------------------------------------

/** hello-world_foo or "hello world" → helloWorldFoo */
export function camelCase(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .replace(/[-_\s]+(.)/g, (_m, c: string) => c.toUpperCase())
    .replace(/^(.)/, (m) => m.toLowerCase());
}

/** helloWorld or "Hello World" → hello_world */
export function snakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .replace(/[-\s]+/g, '_')
    .toLowerCase()
    .replace(/^_/, '');
}

/** helloWorld or "Hello World" → hello-world */
export function kebabCase(str: string): string {
  return snakeCase(str).replace(/_/g, '-');
}

/** hello-world or "hello world" → HelloWorld */
export function pascalCase(str: string): string {
  const c = camelCase(str);
  return c.charAt(0).toUpperCase() + c.slice(1);
}

/** hello world → Hello World */
export function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** HELLO WORLD → Hello world */
export function sentenceCase(str: string): string {
  if (!str) return str;
  const lower = str.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

// ---------------------------------------------------------------------------
// Truncation
// ---------------------------------------------------------------------------

/**
 * Truncate to maxLen chars. Appends suffix (default '…') only if truncated.
 */
export function truncate(str: string, maxLen: number, suffix = '…'): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - suffix.length) + suffix;
}

/**
 * Truncate at a word boundary.
 */
export function truncateWords(str: string, maxWords: number, suffix = '…'): string {
  const words = str.split(/\s+/);
  if (words.length <= maxWords) return str;
  return words.slice(0, maxWords).join(' ') + suffix;
}

// ---------------------------------------------------------------------------
// Padding
// ---------------------------------------------------------------------------

export function padStart(str: string, len: number, char = ' '): string {
  return str.padStart(len, char);
}

export function padEnd(str: string, len: number, char = ' '): string {
  return str.padEnd(len, char);
}

export function center(str: string, len: number, char = ' '): string {
  if (str.length >= len) return str;
  const total = len - str.length;
  const left = Math.floor(total / 2);
  const right = total - left;
  return char.repeat(left) + str + char.repeat(right);
}

// ---------------------------------------------------------------------------
// Repetition / reversal
// ---------------------------------------------------------------------------

export function repeat(str: string, n: number, separator = ''): string {
  if (n <= 0) return '';
  if (!separator) return str.repeat(n);
  return Array.from({ length: n }, () => str).join(separator);
}

export function reverse(str: string): string {
  return str.split('').reverse().join('');
}

export function isPalindrome(str: string): boolean {
  const clean = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean === clean.split('').reverse().join('');
}

export function countOccurrences(str: string, sub: string): number {
  if (!sub) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = str.indexOf(sub, pos)) !== -1) {
    count++;
    pos += sub.length;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Pattern & search
// ---------------------------------------------------------------------------

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractMatches(str: string, pattern: string | RegExp): string[] {
  const re =
    pattern instanceof RegExp
      ? new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')
      : new RegExp(pattern, 'g');
  return Array.from(str.matchAll(re), (m) => m[0]);
}

export function replaceAll(str: string, search: string, replacement: string): string {
  return str.split(search).join(replacement);
}

/**
 * Apply all replacements simultaneously (not chained).
 * Builds a single regex from the keys to avoid cascading replacements.
 */
export function replaceMap(str: string, replacements: Record<string, string>): string {
  const keys = Object.keys(replacements);
  if (keys.length === 0) return str;
  const re = new RegExp(keys.map(escapeRegex).join('|'), 'g');
  return str.replace(re, (match) => replacements[match] ?? match);
}

// ---------------------------------------------------------------------------
// Diff & similarity
// ---------------------------------------------------------------------------

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (__, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/** 0–1; 1 = identical. similarity = 1 - levenshtein / max(a.length, b.length) */
export function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

export function longestCommonSubstring(a: string, b: string): string {
  const m = a.length;
  const n = b.length;
  let maxLen = 0;
  let endIdx = 0;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > maxLen) {
          maxLen = dp[i][j];
          endIdx = i;
        }
      } else {
        dp[i][j] = 0;
      }
    }
  }
  return a.slice(endIdx - maxLen, endIdx);
}

export function longestCommonSubsequence(a: string, b: string): string {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  // Backtrack
  let result = '';
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result = a[i - 1] + result;
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return result;
}

export interface DiffToken {
  type: 'added' | 'removed' | 'same';
  text: string;
}

/**
 * Simple word-level diff (greedy LCS approximation).
 */
export function diffWords(a: string, b: string): DiffToken[] {
  const wa = a.split(/(\s+)/).filter((t) => t.length > 0);
  const wb = b.split(/(\s+)/).filter((t) => t.length > 0);

  const m = wa.length;
  const n = wb.length;

  // Build LCS table
  const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      lcs[i][j] = wa[i - 1] === wb[j - 1] ? lcs[i - 1][j - 1] + 1 : Math.max(lcs[i - 1][j], lcs[i][j - 1]);
    }
  }

  // Backtrack
  const tokens: DiffToken[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && wa[i - 1] === wb[j - 1]) {
      tokens.unshift({ type: 'same', text: wa[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      tokens.unshift({ type: 'added', text: wb[j - 1] });
      j--;
    } else {
      tokens.unshift({ type: 'removed', text: wa[i - 1] });
      i--;
    }
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export interface FormatNumberOpts {
  decimals?: number;
  separator?: string;
  prefix?: string;
  suffix?: string;
}

export function formatNumber(n: number, opts: FormatNumberOpts = {}): string {
  const { decimals, separator = ',', prefix = '', suffix = '' } = opts;
  const fixed = decimals !== undefined ? Math.abs(n).toFixed(decimals) : String(Math.abs(n));
  const [intPart, decPart] = fixed.split('.');
  const grouped = (intPart ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  const numStr = decPart !== undefined ? `${grouped}.${decPart}` : grouped;
  const signed = n < 0 ? `-${numStr}` : numStr;
  return `${prefix}${signed}${suffix}`;
}

/** "+150" or "-110" */
export function formatOdds(american: number): string {
  return american > 0 ? `+${american}` : String(american);
}

/** +3.5 or -3.5 or PK (if 0) */
export function formatSpread(spread: number): string {
  if (spread === 0) return 'PK';
  return spread > 0 ? `+${spread}` : String(spread);
}

/** "10-5" or "10-5-1" */
export function formatRecord(wins: number, losses: number, ties?: number): string {
  if (ties !== undefined && ties > 0) return `${wins}-${losses}-${ties}`;
  return `${wins}-${losses}`;
}

/** 0.1234 → "12.3%" */
export function formatPercentage(rate: number, decimals = 1): string {
  return `${(rate * 100).toFixed(decimals)}%`;
}

/** ms → "2h 30m" or "45s" or "2d 3h" */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

/** 1 pick vs 3 picks */
export function pluralize(n: number, singular: string, plural?: string): string {
  const word = n === 1 ? singular : (plural ?? `${singular}s`);
  return `${n} ${word}`;
}

/** URL-safe lowercase kebab slug */
export function slug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** "John Smith" → "JS"; max 3 chars */
export function initials(str: string, maxChars = 3): string {
  return str
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, maxChars)
    .join('');
}

/**
 * Mask a string, keeping visibleStart chars at the beginning and
 * visibleEnd chars at the end; fill the middle with char (default '*').
 * maskString("1234567890", 4, 2) → "1234****90"
 */
export function maskString(
  str: string,
  visibleStart = 0,
  visibleEnd = 0,
  char = '*',
): string {
  const len = str.length;
  const showStart = Math.min(visibleStart, len);
  const showEnd = Math.min(visibleEnd, len - showStart);
  const maskLen = len - showStart - showEnd;
  if (maskLen <= 0) return str;
  return str.slice(0, showStart) + char.repeat(maskLen) + str.slice(len - showEnd);
}

// ---------------------------------------------------------------------------
// Sports-specific
// ---------------------------------------------------------------------------

/**
 * "Chiefs -3.5 | O/U 45.5 | ML -150"; omit undefined parts.
 */
export function formatPickLine(
  spread: number | undefined,
  total: number | undefined,
  moneyline: number | undefined,
): string {
  const parts: string[] = [];
  if (spread !== undefined) parts.push(`${formatSpread(spread)}`);
  if (total !== undefined) parts.push(`O/U ${total}`);
  if (moneyline !== undefined) parts.push(`ML ${formatOdds(moneyline)}`);
  return parts.join(' | ');
}

/**
 * "Patrick Mahomes" → "P. Mahomes"; single-word names returned as-is.
 */
export function abbreviateName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  return `${parts[0].charAt(0)}. ${parts.slice(1).join(' ')}`;
}

/**
 * "+150" → 150, "-110" → -110; null if unparseable.
 */
export function parseOddsString(str: string): number | null {
  const trimmed = str.trim();
  const n = Number(trimmed);
  if (!Number.isNaN(n) && /^[+-]?\d+$/.test(trimmed)) return n;
  return null;
}

/**
 * Wrap occurrences of query in str with markFn (default: **match**).
 * Case-insensitive.
 */
export function highlight(
  str: string,
  query: string,
  markFn: (match: string) => string = (m) => `**${m}**`,
): string {
  if (!query) return str;
  const re = new RegExp(escapeRegex(query), 'gi');
  return str.replace(re, (match) => markFn(match));
}

// ---------------------------------------------------------------------------
// Legacy exports (previously in file — kept for backward compat)
// ---------------------------------------------------------------------------

export function slugify(text: string): string {
  return slug(text);
}

export function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function padLeft(text: string, length: number, char = ' '): string {
  return text.padStart(length, char);
}

export function padRight(text: string, length: number, char = ' '): string {
  return text.padEnd(length, char);
}

export interface TextSegment {
  readonly text: string;
  readonly highlight?: boolean;
}

export function highlightSegments(
  text: string,
  query: string,
  caseInsensitive = true,
): TextSegment[] {
  if (!query) return [{ text }];
  const flags = caseInsensitive ? 'gi' : 'g';
  const escaped = escapeRegex(query);
  const re = new RegExp(`(${escaped})`, flags);
  const parts = text.split(re);
  return parts
    .filter((p) => p.length > 0)
    .map((part) => ({
      text: part,
      highlight: re.test(part) ? true : undefined,
    }));
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function hashCode(text: string): number {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
  }
  return hash >>> 0;
}

export function hashToColor(text: string): string {
  const hash = hashCode(text);
  const r = (hash & 0xff0000) >> 16;
  const g = (hash & 0x00ff00) >> 8;
  const b = hash & 0x0000ff;
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

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

export function isUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function maskEnd(text: string, visibleChars: number, maskChar = '*'): string {
  if (text.length <= visibleChars) return text;
  return maskChar.repeat(text.length - visibleChars) + text.slice(-visibleChars);
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(decimals).replace(/\.0$/, '')} ${sizes[i] ?? 'B'}`;
}
