/**
 * Canonical site URL — the single source of truth for the primary public host.
 *
 * Resolves to `NEXT_PUBLIC_APP_URL` when set (the deployed host), otherwise
 * defaults to the **www** host: `https://www.galaxysportsedge.com`.
 *
 * Why www (not the apex): the live site, the Stripe webhook, and the Google
 * OAuth callback all use the www host. Defaulting to the apex here would split
 * SEO/canonical signals and could stamp share cards, sitemap/robots hints, and
 * JSON-LD with a non-primary host. Keeping a single default guarantees every
 * canonical surface agrees.
 *
 * Route ALL absolute public-URL construction — metadataBase, sitemap, robots,
 * canonical tags, JSON-LD, RSS — through this module. Do not re-derive a base
 * URL or hardcode the apex as a default anywhere else.
 *
 * NOTE: This is the CANONICAL public identity host. Runtime redirect origins
 * that must fall back to `http://localhost:3000` for local dev (Stripe checkout
 * success/cancel URLs, the billing portal return URL) are a separate concern and
 * intentionally do not read from here.
 */

/** The primary public host, used whenever `NEXT_PUBLIC_APP_URL` is unset. */
export const CANONICAL_SITE_URL = "https://www.galaxysportsedge.com";

/**
 * The resolved canonical base URL, with any trailing slash stripped so
 * `${SITE_URL}${path}` (path starting with "/") never produces a double slash.
 */
export const SITE_URL: string = (
  process.env["NEXT_PUBLIC_APP_URL"] ?? CANONICAL_SITE_URL
).replace(/\/$/, "");

/** Build an absolute URL on the canonical host from a root-relative path. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
