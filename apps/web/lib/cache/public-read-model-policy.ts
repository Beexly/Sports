/**
 * Public read-model cache policy — how each surface may (or must not) be cached.
 *
 * Public proof pages change every few minutes/hours, not every request, so reading
 * Neon on every visitor is slow and costly. They should read prepared summaries with
 * an explicit TTL + cache tag + stale-while-revalidate posture, served from the CDN.
 * Sensitive surfaces (admin/auth/checkout/webhooks/cron) must NEVER be cached.
 *
 * This module is POLICY ONLY — a single source of truth that routes/loaders consult.
 * It does not flip global caching; behavior is wired per route after tests prove safety.
 * Compatible with Next 14 today (Cache-Control / revalidate); the same tags map onto
 * Next 16 cache components on an upgrade branch. Pure, no I/O.
 */

export type PublicSurface =
  | "picks-board"
  | "performance"
  | "clv"
  | "calibration"
  | "loss-autopsies"
  | "journal"
  | "proof"
  | "source-status"
  | "marketing";

export type SensitiveSurface = "admin" | "auth" | "checkout" | "webhooks" | "cron";

export type Surface = PublicSurface | SensitiveSurface;

export interface CachePolicy {
  readonly surface: Surface;
  /** Safe to cache at the CDN / shared cache. Always false for sensitive surfaces. */
  readonly cdnSafe: boolean;
  /** Hard no-store: never cache, never store. True for admin/auth/checkout/webhooks/cron. */
  readonly noStore: boolean;
  /** Fresh window in seconds (0 when noStore). */
  readonly ttlSeconds: number;
  /** Serve stale up to this many seconds while revalidating (0 when noStore). */
  readonly staleWhileRevalidateSeconds: number;
  /** Cache tag for targeted invalidation (null when noStore). */
  readonly cacheTag: string | null;
  /** What event should bust this cache. */
  readonly invalidationTrigger: string;
}

const NEVER_CACHE = (surface: SensitiveSurface, why: string): CachePolicy => ({
  surface,
  cdnSafe: false,
  noStore: true,
  ttlSeconds: 0,
  staleWhileRevalidateSeconds: 0,
  cacheTag: null,
  invalidationTrigger: why,
});

export const CACHE_POLICIES: Record<Surface, CachePolicy> = {
  // ── Public proof surfaces: explicit TTL + tag + SWR, CDN-safe ──
  "picks-board": {
    surface: "picks-board",
    cdnSafe: true,
    noStore: false,
    ttlSeconds: 60,
    staleWhileRevalidateSeconds: 300,
    cacheTag: "picks-board",
    invalidationTrigger: "new pick generated or pick settled",
  },
  performance: {
    surface: "performance",
    cdnSafe: true,
    noStore: false,
    ttlSeconds: 300,
    staleWhileRevalidateSeconds: 900,
    cacheTag: "performance",
    invalidationTrigger: "pick settlement / calibration recompute",
  },
  clv: {
    surface: "clv",
    cdnSafe: true,
    noStore: false,
    ttlSeconds: 300,
    staleWhileRevalidateSeconds: 900,
    cacheTag: "clv",
    invalidationTrigger: "CLV graded at settlement",
  },
  calibration: {
    surface: "calibration",
    cdnSafe: true,
    noStore: false,
    ttlSeconds: 600,
    staleWhileRevalidateSeconds: 1800,
    cacheTag: "calibration",
    invalidationTrigger: "settlement batch / model version bump",
  },
  "loss-autopsies": {
    surface: "loss-autopsies",
    cdnSafe: true,
    noStore: false,
    ttlSeconds: 600,
    staleWhileRevalidateSeconds: 3600,
    cacheTag: "loss-autopsies",
    invalidationTrigger: "loss autopsy published",
  },
  journal: {
    surface: "journal",
    cdnSafe: true,
    noStore: false,
    ttlSeconds: 600,
    staleWhileRevalidateSeconds: 3600,
    cacheTag: "journal",
    invalidationTrigger: "model journal entry published",
  },
  proof: {
    surface: "proof",
    cdnSafe: true,
    noStore: false,
    ttlSeconds: 300,
    staleWhileRevalidateSeconds: 1800,
    cacheTag: "proof",
    invalidationTrigger: "receipt minted / slate committed / settlement",
  },
  "source-status": {
    surface: "source-status",
    cdnSafe: true,
    noStore: false,
    ttlSeconds: 900,
    staleWhileRevalidateSeconds: 3600,
    cacheTag: "source-status",
    invalidationTrigger: "source rights registry change / clearance change",
  },
  marketing: {
    surface: "marketing",
    cdnSafe: true,
    noStore: false,
    ttlSeconds: 3600,
    staleWhileRevalidateSeconds: 86400,
    cacheTag: "marketing",
    invalidationTrigger: "deploy / content edit",
  },

  // ── Sensitive surfaces: hard no-store ──
  admin: NEVER_CACHE("admin", "per-operator, never cache"),
  auth: NEVER_CACHE("auth", "session/credentials, never cache"),
  checkout: NEVER_CACHE("checkout", "billing/PII, never cache"),
  webhooks: NEVER_CACHE("webhooks", "signed events, never cache"),
  cron: NEVER_CACHE("cron", "privileged jobs, never cache"),
};

export function cachePolicyFor(surface: Surface): CachePolicy {
  return CACHE_POLICIES[surface];
}

/** Build a Cache-Control header from a policy (Next 14-compatible). */
export function cacheControlHeader(policy: CachePolicy): string {
  if (policy.noStore) return "no-store";
  return `public, s-maxage=${policy.ttlSeconds}, stale-while-revalidate=${policy.staleWhileRevalidateSeconds}`;
}
