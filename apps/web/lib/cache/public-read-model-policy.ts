/**
 * Public read-model cache policy — which public surfaces are CDN-cacheable, and how.
 *
 * SECURITY-CRITICAL. Anything that reads auth/session, entitlements, or per-user data
 * MUST stay `no-store` — caching it would leak one viewer's response to another via the
 * shared CDN. This module is therefore **fail-safe**: every path defaults to `no-store`,
 * and only an explicit, human-verified allow-list of "same bytes for everyone" surfaces
 * is marked CDN-cacheable.
 *
 * Intent + TTLs live here; wiring a route to a policy (setting the Cache-Control header)
 * is a deliberate, reviewed step — this module does NOT auto-apply to any route. It
 * exists so that step is principled instead of ad-hoc (and so the default is safe).
 */

export type CachePolicy =
  | { readonly mode: "no-store"; readonly reason: string }
  | {
      readonly mode: "cdn";
      readonly sMaxAgeSeconds: number;
      readonly swrSeconds: number;
      readonly reason: string;
    };

const noStore = (reason: string): CachePolicy => ({ mode: "no-store", reason });
const cdn = (sMaxAgeSeconds: number, swrSeconds: number, reason: string): CachePolicy => ({
  mode: "cdn",
  sMaxAgeSeconds,
  swrSeconds,
  reason,
});

/**
 * Path prefixes that MUST NEVER be cached — per-user, entitlement-gated, sensitive,
 * or mutating. Caching any of these would be a cross-user data leak. This list is the
 * security backstop; `cachePolicyFor` returns no-store for anything matching it.
 */
export const NEVER_CACHE_PREFIXES = [
  "/api/auth",
  "/api/subscriptions",
  "/api/webhooks",
  "/api/cron",
  "/api/admin",
  "/api/board/state",
  "/api/picks",
  "/api/tools",
  "/api/intelligence",
  "/api/sleeper",
  "/api/fantasy-pass",
  "/api/cockpit",
  "/dashboard",
] as const;

/**
 * Explicit allow-list of public read surfaces that are SAFE to CDN-cache because they
 * return identical bytes for every viewer (no auth, no per-user data). Add a route here
 * ONLY after verifying it reads no session/entitlements/user data. Starts empty by
 * design — fail-safe over convenient.
 */
export const PUBLIC_READ_POLICIES: Readonly<Record<string, CachePolicy>> = {
  // Example (commented until verified + wired):
  // "/api/sources/catalog": cdn(3600, 86400, "Static source catalog — identical for all viewers."),
};

/** Resolve the cache policy for a path. Fail-safe: defaults to no-store. */
export function cachePolicyFor(path: string): CachePolicy {
  if (NEVER_CACHE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(p))) {
    return noStore("Per-user / entitlement-gated / sensitive / mutating — never cache.");
  }
  const exact = PUBLIC_READ_POLICIES[path];
  if (exact) return exact;
  return noStore("Unclassified — fail-safe no-store until explicitly reviewed + allow-listed.");
}

/** The Cache-Control header value for a policy. */
export function cacheControlHeader(policy: CachePolicy): string {
  if (policy.mode === "no-store") return "no-store, max-age=0";
  return `public, s-maxage=${policy.sMaxAgeSeconds}, stale-while-revalidate=${policy.swrSeconds}`;
}

/** Convenience: the Cache-Control a path should send (fail-safe no-store by default). */
export function cacheControlFor(path: string): string {
  return cacheControlHeader(cachePolicyFor(path));
}

export { cdn as cdnPolicy, noStore as noStorePolicy };
