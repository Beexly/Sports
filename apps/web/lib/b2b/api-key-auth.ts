/**
 * B2B API key auth — env comma-separated keys (no DB table yet).
 * GSE_B2B_API_KEYS=key1,key2
 *
 * Rate limiting (GSE-SEC-015): the previous implementation used a process-local
 * Map, which silently reset on every serverless cold start and was not shared
 * across instances. This version uses the durable Postgres-backed rate limiter
 * (see @/lib/community/durable-rate-limiter) so the limit is enforced exactly
 * across all instances. In stub/test mode an in-memory limiter is used as a
 * fail-closed fallback.
 */

import { timingSafeEqual } from "node:crypto";
import { db, isStubMode } from "@sports/db";
import { fingerprintClientKey } from "@/lib/api/public-form-rate-limit";
import {
  InMemoryDurableRateLimiter,
  PostgresDurableRateLimiter,
  RateLimitStoreUnavailableError,
  type DurableRateLimiter,
  type RateLimitDecision,
} from "@/lib/community/durable-rate-limiter";

export function extractB2bApiKey(req: Request): string | null {
  const h = req.headers.get("x-api-key") ?? req.headers.get("authorization");
  if (!h) return null;
  if (h.toLowerCase().startsWith("bearer ")) return h.slice(7).trim() || null;
  return h.trim() || null;
}

export function authorizeB2bApiKey(req: Request, env: Record<string, string | undefined> = process.env): boolean {
  const presented = extractB2bApiKey(req);
  if (!presented) return false;
  const raw = env["GSE_B2B_API_KEYS"]?.trim() ?? "";
  if (!raw) return false;
  const keys = raw.split(",").map((k) => k.trim()).filter(Boolean);
  const a = Buffer.from(presented);
  for (const k of keys) {
    const b = Buffer.from(k);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

const B2B_RATE_LIMIT_SCOPE = "b2b:api-key";

/**
 * Resolve the durable rate limiter for B2B API keys.
 * Production: Postgres-backed, cross-instance.
 * Stub/test: in-memory, fails closed in production (constructor refuses).
 */
function resolveB2bRateLimiter(): DurableRateLimiter {
  if (!isStubMode()) {
    return new PostgresDurableRateLimiter(db);
  }
  try {
    return new InMemoryDurableRateLimiter({ NODE_ENV: process.env.NODE_ENV });
  } catch {
    return new PostgresDurableRateLimiter(db);
  }
}

/**
 * Durable, cross-instance rate limit for B2B API key requests.
 *
 * Returns:
 * - `{ ok: true, remaining }` when the request is allowed (quota remains).
 * - `{ ok: false, status: 429, retryAfterSec }` when the per-key quota for the
 *   current window is exhausted.
 * - `{ ok: false, status: 503, retryAfterSec }` when the rate-limit store is
 *   unavailable (fail closed — never silent allow when durable is required).
 *
 * @param key        The API key string (used as the rate-limit key).
 * @param limit      Max requests per window. Defaults to 60 (signals).
 * @param windowMs   Window length in ms. Defaults to 60_000 (1 minute).
 * @param limiter    Optional injection for tests (defaults to production resolver).
 * @param now        Optional injectable clock for deterministic window tests.
 */
export async function rateLimitB2b(
  key: string,
  limit = 60,
  windowMs = 60_000,
  limiter: DurableRateLimiter | undefined = resolveB2bRateLimiter(),
  now: Date | undefined = undefined,
): Promise<
  | { ok: true; remaining: number }
  | { ok: false; status: 429 | 503; retryAfterSec: number }
> {
  try {
    const decision: RateLimitDecision = await limiter.consume({
      scope: B2B_RATE_LIMIT_SCOPE,
      key: fingerprintClientKey(key),
      limit,
      windowMs,
      now,
    });
    if (!decision.allowed) {
      return {
        ok: false,
        status: 429,
        retryAfterSec: Math.max(1, Math.ceil(decision.retryAfterMs / 1000)),
      };
    }
    const consumed = decision.count ?? 0;
    return { ok: true, remaining: Math.max(0, limit - consumed) };
  } catch (err) {
    if (err instanceof RateLimitStoreUnavailableError) {
      // Fail closed: if the durable store is unavailable, deny with 503.
      return { ok: false, status: 503, retryAfterSec: 30 };
    }
    throw err;
  }
}
