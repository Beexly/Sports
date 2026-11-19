/**
 * Bounded in-process snapshot cache and read-timeout constants for
 * `/api/ops/public-surface-truth`.
 *
 * Extracted out of `route.ts` because Next.js 14 App Router rejects any
 * non-HTTP-handler exports in route modules during `next build`.
 */

export const PUBLIC_SURFACE_TRUTH_CACHE_TTL_MS = 45_000;
export const PUBLIC_SURFACE_TRUTH_READ_TIMEOUT_MS = 3_500;

export type TruthCacheBucket = "public" | "operator";

export type TruthCacheEntry = {
  readonly payload: Record<string, unknown>;
  readonly expiresAt: number;
};

const truthResponseCache = new Map<TruthCacheBucket, TruthCacheEntry>();
let testCacheOverride: boolean | null = null;

/** Test-only helper: clear cached truth snapshots and restore default test cache behavior. */
export function __resetPublicSurfaceTruthCacheForTests(): void {
  truthResponseCache.clear();
  testCacheOverride = null;
}

/** Test-only helper: explicitly enable or disable the 45s cache inside Vitest. */
export function __setPublicSurfaceTruthCacheEnabledForTests(enabled: boolean | null): void {
  testCacheOverride = enabled;
  if (!enabled) {
    truthResponseCache.clear();
  }
}

export function shouldUseTruthCache(
  request: Request,
  detailed: boolean,
): { enabled: boolean; bypassRead: boolean } {
  let fresh = false;
  try {
    const parsed = new URL(request.url);
    const param = parsed.searchParams.get("fresh");
    fresh = param === "1" || param === "true";
  } catch {
    fresh = false;
  }

  const headerOptIn = request.headers.get("x-ops-truth-cache") === "1";
  const isTestEnv = process.env.NODE_ENV === "test";
  const enabled =
    testCacheOverride !== null
      ? testCacheOverride
      : headerOptIn || !isTestEnv;

  // Only authenticated operators may bypass the snapshot cache via ?fresh=1
  // so unauthenticated callers cannot trigger repeated DB stampedes.
  return { enabled, bypassRead: detailed && fresh };
}

export function getCachedTruthSnapshot(
  bucket: TruthCacheBucket,
  nowMs: number = Date.now(),
): Record<string, unknown> | null {
  const hit = truthResponseCache.get(bucket);
  if (hit && hit.expiresAt > nowMs) {
    return hit.payload;
  }
  return null;
}

export function setCachedTruthSnapshot(
  bucket: TruthCacheBucket,
  payload: Record<string, unknown>,
  ttlMs: number = PUBLIC_SURFACE_TRUTH_CACHE_TTL_MS,
): void {
  truthResponseCache.set(bucket, {
    payload,
    expiresAt: Date.now() + ttlMs,
  });
}
