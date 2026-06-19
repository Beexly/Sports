/**
 * URL and query string utilities — pure, zero dependencies.
 *
 * URL parsing, query string serialization/deserialization,
 * path manipulation, and route building for the Next.js app.
 * All functions are pure with no side effects.
 */

/**
 * Parse a query string (with or without leading "?") into a record.
 * Keys with multiple values become string[]; single values remain string.
 * Decodes URI components. Empty values produce key="".
 */
export function parseQueryString(qs: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};

  // Strip leading "?"
  const raw = qs.startsWith("?") ? qs.slice(1) : qs;
  if (!raw) return result;

  const pairs = raw.split("&");
  for (const pair of pairs) {
    if (!pair) continue;
    const eqIdx = pair.indexOf("=");
    let key: string;
    let value: string;

    if (eqIdx === -1) {
      key = decodeURIComponent(pair);
      value = "";
    } else {
      key = decodeURIComponent(pair.slice(0, eqIdx));
      value = decodeURIComponent(pair.slice(eqIdx + 1));
    }

    if (key === "") continue;

    const existing = result[key];
    if (existing === undefined) {
      result[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      result[key] = [existing, value];
    }
  }

  return result;
}

/**
 * Serialize a params object to a query string (without leading "?").
 * null/undefined values are skipped. boolean → "true"/"false". number → toString().
 * string[] → repeated key. Special chars are URI-encoded.
 */
export function stringifyQueryString(
  params: Record<string, string | string[] | number | boolean | null | undefined>
): string {
  const parts: string[] = [];

  for (const key of Object.keys(params)) {
    const value = params[key];
    if (value === null || value === undefined) continue;

    const encodedKey = encodeURIComponent(key);

    if (Array.isArray(value)) {
      for (const v of value) {
        parts.push(`${encodedKey}=${encodeURIComponent(v)}`);
      }
    } else if (typeof value === "boolean") {
      parts.push(`${encodedKey}=${value ? "true" : "false"}`);
    } else if (typeof value === "number") {
      parts.push(`${encodedKey}=${encodeURIComponent(String(value))}`);
    } else {
      parts.push(`${encodedKey}=${encodeURIComponent(value)}`);
    }
  }

  return parts.join("&");
}

/**
 * Append a query string to a base URL. If the base already has "?", append with "&".
 * If no params or all values are null/undefined, return base unchanged.
 */
export function buildUrl(
  base: string,
  params?: Record<string, string | string[] | number | boolean | null | undefined>
): string {
  if (!params) return base;

  const qs = stringifyQueryString(params);
  if (!qs) return base;

  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}${qs}`;
}

/**
 * Match a path against a route template with `:param` segments.
 * Returns the extracted params or null if the path doesn't match.
 * Requires exact segment count.
 *
 * Example: parsePathParams("/picks/:sport/:id", "/picks/nfl/123") → {sport:"nfl", id:"123"}
 */
export function parsePathParams(
  template: string,
  path: string
): Record<string, string> | null {
  const templateSegments = getPathSegments(template);
  const pathSegments = getPathSegments(path);

  if (templateSegments.length !== pathSegments.length) return null;

  const result: Record<string, string> = {};

  for (let i = 0; i < templateSegments.length; i++) {
    const tSeg = templateSegments[i];
    const pSeg = pathSegments[i];
    if (tSeg === undefined || pSeg === undefined) continue;

    if (tSeg.startsWith(":")) {
      result[tSeg.slice(1)] = pSeg;
    } else if (tSeg !== pSeg) {
      return null;
    }
  }

  return result;
}

/**
 * Replace `:param` placeholders in a template with actual values.
 * Throws if any placeholder is missing from the params object.
 *
 * Example: buildPath("/picks/:sport/:id", {sport:"nfl", id:123}) → "/picks/nfl/123"
 */
export function buildPath(
  template: string,
  params: Record<string, string | number>
): string {
  return template.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, key: string) => {
    const value = params[key];
    if (value === undefined) {
      throw new Error(`Missing path parameter: "${key}" in template "${template}"`);
    }
    return String(value);
  });
}

/**
 * Split a path into segments, filtering out empty strings.
 * "/" → []; "/a/b/c" → ["a","b","c"]
 */
export function getPathSegments(path: string): string[] {
  return path.split("/").filter((s) => s !== "");
}

/**
 * Join path parts, deduplicating slashes in the middle.
 * Leading slash is preserved if the first part starts with "/".
 * Never produces double slashes internally.
 *
 * joinPaths("/a/", "/b/", "c") → "/a/b/c"
 */
export function joinPaths(...parts: string[]): string {
  if (parts.length === 0) return "";

  const leadingSlash = parts[0]!.startsWith("/");

  const segments: string[] = [];
  for (const part of parts) {
    const inner = part.replace(/^\/+/, "").replace(/\/+$/, "");
    if (inner) {
      segments.push(...inner.split("/").filter((s) => s !== ""));
    }
  }

  const joined = segments.join("/");
  return leadingSlash ? `/${joined}` : joined;
}

/**
 * Returns true if the path is relative (does not start with "/" or a protocol).
 */
export function isRelativePath(path: string): boolean {
  return !path.startsWith("/") && !/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//.test(path);
}

/**
 * Returns true if the URL starts with "http://" or "https://".
 */
export function isAbsoluteUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

/**
 * Extract the origin (scheme + host + port) from an absolute URL.
 * Returns null for relative URLs.
 *
 * "https://example.com/path" → "https://example.com"
 */
export function extractOrigin(url: string): string | null {
  if (!isAbsoluteUrl(url)) return null;

  // Find the end of scheme ("https://")
  const schemeEnd = url.indexOf("://");
  if (schemeEnd === -1) return null;

  const afterScheme = url.slice(schemeEnd + 3);
  // Origin ends at first "/" or "?" or "#" or end of string
  const pathStart = afterScheme.search(/[/?#]/);
  const host = pathStart === -1 ? afterScheme : afterScheme.slice(0, pathStart);

  return `${url.slice(0, schemeEnd + 3)}${host}`;
}

/**
 * Get the pathname from a URL (without query string or hash).
 * Works for absolute and relative URLs.
 *
 * "https://example.com/a/b?q=1#hash" → "/a/b"
 * "relative/path?q=1" → "relative/path"
 */
export function extractPathname(url: string): string {
  let path = url;

  // Strip scheme and host for absolute URLs
  if (isAbsoluteUrl(url)) {
    const schemeEnd = url.indexOf("://");
    const afterScheme = url.slice(schemeEnd + 3);
    const pathStart = afterScheme.indexOf("/");
    path = pathStart === -1 ? "/" : afterScheme.slice(pathStart);
  }

  // Strip query string
  const queryIdx = path.indexOf("?");
  if (queryIdx !== -1) {
    path = path.slice(0, queryIdx);
  }

  // Strip hash
  const hashIdx = path.indexOf("#");
  if (hashIdx !== -1) {
    path = path.slice(0, hashIdx);
  }

  return path;
}

/**
 * Add a trailing slash to a path. Returns "/" unchanged.
 */
export function addTrailingSlash(path: string): string {
  if (path === "/") return "/";
  return path.endsWith("/") ? path : `${path}/`;
}

/**
 * Remove a trailing slash from a path. Returns "/" unchanged.
 */
export function removeTrailingSlash(path: string): string {
  if (path === "/") return "/";
  return path.endsWith("/") ? path.slice(0, -1) : path;
}

/**
 * Replace or add a query param in a URL (absolute or relative).
 * null value removes the param. All other params are preserved.
 */
export function replaceQueryParam(url: string, key: string, value: string | null): string {
  const qIdx = url.indexOf("?");
  const hashIdx = url.indexOf("#");

  const base = qIdx === -1 ? url : url.slice(0, qIdx);
  const hash = hashIdx === -1 ? "" : url.slice(hashIdx);
  const qsPart = qIdx === -1 ? "" : (hashIdx === -1 ? url.slice(qIdx + 1) : url.slice(qIdx + 1, hashIdx));

  const params = qsPart ? parseQueryString(qsPart) : {};

  if (value === null) {
    delete params[key];
  } else {
    params[key] = value;
  }

  const newQs = stringifyQueryString(params as Record<string, string | string[] | number | boolean | null | undefined>);
  if (!newQs) return `${base}${hash}`;
  return `${base}?${newQs}${hash}`;
}

/**
 * Get a single query param value from a URL.
 * Returns the first value if multiple exist, or null if not found.
 */
export function getQueryParam(url: string, key: string): string | null {
  const qIdx = url.indexOf("?");
  if (qIdx === -1) return null;

  const hashIdx = url.indexOf("#");
  const qsPart = hashIdx === -1 ? url.slice(qIdx + 1) : url.slice(qIdx + 1, hashIdx);
  const params = parseQueryString(qsPart);

  const value = params[key];
  if (value === undefined) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

/**
 * Parse all query params from a URL (handles both "?" and plain query strings).
 */
export function getAllQueryParams(url: string): Record<string, string | string[]> {
  const qIdx = url.indexOf("?");
  if (qIdx === -1) return {};

  const hashIdx = url.indexOf("#");
  const qsPart = hashIdx === -1 ? url.slice(qIdx + 1) : url.slice(qIdx + 1, hashIdx);
  return parseQueryString(qsPart);
}

/**
 * Route builders for the sports platform.
 * All paths are stable and typed as const.
 */
export const sportsRoutes = {
  picks: () => "/picks",
  pick: (id: string) => `/picks/${id}`,
  board: () => "/board",
  game: (gameId: string) => `/game/${gameId}`,
  team: (teamSlug: string) => `/team/${teamSlug}`,
  sport: (sport: string) => `/${sport}`,
  trending: () => "/trends",
  today: () => "/today",
  track: () => "/track",
} as const;
