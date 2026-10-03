/**
 * CSRF / Origin guard for cookie-mutating POST routes.
 *
 * Why this exists: the only user-auth cookie mutations in this codebase happen
 * through the NextAuth callback route (`apps/web/app/api/auth/[...nextauth]/route.ts`).
 * NextAuth has its own internal CSRF token for OAuth, but that token is not a
 * substitute for an Origin/Referer check on state-changing endpoints that rely
 * on session cookies for authorization (e.g. push subscribe/unsubscribe, checkout,
 * review mutations). A cross-site POST with a valid session cookie would otherwise
 * sail through server-side auth checks.
 *
 * This guard enforces same-origin on the `Origin` (preferred) or `Referer` header.
 * It is deliberately pure (env only, no DB, no imports) so it is trivially
 * unit-testable and safe to call from any route handler.
 */

/**
 * The expected application origin, read from NEXT_PUBLIC_APP_URL.
 * Returns null when the env var is unset (non-fatal: callers decide).
 */
function expectedOrigin(): string | null {
  const url = process.env["NEXT_PUBLIC_APP_URL"];
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

/**
 * Extract the origin from an Origin or Referer header value.
 * Returns null if the value is not a valid absolute URL.
 */
function originOf(headerValue: string | null): string | null {
  if (!headerValue) return null;
  try {
    const u = new URL(headerValue);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

export type CsrfOriginResult = { ok: boolean; reason: string };

/**
 * CSRF/Origin verdict for a state-changing request.
 *
 * @returns `{ ok: true }` when the origin matches the expected app origin.
 *          `{ ok: false, reason }` when the origin is missing, malformed, or
 *          cross-site. Callers should reject on `ok: false`.
 */
export function csrfOriginCheck(
  requestOrigin: string | null,
  fallbackReferer: string | null,
): CsrfOriginResult {
  const expected = expectedOrigin();
  const actual = originOf(requestOrigin) ?? originOf(fallbackReferer);

  if (!actual) {
    return { ok: false, reason: "Origin/Referer header missing or unparseable" };
  }

  if (!expected) {
    // No app URL configured — we cannot verify same-origin. Fail closed.
    return { ok: false, reason: "NEXT_PUBLIC_APP_URL not configured; cannot verify origin" };
  }

  if (actual !== expected) {
    return { ok: false, reason: `Cross-origin request: ${actual} is not ${expected}` };
  }

  return { ok: true, reason: "Origin verified" };
}
