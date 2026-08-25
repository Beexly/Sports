/**
 * Callback URL validation — prevents open-redirect via the NextAuth
 * `callbackUrl` parameter after sign-in or sign-out.
 *
 * Why this exists: NextAuth's signIn/signOut accept a `callbackUrl` option
 * that, if taken raw from user input, can be an absolute URL (open redirect)
 * or an absolute-path string that browsers normalize to a cross-site destination.
 *
 * This guard strips every non-relative path to a safe default (`/dashboard`),
 * and also rejects bare `/` (the root page is never a meaningful post-auth
 * destination) and protocol-relative / backslash variants.
 *
 * ── THE CONTROL-CHARACTER CLASS (why a `startsWith` prefix scan is not enough) ─
 *
 * The WHATWG URL parser — the algorithm every browser uses — REMOVES all ASCII
 * tab (U+0009), LF (U+000A) and CR (U+000D) from the input *before* parsing it.
 * So a payload that a prefix scan reads as a harmless single-slash path:
 *
 *     "/<TAB>/evil.example"  → prefix scan sees "/" then TAB: not "//", accepted
 *     browser strips the TAB → "//evil.example" → protocol-relative
 *     resolved               → https://evil.example          ← OFF-ORIGIN
 *
 * "/<TAB>\evil.example" is the same trick with the backslash variant (browsers
 * treat "\" as "/" in special-scheme URLs). Node's own header validation
 * ACCEPTS a tab inside a `Location` value (only LF/CR are rejected), so the tab
 * variant survives all the way to the browser out of `redirect()`.
 *
 * Two independent defenses are therefore applied below:
 *   1. reject any candidate containing a C0 control character or DEL, and
 *   2. re-resolve the survivor with the SAME WHATWG algorithm the browser runs
 *      and confirm it still lands on the origin it was resolved against.
 *
 * (2) is the load-bearing one: it validates the whole class rather than an
 * enumerated payload list, so the next normalization quirk fails closed too.
 */

const DEFAULT_CALLBACK_URL = "/dashboard";

/**
 * Sentinel origin used only to resolve a candidate against the real WHATWG URL
 * parser. It never appears in a returned value — the check is "does this
 * relative reference stay on whatever origin it is resolved against?".
 * `.invalid` is reserved by RFC 2606 and can never be a real host.
 */
const RESOLVE_SENTINEL = "https://callback-url-guard.invalid";

/**
 * True when `value` contains a C0 control character (U+0000–U+001F, which
 * includes TAB/LF/CR) or DEL (U+007F). Written as a codepoint scan rather than
 * a regex so no control character has to be embedded in this source file.
 */
function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/**
 * Core same-origin check. Returns a safe root-relative path (pathname + search
 * + hash) when `raw` can only ever resolve on the current origin, else null.
 *
 * Bare "/" IS allowed here — it is a legitimate post-sign-out destination.
 * {@link safeCallbackUrl} rejects it separately for the post-sign-IN case.
 */
export function normalizeRelativePath(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // Defense 1 — no control characters. A browser deletes TAB/LF/CR while
  // parsing, which changes the string's meaning after every check below has run.
  if (hasControlChar(raw)) return null;

  // Must start with exactly one "/" — blocks "//evil.com" (protocol-relative),
  // "///evil.com" (browser normalizes to "//evil.com"), and all absolute URLs.
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  if (raw.startsWith("/\\")) return null;

  // Defense 2 — resolve with the real WHATWG parser and require the origin to
  // be unchanged. This is what actually decides the verdict; the prefix checks
  // above are the fast, readable path for the common payloads.
  let resolved: URL;
  try {
    resolved = new URL(raw, RESOLVE_SENTINEL);
  } catch {
    return null;
  }
  if (resolved.origin !== RESOLVE_SENTINEL) return null;

  const path = `${resolved.pathname}${resolved.search}${resolved.hash}`;
  // Paranoia: a resolved path must never itself read as protocol-relative.
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  return path;
}

/**
 * Validate a callbackUrl: accept only a safe same-origin relative path,
 * reject everything else (absolute URLs, protocol-relative, triple-slash,
 * backslash, control-character variants, bare "/").
 *
 * @param raw  the untrusted callbackUrl string (may be undefined)
 * @returns    a safe relative path, or DEFAULT_CALLBACK_URL
 */
export function safeCallbackUrl(raw: string | undefined): string {
  const path = normalizeRelativePath(raw);
  if (path === null) return DEFAULT_CALLBACK_URL;
  // Reject a bare "/" — the root page is never a meaningful callback target
  // for a post-sign-in redirect.
  if (path === "/") return DEFAULT_CALLBACK_URL;
  return path;
}

/** Parse an origin ("scheme://host[:port]") out of a URL string, else null. */
function originOf(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Destination resolver for NextAuth's `callbacks.redirect`.
 *
 * NextAuth v5 ships a default `redirect` callback that is same-origin safe, but
 * this app inherits it implicitly from a `5.0.0-beta` dependency and pins
 * `trustHost: true`, so the origin it validates against is request-derived.
 * Declaring the callback explicitly (a) puts the invariant under this repo's
 * own tests instead of a transitive dependency's, (b) applies the hardened
 * control-character rejection above, and (c) never echoes back an absolute URL
 * on an origin we did not vet.
 *
 * Allowed destinations:
 *   - any safe root-relative path  → rebased onto the REQUEST origin
 *   - an absolute URL whose origin is the request origin or the canonical one
 *   - anything else                → the request origin's root
 *
 * The request origin (`baseUrl`) — not the canonical origin — is the base for
 * relative paths on purpose: local dev and preview deployments must keep
 * redirecting to themselves. `SITE_URL` falls back to the production host when
 * `NEXT_PUBLIC_APP_URL` is unset, so using it as the base would bounce a local
 * sign-in to production.
 *
 * @param url              the destination NextAuth wants to send the user to
 * @param baseUrl          the request's own origin, as NextAuth resolved it
 * @param canonicalOrigin  the canonical site URL (SITE_URL), also accepted
 */
export function resolveAuthRedirect(
  url: string,
  baseUrl: string,
  canonicalOrigin?: string | null,
): string {
  const requestOrigin = originOf(baseUrl);
  const canonical = originOf(canonicalOrigin);
  // With no parseable request origin there is nothing safe to build an
  // absolute destination on — hand back a relative root instead of guessing.
  const home = requestOrigin ?? canonical;
  if (home === null) return "/";

  const relative = normalizeRelativePath(url);
  if (relative !== null) return `${home}${relative}`;

  const target = (() => {
    try {
      return new URL(url);
    } catch {
      return null;
    }
  })();
  if (target !== null && (target.origin === requestOrigin || target.origin === canonical)) {
    // Re-emit from parsed parts so nothing but scheme/host/path/query/hash
    // (already normalized by the parser) can survive into the Location value.
    return `${target.origin}${target.pathname}${target.search}${target.hash}`;
  }

  return home;
}
