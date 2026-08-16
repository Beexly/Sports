/**
 * Unit tests for GSE-SEC-015 fix: B2B API rate limit is now durable (cross-instance,
 * backed by Postgres rate_limit_counters) instead of a process-local Map.
 *
 * These tests inject an InMemoryDurableRateLimiter (stub-safe, non-production)
 * so no real database is required. They prove:
 *  - within-quota requests return ok with remaining > 0
 *  - the (limit+1)th request in a window returns 429 with Retry-After
 *  - different keys have independent windows (per-key, not shared)
 *  - a window boundary resets the counter
 *  - store-unavailable → 503 (fail closed, never silent allow)
 */
import { describe, it, expect } from "vitest";
import {
  InMemoryDurableRateLimiter,
  RateLimitStoreUnavailableError,
} from "@/lib/community/durable-rate-limiter";
import { rateLimitB2b } from "@/lib/b2b/api-key-auth";

/**
 * A fake limiter that always throws RateLimitStoreUnavailableError,
 * exercising the fail-closed 503 path.
 */
class UnavailableLimiter {
  readonly durable = false;
  async consume(): Promise<never> {
    throw new RateLimitStoreUnavailableError("simulated store outage");
  }
}

describe("b2b/api-key-auth rateLimitB2b (GSE-SEC-015)", () => {
  it("allows requests within quota and reports remaining", async () => {
    const limiter = new InMemoryDurableRateLimiter({ NODE_ENV: "test" });
    const r1 = await rateLimitB2b("key-A", 5, 60_000, limiter);
    expect(r1.ok).toBe(true);
    if (r1.ok) expect(r1.remaining).toBe(4);

    const r2 = await rateLimitB2b("key-A", 5, 60_000, limiter);
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.remaining).toBe(3);
  });

  it("returns 429 with Retry-After on the (limit+1)th request in a window", async () => {
    const limiter = new InMemoryDurableRateLimiter({ NODE_ENV: "test" });
    const limit = 3;
    const windowMs = 60_000;

    // First `limit` requests all succeed.
    for (let i = 0; i < limit; i++) {
      const r = await rateLimitB2b("key-B", limit, windowMs, limiter);
      expect(r.ok).toBe(true);
    }

    // The (limit+1)th is denied.
    const blocked = await rateLimitB2b("key-B", limit, windowMs, limiter);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.status).toBe(429);
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("rate-limits keys independently (per-key, not shared)", async () => {
    const limiter = new InMemoryDurableRateLimiter({ NODE_ENV: "test" });
    const limit = 2;
    const windowMs = 60_000;

    // Exhaust key-1: 2 allowed, 3rd denied.
    await rateLimitB2b("key-1", limit, windowMs, limiter);
    await rateLimitB2b("key-1", limit, windowMs, limiter);
    const blocked = await rateLimitB2b("key-1", limit, windowMs, limiter);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.status).toBe(429);

    // A different key is unaffected.
    const r = await rateLimitB2b("key-2", limit, windowMs, limiter);
    expect(r.ok).toBe(true);
  });

  it("resets the counter at the window boundary", async () => {
    const limiter = new InMemoryDurableRateLimiter({ NODE_ENV: "test" });
    const limit = 2;
    const windowMs = 60_000;
    const base = new Date("2026-08-15T12:00:00.000Z");

    // Two requests in window 1 → second is allowed.
    await rateLimitB2b("key-C", limit, windowMs, limiter, base);
    await rateLimitB2b("key-C", limit, windowMs, limiter, base);

    // Still exhausted in the same window.
    const blocked = await rateLimitB2b("key-C", limit, windowMs, limiter, base);
    expect(blocked.ok).toBe(false);

    // New window → fresh allowance.
    const next = new Date(base.getTime() + windowMs);
    const r = await rateLimitB2b("key-C", limit, windowMs, limiter, next);
    expect(r.ok).toBe(true);
  });

  it("fails closed with 503 when the store is unavailable", async () => {
    const result = await rateLimitB2b("key-D", 60, 60_000, new UnavailableLimiter());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
      expect(result.retryAfterSec).toBeGreaterThan(0);
    }
  });
});
