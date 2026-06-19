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
  // Build as explicit nested arrays to satisfy noUncheckedIndexedAccess
  const dp: number[][] = [];
  for (let i = 0; i <= m; i++) {
    const row: number[] = [];
    for (let j = 0; j <= n; j++) {
      row.push(i === 0 ? j : j === 0 ? i : 0);
    }
    dp.push(row);
  }
  for (let i = 1; i <= m; i++) {
    const rowI = dp[i] as number[];
    const rowI1 = dp[i - 1] as number[];
    for (let j = 1; j <= n; j++) {
      if (a.charAt(i - 1) === b.charAt(j - 1)) {
        rowI[j] = rowI1[j - 1] as number;
      } else {
        rowI[j] = 1 + Math.min(rowI1[j] as number, rowI[j - 1] as number, rowI1[j - 1] as number);
      }
    }
  }
  return ((dp[m] as number[])[n]) as number;
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
  const dp: number[][] = [];
  for (let i = 0; i <= m; i++) {
    dp.push(new Array<number>(n + 1).fill(0));
  }
  for (let i = 1; i <= m; i++) {
    const rowI = dp[i] as number[];
    const rowI1 = dp[i - 1] as number[];
    for (let j = 1; j <= n; j++) {
      if (a.charAt(i - 1) === b.charAt(j - 1)) {
        rowI[j] = (rowI1[j - 1] as number) + 1;
        if ((rowI[j] as number) > maxLen) {
          maxLen = rowI[j] as number;
          endIdx = i;
        }
      } else {
        rowI[j] = 0;
      }
    }
  }
  return a.slice(endIdx - maxLen, endIdx);
}

export function longestCommonSubsequence(a: string, b: string): string {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = [];
  for (let i = 0; i <= m; i++) {
    dp.push(new Array<number>(n + 1).fill(0));
  }
  for (let i = 1; i <= m; i++) {
    const rowI = dp[i] as number[];
    const rowI1 = dp[i - 1] as number[];
    for (let j = 1; j <= n; j++) {
      if (a.charAt(i - 1) === b.charAt(j - 1)) {
        rowI[j] = (rowI1[j - 1] as number) + 1;
      } else {
        rowI[j] = Math.max(rowI1[j] as number, rowI[j - 1] as number);
      }
    }
  }
  // Backtrack
  let result = '';
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    const rowI = dp[i] as number[];
    const rowI1 = dp[i - 1] as number[];
    if (a.charAt(i - 1) === b.charAt(j - 1)) {
      result = a.charAt(i - 1) + result;
      i--;
      j--;
    } else if ((rowI1[j] as number) > (rowI[j - 1] as number)) {
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
  const lcs: number[][] = [];
  for (let i = 0; i <= m; i++) {
    lcs.push(new Array<number>(n + 1).fill(0));
  }
  for (let i = 1; i <= m; i++) {
    const rowI = lcs[i] as number[];
    const rowI1 = lcs[i - 1] as number[];
    for (let j = 1; j <= n; j++) {
      rowI[j] = wa[i - 1] === wb[j - 1]
        ? (rowI1[j - 1] as number) + 1
        : Math.max(rowI1[j] as number, rowI[j - 1] as number);
    }
  }

  // Backtrack
  const tokens: DiffToken[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    const rowI = lcs[i] as number[];
    const rowI1 = lcs[i - 1] as number[];
    const waWord = wa[i - 1] ?? '';
    const wbWord = wb[j - 1] ?? '';
    if (i > 0 && j > 0 && waWord === wbWord) {
      tokens.unshift({ type: 'same', text: waWord });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || (rowI[j - 1] as number) >= (rowI1[j] as number))) {
      tokens.unshift({ type: 'added', text: wbWord });
      j--;
    } else {
      tokens.unshift({ type: 'removed', text: waWord });
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
  return `${(parts[0] ?? '').charAt(0)}. ${parts.slice(1).join(' ')}`;
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

// ---------------------------------------------------------------------------
// Edit distance and fuzzy matching (new additions)
// ---------------------------------------------------------------------------

/** 1 - dist/max(len); 1.0 if both empty */
export function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

/** Damerau-Levenshtein distance — includes transpositions */
export function damerauLevenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  // Nested number arrays with explicit init avoid noUncheckedIndexedAccess issues
  const dp: number[][] = [];
  for (let i = 0; i <= m + 1; i++) {
    const row: number[] = [];
    for (let j = 0; j <= n + 1; j++) {
      row.push(i === 0 ? j : j === 0 ? i : 0);
    }
    dp.push(row);
  }

  for (let i = 1; i <= m; i++) {
    const rowI = dp[i] as number[];
    const rowI1 = dp[i - 1] as number[];
    for (let j = 1; j <= n; j++) {
      const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      rowI[j] = Math.min(
        (rowI1[j] as number) + 1,
        (rowI[j - 1] as number) + 1,
        (rowI1[j - 1] as number) + cost,
      );
      if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) {
        const rowI2 = dp[i - 2] as number[];
        rowI[j] = Math.min(rowI[j] as number, (rowI2[j - 2] as number) + cost);
      }
    }
  }
  return ((dp[m] as number[])[n]) as number;
}

/** Jaro similarity (0–1) */
export function jaroSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const matchWindow = Math.max(Math.floor(Math.max(a.length, b.length) / 2) - 1, 0);
  const aMatched = new Uint8Array(a.length);
  const bMatched = new Uint8Array(b.length);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatched[j] || a[i] !== b[j]) continue;
      aMatched[i] = 1;
      bMatched[j] = 1;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatched[i]) continue;
    while (!bMatched[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  return (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;
}

/** Jaro-Winkler similarity with prefix scaling; p default 0.1 */
export function jaroWinklerSimilarity(a: string, b: string, p = 0.1): number {
  const jaro = jaroSimilarity(a, b);
  let prefixLen = 0;
  const maxPrefix = Math.min(4, Math.min(a.length, b.length));
  for (let i = 0; i < maxPrefix; i++) {
    if (a[i] === b[i]) prefixLen++;
    else break;
  }
  return jaro + prefixLen * p * (1 - jaro);
}

/**
 * Returns candidates with jaroWinkler ≥ threshold sorted descending.
 * Default threshold=0.7
 */
export function fuzzyMatch(
  query: string,
  candidates: string[],
  threshold = 0.7,
): Array<{ candidate: string; score: number }> {
  return candidates
    .map((candidate) => ({ candidate, score: jaroWinklerSimilarity(query, candidate) }))
    .filter(({ score }) => score >= threshold)
    .sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Soundex / phonetic
// ---------------------------------------------------------------------------

const SOUNDEX_MAP: Record<string, string> = {
  B: '1', F: '1', P: '1', V: '1',
  C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
  D: '3', T: '3',
  L: '4',
  M: '5', N: '5',
  R: '6',
};

/** Standard American Soundex (letter + 3 digits); empty → '' */
export function soundex(s: string): string {
  if (!s) return '';
  const upper = s.toUpperCase().replace(/[^A-Z]/g, '');
  if (!upper) return '';

  const first = upper.charAt(0);
  let code = first;
  // In standard Soundex, H and W are ignored (do NOT reset prev digit)
  // Vowels (AEIOUY) separate consonant groups — they reset prev
  let prev = SOUNDEX_MAP[first] ?? '0';

  for (let i = 1; i < upper.length && code.length < 4; i++) {
    const ch = upper.charAt(i);
    // H and W are ignored entirely — don't update prev
    if (ch === 'H' || ch === 'W') continue;
    // Vowels separate consonant groups — reset prev so next consonant is counted
    if ('AEIOUY'.includes(ch)) {
      prev = '0';
      continue;
    }
    const digit = SOUNDEX_MAP[ch] ?? '0';
    if (digit !== prev) {
      code += digit;
      prev = digit;
    }
  }

  return code.padEnd(4, '0');
}

/** Simplified Metaphone (~15 rules) */
export function metaphone(s: string): string {
  if (!s) return '';
  let str = s.toUpperCase().replace(/[^A-Z]/g, '');
  if (!str) return '';

  // Drop trailing S if it creates double: "SS" -> "S"
  str = str.replace(/([AEIOU])/g, (v) => v); // keep vowels for now

  let result = '';
  const len = str.length;

  for (let i = 0; i < len; i++) {
    const ch = str.charAt(i);
    const prev = i > 0 ? str.charAt(i - 1) : '';
    const next = i < len - 1 ? str.charAt(i + 1) : '';
    const next2 = i < len - 2 ? str.charAt(i + 2) : '';

    // Drop duplicate adjacent letters (except C)
    if (ch !== 'C' && ch === prev) continue;

    // Silent initial letters
    if (i === 0) {
      if ((ch === 'A' && next === 'E') ||
          (ch === 'G' && next === 'N') ||
          (ch === 'K' && next === 'N') ||
          (ch === 'W' && next === 'R') ||
          (ch === 'P' && next === 'N')) {
        continue;
      }
    }

    switch (ch) {
      case 'A': case 'E': case 'I': case 'O': case 'U':
        if (i === 0) result += ch;
        break;
      case 'B':
        if (!(prev === 'M' && i === len - 1)) result += 'B';
        break;
      case 'C':
        if (next === 'I' || next === 'E' || next === 'Y') {
          result += 'S';
        } else if (next === 'H') {
          result += 'X';
          i++;
        } else if (next === 'K') {
          result += 'K';
          i++;
        } else {
          result += 'K';
        }
        break;
      case 'D':
        if (next === 'G' && (next2 === 'I' || next2 === 'E' || next2 === 'Y')) {
          result += 'J';
          i++;
        } else {
          result += 'T';
        }
        break;
      case 'F':
        result += 'F';
        break;
      case 'G':
        if (next === 'H') {
          if (i === 0 || !'AEIOU'.includes(prev)) {
            result += 'K';
          }
          i++;
        } else if (next === 'N') {
          if (i === 0 || (i === 1 && !'AEIOU'.includes(str.charAt(0)))) {
            // silent
          } else {
            result += 'K';
          }
        } else if (next === 'I' || next === 'E' || next === 'Y') {
          result += 'J';
        } else {
          result += 'K';
        }
        break;
      case 'H':
        if ('AEIOU'.includes(next) && !'AEIOU'.includes(prev)) {
          result += 'H';
        }
        break;
      case 'J':
        result += 'J';
        break;
      case 'K':
        if (prev !== 'C') result += 'K';
        break;
      case 'L':
        result += 'L';
        break;
      case 'M':
        result += 'M';
        break;
      case 'N':
        result += 'N';
        break;
      case 'P':
        if (next === 'H') {
          result += 'F';
          i++;
        } else {
          result += 'P';
        }
        break;
      case 'Q':
        result += 'K';
        break;
      case 'R':
        result += 'R';
        break;
      case 'S':
        if (next === 'H' || (next === 'I' && (next2 === 'O' || next2 === 'A'))) {
          result += 'X';
          i++;
        } else if (next === 'C' && next2 === 'H') {
          result += 'SK';
          i += 2;
        } else {
          result += 'S';
        }
        break;
      case 'T':
        if (next === 'H') {
          result += '0';
          i++;
        } else if (next === 'I' && (next2 === 'A' || next2 === 'O')) {
          result += 'X';
        } else {
          result += 'T';
        }
        break;
      case 'V':
        result += 'F';
        break;
      case 'W':
        if (next === 'H') {
          result += 'W';
          i++;
        } else if ('AEIOU'.includes(next)) {
          result += 'W';
        }
        break;
      case 'X':
        result += 'KS';
        break;
      case 'Y':
        if ('AEIOU'.includes(next)) result += 'Y';
        break;
      case 'Z':
        result += 'S';
        break;
    }
  }

  return result;
}

/** true if soundex(a) === soundex(b) */
export function phoneticMatch(a: string, b: string): boolean {
  return soundex(a) === soundex(b);
}

// ---------------------------------------------------------------------------
// Text tokenization and normalization
// ---------------------------------------------------------------------------

/** Split on whitespace and punctuation; filter empty; lowercase */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\p{P}]+/u)
    .filter((t) => t.length > 0);
}

const DEFAULT_STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'is', 'was', 'are', 'were', 'be', 'been', 'have',
  'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might',
]);

/** Remove stop words from tokens; defaults to English stop word list */
export function removeStopWords(tokens: string[], stopWords?: string[]): string[] {
  const set = stopWords ? new Set(stopWords) : DEFAULT_STOP_WORDS;
  return tokens.filter((t) => !set.has(t));
}

/** Porter stemmer — simplified rules */
export function stemWord(word: string): string {
  let w = word.toLowerCase();
  const MIN_STEM = 3;

  // Helper: remove doubled consonant after suffix removal (e.g. "running"→"runn"→"run")
  function dedouble(s: string): string {
    if (s.length >= 2) {
      const last = s.charAt(s.length - 1);
      const prev = s.charAt(s.length - 2);
      if (last === prev && !'aeiou'.includes(last)) {
        return s.slice(0, -1);
      }
    }
    return s;
  }

  // Suffixes (ordered longest-first); strip and dedouble
  const suffixes: Array<[string, string]> = [
    ['ation', ''],
    ['ment', ''],
    ['ness', ''],
    ['tion', ''],
    ['ing', ''],
    ['ed', ''],
    ['er', ''],
    ['ly', ''],
  ];

  for (const [suffix, replacement] of suffixes) {
    if (w.length > MIN_STEM + suffix.length && w.endsWith(suffix)) {
      const stem = w.slice(0, -suffix.length) + replacement;
      if (stem.length >= MIN_STEM) {
        w = dedouble(stem);
        break;
      }
    }
  }

  // Plurals (after other suffixes since -ies may already be handled above)
  if (w.length > MIN_STEM + 2 && w.endsWith('ies')) {
    w = w.slice(0, -3) + 'y';
  } else if (w.length > MIN_STEM + 1 && w.endsWith('es') && !w.endsWith('aes') && !w.endsWith('oes')) {
    w = w.slice(0, -1);
  } else if (w.length > MIN_STEM && w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us')) {
    w = w.slice(0, -1);
  }

  return w;
}

/** Map stemWord over an array of tokens */
export function stemTokens(tokens: string[]): string[] {
  return tokens.map(stemWord);
}

/** Produce n-grams from an array of tokens */
export function nGrams(tokens: string[], n: number): string[][] {
  if (n <= 0 || tokens.length < n) return [];
  const result: string[][] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    result.push(tokens.slice(i, i + n));
  }
  return result;
}

/** Character n-grams (sliding window) */
export function characterNGrams(s: string, n: number): string[] {
  if (n <= 0 || s.length < n) return [];
  const result: string[] = [];
  for (let i = 0; i <= s.length - n; i++) {
    result.push(s.slice(i, i + n));
  }
  return result;
}

// ---------------------------------------------------------------------------
// String comparison and diff (new additions)
// ---------------------------------------------------------------------------

/**
 * Line-level diff using LCS on lines.
 * Returns array of {type, text} objects.
 */
export function textDiff(
  original: string,
  modified: string,
): Array<{ type: 'equal' | 'insert' | 'delete'; text: string }> {
  const aLines = original.split('\n');
  const bLines = modified.split('\n');
  const m = aLines.length;
  const n = bLines.length;

  const dpRows: number[][] = [];
  for (let i = 0; i <= m; i++) {
    dpRows.push(new Array<number>(n + 1).fill(0));
  }
  for (let i = 1; i <= m; i++) {
    const rowI = dpRows[i] as number[];
    const rowI1 = dpRows[i - 1] as number[];
    for (let j = 1; j <= n; j++) {
      rowI[j] = aLines[i - 1] === bLines[j - 1]
        ? (rowI1[j - 1] as number) + 1
        : Math.max(rowI1[j] as number, rowI[j - 1] as number);
    }
  }

  const result: Array<{ type: 'equal' | 'insert' | 'delete'; text: string }> = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    const rowI = dpRows[i] as number[];
    const rowI1 = dpRows[i - 1] as number[];
    const aLine = aLines[i - 1] ?? '';
    const bLine = bLines[j - 1] ?? '';
    if (i > 0 && j > 0 && aLine === bLine) {
      result.unshift({ type: 'equal', text: aLine });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || (rowI[j - 1] as number) >= (rowI1[j] as number))) {
      result.unshift({ type: 'insert', text: bLine });
      j--;
    } else {
      result.unshift({ type: 'delete', text: aLine });
      i--;
    }
  }
  return result;
}

/** 2*LCS_length / (|a|+|b|); 1.0 if both empty */
export function diffRatio(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1;
  const lcs = longestCommonSubsequence(a, b);
  return (2 * lcs.length) / (a.length + b.length);
}

// ---------------------------------------------------------------------------
// Formatting and transformation (new additions)
// ---------------------------------------------------------------------------

/** Capitalize first letter of each word; lower rest */
export function toTitleCase(s: string): string {
  return s.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/** from snake_case or kebab-case or space-separated → camelCase */
export function toCamelCase(s: string): string {
  return s
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .replace(/[-_\s]+(.)/g, (_m, c: string) => c.toUpperCase())
    .replace(/^(.)/, (m) => m.toLowerCase());
}

/** from camelCase or PascalCase or space-separated → snake_case */
export function toSnakeCase(s: string): string {
  return s
    .replace(/([A-Z])/g, '_$1')
    .replace(/[-\s]+/g, '_')
    .toLowerCase()
    .replace(/^_/, '');
}

/** from camelCase or PascalCase or space-separated → kebab-case */
export function toKebabCase(s: string): string {
  return toSnakeCase(s).replace(/_/g, '-');
}

/** from snake_case or kebab-case or space-separated → PascalCase */
export function toPascalCase(s: string): string {
  const c = toCamelCase(s);
  return c.charAt(0).toUpperCase() + c.slice(1);
}

/** Word-wrap returning array of lines; respects word boundaries */
export function wrap(s: string, width: number): string[] {
  if (width <= 0) return [s];
  const words = s.split(/\s+/).filter((w) => w.length > 0);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= width) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current.length > 0) lines.push(current);
  return lines;
}

// ---------------------------------------------------------------------------
// Pattern matching and extraction (new additions)
// ---------------------------------------------------------------------------

/** All numeric sequences including decimals */
export function extractNumbers(s: string): number[] {
  const matches = s.match(/-?\d+(\.\d+)?/g);
  return matches ? matches.map(Number) : [];
}

/** Valid email patterns */
export function extractEmails(s: string): string[] {
  const re = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  return s.match(re) ?? [];
}

/** http/https URLs */
export function extractUrls(s: string): string[] {
  const re = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  return s.match(re) ?? [];
}

/**
 * * matches any sequence, ? matches one char
 */
export function wildcardMatch(pattern: string, text: string): boolean {
  const m = pattern.length;
  const n = text.length;
  // Row-based boolean arrays to satisfy noUncheckedIndexedAccess
  const dpRows: number[][] = [];
  for (let i = 0; i <= m; i++) {
    dpRows.push(new Array<number>(n + 1).fill(0));
  }
  (dpRows[0] as number[])[0] = 1;

  for (let i = 1; i <= m; i++) {
    const rowI = dpRows[i] as number[];
    const rowI1 = dpRows[i - 1] as number[];
    if (pattern.charAt(i - 1) === '*') rowI[0] = rowI1[0] as number;
  }

  for (let i = 1; i <= m; i++) {
    const rowI = dpRows[i] as number[];
    const rowI1 = dpRows[i - 1] as number[];
    for (let j = 1; j <= n; j++) {
      const pc = pattern.charAt(i - 1);
      if (pc === '*') {
        rowI[j] = (rowI1[j] as number) | (rowI[j - 1] as number);
      } else if (pc === '?' || pc === text.charAt(j - 1)) {
        rowI[j] = rowI1[j - 1] as number;
      }
    }
  }

  return ((dpRows[m] as number[])[n] as number) === 1;
}

// ---------------------------------------------------------------------------
// Sports-specific string helpers (new additions)
// ---------------------------------------------------------------------------

/** Lowercase, remove punctuation, collapse whitespace, trim */
export function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Uppercase first letter of each word, up to maxLen chars.
 * Default maxLen=3. e.g. "New England Patriots" → "NEP"
 */
export function teamAbbreviation(teamName: string, maxLen = 3): string {
  return teamName
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, maxLen)
    .join('');
}

/** Parse "+150", "-110" etc.; throw if invalid */
export function parseAmericanOddsString(odds: string): number {
  const trimmed = odds.trim();
  if (!/^[+-]?\d+$/.test(trimmed)) {
    throw new Error(`Invalid American odds string: "${odds}"`);
  }
  const n = Number(trimmed);
  if (Number.isNaN(n)) {
    throw new Error(`Invalid American odds string: "${odds}"`);
  }
  return n;
}

/** e.g. "NFL: Chiefs vs Eagles — Spread" */
export function formatPickLabel(
  sport: string,
  homeTeam: string,
  awayTeam: string,
  betType: string,
): string {
  return `${sport}: ${homeTeam} vs ${awayTeam} — ${betType}`;
}

/** URL-safe slug; e.g. "Green Bay Packers" → "green-bay-packers" */
export function slugifyTeam(teamName: string): string {
  return teamName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * 1000→"1K", 1500000→"1.5M", 1000000000→"1B"
 * Default decimals=1
 */
export function abbreviateNumber(n: number, decimals = 1): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    const val = abs / 1_000_000_000;
    const str = val.toFixed(decimals).replace(/\.0+$/, '');
    return `${sign}${str}B`;
  }
  if (abs >= 1_000_000) {
    const val = abs / 1_000_000;
    const str = val.toFixed(decimals).replace(/\.0+$/, '');
    return `${sign}${str}M`;
  }
  if (abs >= 1_000) {
    const val = abs / 1_000;
    const str = val.toFixed(decimals).replace(/\.0+$/, '');
    return `${sign}${str}K`;
  }
  return `${sign}${abs}`;
}
