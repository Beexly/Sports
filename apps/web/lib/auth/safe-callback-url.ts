/**
 * Reduce a NextAuth `callbackUrl` to a SAFE same-origin path.
 *
 * Returns a relative path (`pathname` + `search` + `hash`) only when `raw`
 * resolves to the same origin; otherwise falls back to `/dashboard`. This is the
 * open-redirect guard for the sign-in page, whose already-signed-in branch hands
 * the value straight to Next's `redirect()` (no NextAuth re-validation).
 *
 * Parsing against a sentinel origin with the WHATWG URL parser closes the gaps a
 * naive string check leaves open. The previous guard only rejected `//evil.com`;
 * it let `/\evil.com` through, which browsers normalise to `//evil.com` — a live
 * open redirect. The parser normalises backslashes, so `/\evil.com` resolves to
 * the `evil.com` origin and is rejected here. Absolute URLs (`https://evil.com`),
 * other-scheme URIs (`javascript:…`), and malformed input all fall back too.
 */
export function safeCallbackUrl(raw: string | undefined | null): string {
  const FALLBACK = "/dashboard";
  if (!raw) return FALLBACK;
  try {
    // A reserved (.invalid) sentinel host an attacker can never legitimately own.
    const SENTINEL = "https://callback.invalid";
    const url = new URL(raw, SENTINEL);
    if (url.origin !== SENTINEL) return FALLBACK;
    const path = `${url.pathname}${url.search}${url.hash}`;
    return path.startsWith("/") ? path : FALLBACK;
  } catch {
    return FALLBACK;
  }
}
