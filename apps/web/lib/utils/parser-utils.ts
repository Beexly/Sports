/**
 * Parser utilities — pure, zero dependencies (Node built-ins only).
 *
 * Data parsing helpers used across ingestion, content, and config layers:
 * CSV parsing/serialization, query strings, number/value coercion,
 * key-value/config parsing, path/URL fragments, structured text, and
 * safe JSON access.
 *
 * All functions are pure and side-effect free. No `any` types are used.
 */

// ---------------------------------------------------------------------------
// CSV parsing / serialization
// ---------------------------------------------------------------------------

/**
 * Parse CSV text into a 2D array of strings.
 *
 * Handles quoted fields containing the delimiter, embedded newlines, and
 * escaped double-quotes (`""`). A trailing newline does not produce an empty
 * trailing row.
 */
export function parseCsv(
  input: string,
  options?: { delimiter?: string; hasHeader?: boolean; trim?: boolean }
): string[][] {
  const delimiter = options?.delimiter ?? ',';
  const trim = options?.trim ?? false;
  const hasHeader = options?.hasHeader ?? false;

  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  let fieldStarted = false;

  const pushField = (): void => {
    row.push(trim ? field.trim() : field);
    field = '';
    fieldStarted = false;
  };
  const pushRow = (): void => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < input.length; i++) {
    const char = input[i] ?? '';

    if (inQuotes) {
      if (char === '"') {
        const next = input[i + 1] ?? '';
        if (next === '"') {
          field += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && !fieldStarted) {
      inQuotes = true;
      fieldStarted = true;
      continue;
    }

    if (char === delimiter) {
      pushField();
      continue;
    }

    if (char === '\r') {
      // Normalize CRLF — handle the \n on the next iteration.
      const next = input[i + 1] ?? '';
      if (next === '\n') {
        pushRow();
        i++;
      } else {
        pushRow();
      }
      continue;
    }

    if (char === '\n') {
      pushRow();
      continue;
    }

    field += char;
    fieldStarted = true;
  }

  // Flush the final field/row unless the input ended exactly on a newline
  // boundary with nothing buffered.
  if (field !== '' || row.length > 0 || fieldStarted) {
    pushRow();
  }

  if (hasHeader && rows.length > 0) {
    return rows.slice(1);
  }

  return rows;
}

/**
 * Parse CSV where the first row holds headers; each subsequent row becomes an
 * object keyed by header. Missing trailing cells default to `''`.
 */
export function parseCsvToObjects(
  input: string,
  options?: { delimiter?: string }
): Record<string, string>[] {
  const rows = parseCsv(input, { delimiter: options?.delimiter });
  if (rows.length === 0) return [];

  const headers = rows[0] ?? [];
  const result: Record<string, string>[] = [];

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r] ?? [];
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c] ?? '';
      obj[key] = cells[c] ?? '';
    }
    result.push(obj);
  }

  return result;
}

function csvEscapeField(value: string | number | boolean, delimiter: string): string {
  const str = String(value);
  const needsQuote =
    str.includes(delimiter) ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r');
  if (!needsQuote) return str;
  return '"' + str.replace(/"/g, '""') + '"';
}

/**
 * Serialize a 2D array into CSV. Fields containing the delimiter, a quote, or a
 * newline are quoted; embedded quotes are escaped as `""`. Rows are joined with
 * `\n`.
 */
export function toCsv(
  rows: (string | number | boolean)[][],
  options?: { delimiter?: string }
): string {
  const delimiter = options?.delimiter ?? ',';
  return rows
    .map((row) => row.map((cell) => csvEscapeField(cell, delimiter)).join(delimiter))
    .join('\n');
}

/**
 * Serialize an array of objects into CSV. Headers are derived from the union of
 * all keys (first-seen order). Returns `''` when there are no objects.
 */
export function objectsToCsv(
  objects: Record<string, string | number | boolean>[],
  options?: { delimiter?: string }
): string {
  const delimiter = options?.delimiter ?? ',';
  if (objects.length === 0) return '';

  const headers: string[] = [];
  const seen = new Set<string>();
  for (const obj of objects) {
    for (const key of Object.keys(obj)) {
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    }
  }

  const rows: (string | number | boolean)[][] = [headers];
  for (const obj of objects) {
    rows.push(headers.map((h) => (h in obj ? (obj[h] ?? '') : '')));
  }

  return toCsv(rows, { delimiter });
}

// ---------------------------------------------------------------------------
// Query string parsing
// ---------------------------------------------------------------------------

/**
 * Parse a URL query string into an object. A leading `?` is stripped. Values are
 * URL-decoded. Repeated keys collapse into an array (in appearance order).
 */
export function parseQueryString(qs: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  let str = qs;
  if (str.startsWith('?')) str = str.slice(1);
  if (str === '') return result;

  const decode = (s: string): string => {
    try {
      return decodeURIComponent(s.replace(/\+/g, ' '));
    } catch {
      return s;
    }
  };

  for (const pair of str.split('&')) {
    if (pair === '') continue;
    const eq = pair.indexOf('=');
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const rawVal = eq === -1 ? '' : pair.slice(eq + 1);
    const key = decode(rawKey);
    const val = decode(rawVal);

    if (key in result) {
      const existing = result[key];
      if (Array.isArray(existing)) {
        existing.push(val);
      } else if (existing !== undefined) {
        result[key] = [existing, val];
      }
    } else {
      result[key] = val;
    }
  }

  return result;
}

/**
 * Build a query string (no leading `?`) from params. Array values repeat the
 * key. Keys and values are URL-encoded.
 */
export function buildQueryString(
  params: Record<string, string | number | boolean | (string | number)[]>
): string {
  const parts: string[] = [];
  for (const key of Object.keys(params)) {
    const value = params[key];
    if (value === undefined) continue;
    const encKey = encodeURIComponent(key);
    if (Array.isArray(value)) {
      for (const item of value) {
        parts.push(`${encKey}=${encodeURIComponent(String(item))}`);
      }
    } else {
      parts.push(`${encKey}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.join('&');
}

/**
 * Parse a `Cookie` header into a key→value object. Pairs are split on `;`,
 * trimmed, and values are URL-decoded.
 */
export function parseCookies(cookieHeader: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (cookieHeader.trim() === '') return result;

  for (const pair of cookieHeader.split(';')) {
    const trimmed = pair.trim();
    if (trimmed === '') continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const rawVal = trimmed.slice(eq + 1).trim();
    if (key === '') continue;
    let val = rawVal;
    try {
      val = decodeURIComponent(rawVal);
    } catch {
      val = rawVal;
    }
    result[key] = val;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Number / value parsing
// ---------------------------------------------------------------------------

/**
 * Parse a number from a string, stripping commas, whitespace, and common
 * currency symbols (`$ € £`). Returns `fallback` (default 0) when not a finite
 * number.
 */
export function parseNumber(value: string, fallback = 0): number {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/[$€£,\s]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '+' || cleaned === '.') {
    return fallback;
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Parse a percentage into a 0–1 fraction. `"45%"` → 0.45, `"45"` → 0.45,
 * `"12.5%"` → 0.125. Returns `fallback` (default 0) when unparseable.
 */
export function parsePercent(value: string, fallback = 0): number {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/[%\s,]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '+' || cleaned === '.') {
    return fallback;
  }
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return fallback;
  return n / 100;
}

/**
 * Coerce a value to boolean. `true/yes/1/on/y` (case-insensitive, trimmed) and
 * the number 1 / boolean true map to true; everything else is false.
 */
export function parseBoolean(value: string | number | boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === 'true' ||
    normalized === 'yes' ||
    normalized === '1' ||
    normalized === 'on' ||
    normalized === 'y'
  );
}

/**
 * Parse a human duration into milliseconds. Supports `d`, `h`, `m`, `s`, `ms`
 * components which are summed: `"1h30m"` → 5400000, `"500ms"` → 500. Returns 0
 * when nothing parseable is found.
 */
export function parseDuration(value: string): number {
  if (typeof value !== 'string') return 0;
  const str = value.trim().toLowerCase();
  if (str === '') return 0;

  const unitMs: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  // Match number + unit; `ms` must win over `m` so it appears first.
  const regex = /(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)/g;
  let total = 0;
  let matched = false;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(str)) !== null) {
    const amount = Number(match[1] ?? '0');
    const unit = match[2] ?? '';
    const factor = unitMs[unit];
    if (factor !== undefined && Number.isFinite(amount)) {
      total += amount * factor;
      matched = true;
    }
  }

  return matched ? total : 0;
}

/**
 * Split a string into a trimmed list, dropping empty entries. Default
 * separator is `,`.
 */
export function parseList(value: string, separator = ','): string[] {
  if (typeof value !== 'string' || value === '') return [];
  return value
    .split(separator)
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

// ---------------------------------------------------------------------------
// Key-value / config parsing
// ---------------------------------------------------------------------------

/**
 * Parse a key-value block. Lines are split on `pairSeparator` (default `\n`),
 * each pair on `kvSeparator` (default `=`). Blank lines and lines starting with
 * `#` are ignored. Keys/values are trimmed. Later keys overwrite earlier ones.
 */
export function parseKeyValue(
  input: string,
  options?: { pairSeparator?: string; kvSeparator?: string }
): Record<string, string> {
  const pairSeparator = options?.pairSeparator ?? '\n';
  const kvSeparator = options?.kvSeparator ?? '=';
  const result: Record<string, string> = {};

  for (const rawLine of input.split(pairSeparator)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const idx = line.indexOf(kvSeparator);
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + kvSeparator.length).trim();
    if (key === '') continue;
    result[key] = val;
  }

  return result;
}

/**
 * Parse a single `KEY=value` env line. Surrounding single or double quotes are
 * stripped. Returns `null` when there is no `=`. A leading `export ` is ignored.
 */
export function parseEnvLine(line: string): { key: string; value: string } | null {
  let working = line.trim();
  if (working.startsWith('export ')) {
    working = working.slice('export '.length).trim();
  }
  const idx = working.indexOf('=');
  if (idx === -1) return null;

  const key = working.slice(0, idx).trim();
  if (key === '') return null;

  let value = working.slice(idx + 1).trim();
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      value = value.slice(1, -1);
    }
  }

  return { key, value };
}

/**
 * Parse YAML-ish frontmatter delimited by `---` lines at the top of the input.
 * Each line is a `key: value` pair; surrounding quotes on values are stripped.
 * Returns the parsed attributes and the remaining body. When no frontmatter is
 * present, attributes are empty and the body is the original input.
 */
export function parseFrontmatter(input: string): {
  attributes: Record<string, string>;
  body: string;
} {
  const attributes: Record<string, string> = {};

  // Match an opening `---` (optionally after leading blank lines), capture the
  // block (possibly empty), then a closing `---`, then the body. The newline
  // before the closing `---` is optional so an empty block is recognized.
  const match = /^\s*---\s*\r?\n([\s\S]*?)(?:\r?\n)?---\s*(?:\r?\n([\s\S]*))?$/.exec(input);
  if (!match) {
    return { attributes, body: input };
  }

  const block = match[1] ?? '';
  const body = match[2] ?? '';

  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (key === '') continue;
    if (value.length >= 2) {
      const first = value[0];
      const last = value[value.length - 1];
      if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
        value = value.slice(1, -1);
      }
    }
    attributes[key] = value;
  }

  return { attributes, body };
}

// ---------------------------------------------------------------------------
// Path / URL fragment parsing
// ---------------------------------------------------------------------------

/**
 * Split a path into its non-empty segments. Query strings and hash fragments
 * are not stripped (caller's responsibility).
 */
export function parsePathSegments(path: string): string[] {
  return path.split('/').filter((seg) => seg !== '');
}

/**
 * Return the lowercase file extension (without the dot), or `''` when there is
 * none. Leading dots (dotfiles) are not treated as extensions.
 */
export function parseFileExtension(filename: string): string {
  const base = parseFilename(filename);
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return '';
  return base.slice(dot + 1).toLowerCase();
}

/**
 * Return the basename (final path segment) of a path, with trailing slashes
 * ignored. Supports both `/` and `\` separators.
 */
export function parseFilename(path: string): string {
  const normalized = path.replace(/[\\/]+$/, '');
  const segments = normalized.split(/[\\/]/);
  return segments[segments.length - 1] ?? '';
}

/**
 * Parse a semantic version string. `"1.2.3-beta.1"` →
 * `{ major: 1, minor: 2, patch: 3, prerelease: 'beta.1' }`. A leading `v` is
 * tolerated. Returns `null` for invalid versions. Build metadata (`+...`) is
 * ignored.
 */
export function parseSemver(
  version: string
): { major: number; minor: number; patch: number; prerelease: string } | null {
  if (typeof version !== 'string') return null;
  const trimmed = version.trim().replace(/^v/i, '');
  const match =
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/.exec(trimmed);
  if (!match) return null;
  return {
    major: Number(match[1] ?? '0'),
    minor: Number(match[2] ?? '0'),
    patch: Number(match[3] ?? '0'),
    prerelease: match[4] ?? '',
  };
}

// ---------------------------------------------------------------------------
// Structured text
// ---------------------------------------------------------------------------

/**
 * Parse a markdown-style pipe table into rows of trimmed cells. The separator
 * row (e.g. `| --- | --- |`) is skipped. Leading/trailing pipes are tolerated.
 */
export function parseTable(input: string): string[][] {
  const rows: string[][] = [];
  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '') continue;
    if (!line.includes('|')) continue;

    let body = line;
    if (body.startsWith('|')) body = body.slice(1);
    if (body.endsWith('|')) body = body.slice(0, -1);

    const cells = body.split('|').map((c) => c.trim());

    // Skip separator rows: every cell is dashes/colons/spaces (and non-empty).
    const isSeparator =
      cells.length > 0 && cells.every((c) => /^:?-{1,}:?$/.test(c));
    if (isSeparator) continue;

    rows.push(cells);
  }
  return rows;
}

/**
 * Expand a compact range expression into a sorted, deduped number array.
 * `"1-3,5,7-9"` → `[1,2,3,5,7,8,9]`. Descending ranges (`5-3`) are expanded
 * ascending. Unparseable tokens are ignored.
 */
export function parseRanges(input: string): number[] {
  const set = new Set<number>();
  for (const rawToken of input.split(',')) {
    const token = rawToken.trim();
    if (token === '') continue;
    const rangeMatch = /^(-?\d+)\s*-\s*(-?\d+)$/.exec(token);
    if (rangeMatch) {
      let start = Number(rangeMatch[1] ?? '0');
      let end = Number(rangeMatch[2] ?? '0');
      if (start > end) {
        const tmp = start;
        start = end;
        end = tmp;
      }
      for (let n = start; n <= end; n++) set.add(n);
      continue;
    }
    const single = Number(token);
    if (Number.isFinite(single) && /^-?\d+$/.test(token)) {
      set.add(single);
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}

/**
 * Split a string into tokens on whitespace, treating double-quoted substrings
 * as single tokens (the surrounding quotes are removed). Escaped quotes inside
 * a quoted span (`\"`) are preserved as literal quotes.
 */
export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;
  let hasToken = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i] ?? '';

    if (inQuotes) {
      if (char === '\\' && (input[i + 1] ?? '') === '"') {
        current += '"';
        i++;
        hasToken = true;
        continue;
      }
      if (char === '"') {
        inQuotes = false;
        continue;
      }
      current += char;
      hasToken = true;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      hasToken = true;
      continue;
    }

    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      if (hasToken) {
        tokens.push(current);
        current = '';
        hasToken = false;
      }
      continue;
    }

    current += char;
    hasToken = true;
  }

  if (hasToken) {
    tokens.push(current);
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// Safe JSON
// ---------------------------------------------------------------------------

/**
 * `JSON.parse` wrapped in try/catch. Returns `fallback` on any parse error.
 */
export function tryParseJson<T>(input: string, fallback: T): T {
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}

/**
 * Parse newline-delimited JSON (JSON Lines). Blank lines and lines that fail to
 * parse are skipped. Returns the array of successfully parsed values.
 */
export function parseJsonLines(input: string): unknown[] {
  const result: unknown[] = [];
  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '') continue;
    try {
      result.push(JSON.parse(line));
    } catch {
      // skip invalid line
    }
  }
  return result;
}

/**
 * Access a nested value by dot-path. Supports object keys and numeric array
 * indices: `"a.b.0.c"`. Returns `fallback` (default `undefined`) when any
 * segment is missing or the target is not traversable.
 */
export function deepGet(obj: unknown, path: string, fallback?: unknown): unknown {
  if (path === '') return obj;
  const segments = path.split('.');
  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) return fallback;

    if (Array.isArray(current)) {
      const idx = Number(segment);
      if (!Number.isInteger(idx) || idx < 0 || idx >= current.length) {
        return fallback;
      }
      current = current[idx];
      continue;
    }

    if (typeof current === 'object') {
      const record = current as Record<string, unknown>;
      if (!(segment in record)) return fallback;
      current = record[segment];
      continue;
    }

    // Primitive but path continues — cannot descend.
    return fallback;
  }

  return current === undefined ? fallback : current;
}
