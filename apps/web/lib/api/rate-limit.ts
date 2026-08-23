/**
 * Shared in-memory token-bucket rate limiter for API routes.
 *
 * Mirrors the per-IP limiter pattern in cipher/verify, generalized so the
 * money-spending, authenticated endpoints (Claude-backed explain / model-court)
 * can throttle per user. In-memory and per-instance — a durable store would be
 * needed for multi-instance correctness, but this is enough to stop a single
 * caller from looping an endpoint and draining the shared monthly Claude budget
 * (denial-of-wallet) between budget-gate checks.
 */

import type { NextRequest } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}

const registries = new Map<string, Map<string, Bucket>>();

export interface RateLimitResult {
  readonly ok: boolean;
  readonly retryAfterSec: number;
}

/**
 * Consume one token for `key` within the named `bucketId` registry.
 * @param bucketId  logical limiter name (keeps independent endpoints separate)
 * @param key       the subject to limit (e.g. userId or IP)
 * @param max       max requests per window
 * @param windowMs  window length in ms
 */
export function consumeRateLimit(
  bucketId: string,
  key: string,
  max: number,
  windowMs: number,
): RateLimitResult {
  let registry = registries.get(bucketId);
  if (!registry) {
    registry = new Map<string, Bucket>();
    registries.set(bucketId, registry);
  }
  const now = Date.now();
  const b = registry.get(key);
  if (!b || now >= b.resetAt) {
    registry.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (b.count >= max) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

/** Best-effort client IP from forwarding headers. */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "anon";
}

/** Test-only: clear every rate-limit bucket so suites that share a key are deterministic. */
export function resetRateLimits(): void {
  registries.clear();
}
