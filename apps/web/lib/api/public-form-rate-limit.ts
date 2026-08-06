/**
 * Durable rate limit for public forms (waitlist, contest enter).
 * Uses Postgres rate_limit_counters so serverless multi-instance cannot bypass.
 * Keys are HMAC/sha256 fingerprints — never raw IP.
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

function fingerprintIp(ip: string): string {
  const pepper = process.env.GSE_EMAIL_HASH_PEPPER ?? process.env.NEXTAUTH_SECRET ?? "gse-rl";
  return createHash("sha256").update(`rl:${pepper}:${ip}`).digest("hex").slice(0, 40);
}

function resolveLimiter(): DurableRateLimiter {
  if (!isStubMode()) {
    return new PostgresDurableRateLimiter(db);
  }
  // Dev/test: in-memory (forbidden in production NODE_ENV by constructor)
  try {
    return new InMemoryDurableRateLimiter();
  } catch {
    // production + stub should not happen if Neon is required
    return new PostgresDurableRateLimiter(db);
  }
}

export type PublicFormRateResult =
  | { ok: true; decision?: RateLimitDecision }
  | { ok: false; retryAfterSec: number; status: 429 | 503 };

/**
 * Consume one permit for a public form scope.
 * Fail-closed: store unavailable → 503 (never silent allow in production).
 * Stub/dev falls back to process-local memory if durable store unavailable.
 */
export async function consumePublicFormRateLimit(
  scope: string,
  ip: string,
  limit: number,
  windowMs: number,
): Promise<PublicFormRateResult> {
  const key = fingerprintIp(ip);

  // Prefer durable when Neon is live
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
        };
      }
      return { ok: true, decision };
    } catch (err) {
      if (err instanceof RateLimitStoreUnavailableError) {
        return { ok: false, retryAfterSec: 30, status: 503 };
      }
      throw err;
    }
  }

  // Local/stub: memory bucket (CI / no Neon)
  const mem = consumeRateLimit(scope, key, limit, windowMs);
  if (!mem.ok) {
    return { ok: false, retryAfterSec: mem.retryAfterSec, status: 429 };
  }
  return { ok: true };
}
