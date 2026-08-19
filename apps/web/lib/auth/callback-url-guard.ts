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
 */

const DEFAULT_CALLBACK_URL = "/dashboard";

/**
 * Validate a callbackUrl: accept only a safe same-origin relative path,
 * reject everything else (absolute URLs, protocol-relative, triple-slash,
 * backslash, bare "/").
 *
 * @param raw  the untrusted callbackUrl string (may be undefined)
 * @returns    a safe relative path, or DEFAULT_CALLBACK_URL
 */
export function safeCallbackUrl(raw: string | undefined): string {
  if (!raw) return DEFAULT_CALLBACK_URL;

  // Must start with exactly one "/" — blocks "//evil.com" (protocol-relative),
  // "///evil.com" (browser normalizes to "//evil.com"), and all absolute URLs.
  if (!raw.startsWith("/")) return DEFAULT_CALLBACK_URL;
  if (raw.startsWith("//")) return DEFAULT_CALLBACK_URL;
  if (raw.startsWith("/\\")) return DEFAULT_CALLBACK_URL;

  // Reject a bare "/" or "/\" — the root page is never a meaningful callback
  // target for a post-sign-in redirect.
  if (raw === "/" || raw === "/\\") return DEFAULT_CALLBACK_URL;

  return raw;
}
