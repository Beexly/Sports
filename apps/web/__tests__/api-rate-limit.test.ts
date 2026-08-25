import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { consumeRateLimit, clientIp } from "@/lib/api/rate-limit";

/**
 * Pins the shared in-memory token-bucket limiter:
 *   consumeRateLimit(bucketId, key, max, windowMs): { ok, retryAfterSec }
 *
 * The `registries` Map is module-global and persists across cases, so each
 * test uses DISTINCT bucketIds/keys to stay isolated from the others.
 */

const WINDOW_MS = 60_000;
const T0 = new Date("2026-05-22T16:00:00.000Z");

/** Minimal header-bag stub matching what clientIp() reads. */
function reqWithHeaders(headers: Record<string, string>): NextRequest {
  return {
    headers: {
      get: (name: string): string | null => headers[name.toLowerCase()] ?? null,
    },
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("consumeRateLimit", () => {
  it("allows the first `max` calls then blocks the (max+1)th with retryAfterSec > 0", () => {
    const bucketId = "rl-test-limit";
    const key = "user-a";
    const max = 3;

    for (let i = 0; i < max; i += 1) {
      const r = consumeRateLimit(bucketId, key, max, WINDOW_MS);
      expect(r.ok, `call ${i + 1} of ${max} should be allowed`).toBe(true);
      expect(r.retryAfterSec).toBe(0);
    }

    const blocked = consumeRateLimit(bucketId, key, max, WINDOW_MS);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("counts the same key independently across two different bucketIds", () => {
    const key = "shared-key";
    const max = 1;

    // Exhaust bucket A.
    expect(consumeRateLimit("rl-test-bucketA", key, max, WINDOW_MS).ok).toBe(true);
    expect(consumeRateLimit("rl-test-bucketA", key, max, WINDOW_MS).ok).toBe(false);

    // Bucket B for the same key is untouched.
    expect(consumeRateLimit("rl-test-bucketB", key, max, WINDOW_MS).ok).toBe(true);
    expect(consumeRateLimit("rl-test-bucketB", key, max, WINDOW_MS).ok).toBe(false);
  });

  it("counts two keys independently within one bucketId", () => {
    const bucketId = "rl-test-keys";
    const max = 1;

    expect(consumeRateLimit(bucketId, "key-1", max, WINDOW_MS).ok).toBe(true);
    expect(consumeRateLimit(bucketId, "key-1", max, WINDOW_MS).ok).toBe(false);

    // Different key in the same bucket still has its full allowance.
    expect(consumeRateLimit(bucketId, "key-2", max, WINDOW_MS).ok).toBe(true);
    expect(consumeRateLimit(bucketId, "key-2", max, WINDOW_MS).ok).toBe(false);
  });

  it("resets the key to ok:true count=1 once the window has elapsed", () => {
    const bucketId = "rl-test-window";
    const key = "user-w";
    const max = 2;

    expect(consumeRateLimit(bucketId, key, max, WINDOW_MS).ok).toBe(true);
    expect(consumeRateLimit(bucketId, key, max, WINDOW_MS).ok).toBe(true);
    expect(consumeRateLimit(bucketId, key, max, WINDOW_MS).ok).toBe(false); // exhausted

    // Advance system time past resetAt (now + windowMs).
    vi.setSystemTime(new Date(T0.getTime() + WINDOW_MS + 1));

    // First call in the fresh window is allowed (count resets to 1)...
    expect(consumeRateLimit(bucketId, key, max, WINDOW_MS).ok).toBe(true);
    // ...and the SECOND is still allowed (proving the counter restarted at 1, not carried over).
    expect(consumeRateLimit(bucketId, key, max, WINDOW_MS).ok).toBe(true);
    // Third exhausts the fresh window again.
    expect(consumeRateLimit(bucketId, key, max, WINDOW_MS).ok).toBe(false);
  });

  it("computes retryAfterSec = ceil((resetAt - now)/1000) and never negative", () => {
    const bucketId = "rl-test-retry";
    const key = "user-r";
    const max = 1;

    // Open the window at T0 → resetAt = T0 + WINDOW_MS.
    expect(consumeRateLimit(bucketId, key, max, WINDOW_MS).ok).toBe(true);

    // Advance 10.4s into the window; remaining = 60000 - 10400 = 49600ms → ceil/1000 = 50.
    const elapsedMs = 10_400;
    vi.setSystemTime(new Date(T0.getTime() + elapsedMs));
    const blocked = consumeRateLimit(bucketId, key, max, WINDOW_MS);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBe(Math.ceil((WINDOW_MS - elapsedMs) / 1000));
    expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(0);
  });
});

describe("clientIp", () => {
  // SPEC CHANGE (security): this previously asserted the FIRST x-forwarded-for
  // entry. That entry is client-controlled — proxies APPEND, so a caller who sends
  // their own `X-Forwarded-For` keeps it at position 0 and can rotate it to mint
  // unlimited rate-limit buckets. The old expectation pinned that bypass. We now
  // trust platform-set headers first, then read x-forwarded-for from the right.
  it("prefers the platform-set x-real-ip over a client-forwardable chain", () => {
    const req = reqWithHeaders({
      "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178",
      "x-real-ip": "10.0.0.1",
    });
    expect(clientIp(req)).toBe("10.0.0.1");
  });

  it("reads x-forwarded-for from the right so a prepended entry cannot forge the key", () => {
    const req = reqWithHeaders({
      "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178",
    });
    expect(clientIp(req)).toBe("150.172.238.178");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = reqWithHeaders({ "x-real-ip": "198.51.100.42" });
    expect(clientIp(req)).toBe("198.51.100.42");
  });

  it("falls back to 'anon' when neither header is present", () => {
    const req = reqWithHeaders({});
    expect(clientIp(req)).toBe("anon");
  });
});
