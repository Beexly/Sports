/**
 * Durable rate limit for public endpoints — originally forms (waitlist,
 * contest enter), now also the public pick reads (/api/picks, daily-slate,
 * [id]/audit) and the per-user explain wallet guard.
 * Uses Postgres rate_limit_counters so serverless multi-instance cannot bypass:
 * the in-memory limiter is per-process, which on serverless makes the real
 * quota (limit × warm instances), not (limit).
 * Keys are sha256 fingerprints — never a raw IP or user id (privacy).
 * Stub/test mode falls back to the in-memory limiter so suites need no DB.
 */

import { createHash } from "node:crypto";
import { db, isStubMode } from "@sports/db";
import {
  InMemoryDurableRateLimiter,
  PostgresDurableRateLimiter,
  RateLimitStoreUnavailableError,
  type DurableRateLimiter,
  type RateLimitDecision,
} from "@/lib/community/durable-rate-limiter";
import { consumeRateLimit } from "@/lib/api/rate-limit";

/** Opaque fingerprint for rate-limit keys (never store raw IP). */
export function fingerprintClientKey(raw: string): string {
  const pepper =
    process.env.GSE_EMAIL_HASH_PEPPER ??
    process.env.NEXTAUTH_SECRET ??
    "gse-rl";
  return createHash("sha256").update(`rl:${pepper}:${raw}`).digest("hex").slice(0, 40);
}

function resolveLimiter(): DurableRateLimiter {
  if (!isStubMode()) {
    return new PostgresDurableRateLimiter(db);
  }
  try {
    return new InMemoryDurableRateLimiter({ NODE_ENV: "test" });
  } catch {
    return new PostgresDurableRateLimiter(db);
  }
}

export type PublicFormRateResult =
  | { ok: true; decision?: RateLimitDecision; backend: "postgres" | "memory" }
  | { ok: false; retryAfterSec: number; status: 429 | 503; backend: "postgres" | "memory" };

/**
 * Consume one permit for a public form scope.
 * Production/Neon: Postgres atomic upsert (cross-instance).
 * Stub/dev: process-local memory.
 * Fail-closed: store unavailable → 503 (never silent allow when durable expected).
 */
export async function consumePublicFormRateLimit(
  scope: string,
  ip: string,
  limit: number,
  windowMs: number,
): Promise<PublicFormRateResult> {
  const key = fingerprintClientKey(ip);

  if (!isStubMode()) {
    try {
      const decision = await resolveLimiter().consume({
        scope,
        key,
        limit,
        windowMs,
      });
      if (!decision.allowed) {
        return {
          ok: false,
          retryAfterSec: Math.max(1, Math.ceil(decision.retryAfterMs / 1000)),
          status: 429,
          backend: "postgres",
        };
      }
      return { ok: true, decision, backend: "postgres" };
    } catch (err) {
      if (err instanceof RateLimitStoreUnavailableError) {
        return { ok: false, retryAfterSec: 30, status: 503, backend: "postgres" };
      }
      throw err;
    }
  }

  const mem = consumeRateLimit(scope, key, limit, windowMs);
  if (!mem.ok) {
    return { ok: false, retryAfterSec: mem.retryAfterSec, status: 429, backend: "memory" };
  }
  return { ok: true, backend: "memory" };
}
