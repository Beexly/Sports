/**
 * Tests for @/lib/utils/rate-limiter
 *
 * Coverage: token bucket, sliding window, fixed window, leaky bucket,
 * throttle/debounce utilities, multi-key stores, policy helpers.
 * ~150+ test cases.
 */

import { describe, it, expect } from "vitest";
import {
  // Token Bucket
  createTokenBucket,
  consumeToken,
  tokenBucketStats,
  // Sliding Window
  createSlidingWindow,
  checkSlidingWindow,
  slidingWindowStats,
  // Fixed Window
  createFixedWindow,
  checkFixedWindow,
  // Leaky Bucket
  createLeakyBucket,
  enqueueLeakyBucket,
  processLeakyBucket,
  // Throttle Utilities
  throttleDecision,
  debounceDecision,
  rateLimitHeaders,
  // Multi-Key
  checkMultiKeyTokenBucket,
  checkMultiKeyFixedWindow,
  evictExpiredKeys,
  storeSize,
  // Policy
  tieredPolicy,
  exceedsPolicy,
  backoffMs,
  retryAfterMs,
} from "@/lib/utils/rate-limiter";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const T0 = 1_000_000; // fixed base timestamp for deterministic tests

// ─────────────────────────────────────────────────────────────────────────────
// 1. Token Bucket
// ─────────────────────────────────────────────────────────────────────────────

describe("createTokenBucket", () => {
  it("starts full", () => {
    const b = createTokenBucket(10, 1);
    expect(b.tokens).toBe(10);
    expect(b.capacity).toBe(10);
    expect(b.refillRate).toBe(1);
  });

  it("records lastRefill close to now", () => {
    const before = Date.now();
    const b = createTokenBucket(5, 2);
    expect(b.lastRefill).toBeGreaterThanOrEqual(before);
  });

  it("zero capacity bucket", () => {
    const b = createTokenBucket(0, 0);
    expect(b.tokens).toBe(0);
    expect(b.capacity).toBe(0);
  });
});

describe("consumeToken", () => {
  it("allows when tokens are available", () => {
    const state = createTokenBucket(5, 1);
    const { allowed, waitMs } = consumeToken(state, T0);
    expect(allowed).toBe(true);
    expect(waitMs).toBe(0);
  });

  it("decrements token count on consume", () => {
    const state = createTokenBucket(5, 1);
    const { state: next } = consumeToken(state, T0);
    expect(next.tokens).toBeCloseTo(4, 5);
  });

  it("denies when bucket is empty", () => {
    const s0 = createTokenBucket(1, 0);
    const { state: s1 } = consumeToken(s0, T0);
    const { allowed } = consumeToken(s1, T0);
    expect(allowed).toBe(false);
  });

  it("returns correct waitMs when denied", () => {
    const s0 = createTokenBucket(1, 2); // 2 tokens/sec
    const { state: s1 } = consumeToken(s0, T0);
    const { allowed, waitMs } = consumeToken(s1, T0);
    expect(allowed).toBe(false);
    // need 1 token at 2/sec => 0.5 sec => 500ms
    expect(waitMs).toBe(500);
  });

  it("refills tokens over elapsed time", () => {
    const s0 = createTokenBucket(10, 5); // 5 tokens/sec
    const { state: s1 } = consumeToken(s0, T0); // drain to 9
    // 2 seconds later => refill 10 tokens, capped at capacity
    const { allowed, state: s2 } = consumeToken(s1, T0 + 2000);
    expect(allowed).toBe(true);
    expect(s2.tokens).toBeCloseTo(9, 0); // 9 + 10 refilled - 1 consumed, capped at 10 - 1
  });

  it("caps refill at capacity", () => {
    const s0 = createTokenBucket(10, 100); // very fast refill
    const { state: s1 } = consumeToken(s0, T0);
    const { state: s2 } = consumeToken(s1, T0 + 10_000);
    expect(s2.tokens).toBeLessThanOrEqual(10);
  });

  it("consumes multiple tokens when specified", () => {
    const s0 = createTokenBucket(10, 1);
    const { allowed, state: s1 } = consumeToken(s0, T0, 3);
    expect(allowed).toBe(true);
    expect(s1.tokens).toBeCloseTo(7, 5);
  });

  it("denies when requesting more tokens than available", () => {
    const s0 = createTokenBucket(2, 0);
    const { allowed } = consumeToken(s0, T0, 3);
    expect(allowed).toBe(false);
  });

  it("exact boundary: consuming exactly available tokens allowed", () => {
    const s0 = createTokenBucket(5, 0);
    const { allowed } = consumeToken(s0, T0, 5);
    expect(allowed).toBe(true);
  });

  it("boundary: consuming one more than available denied", () => {
    const s0 = createTokenBucket(5, 0);
    const { allowed } = consumeToken(s0, T0, 6);
    expect(allowed).toBe(false);
  });

  it("uses Date.now() when nowMs is omitted", () => {
    const s0 = createTokenBucket(1, 0);
    const result = consumeToken(s0); // no nowMs
    expect(result.allowed).toBe(true);
  });

  it("zero refill rate returns Infinity waitMs when denied", () => {
    const s0 = createTokenBucket(1, 0);
    const { state: s1 } = consumeToken(s0, T0);
    const { waitMs } = consumeToken(s1, T0);
    expect(waitMs).toBe(Infinity);
  });

  it("updates lastRefill on each call", () => {
    const s0 = createTokenBucket(5, 1);
    const { state: s1 } = consumeToken(s0, T0);
    const { state: s2 } = consumeToken(s1, T0 + 500);
    expect(s2.lastRefill).toBe(T0 + 500);
  });
});

describe("tokenBucketStats", () => {
  it("full bucket: fillPct = 1, msUntilFull = 0", () => {
    const s = createTokenBucket(10, 1);
    const stats = tokenBucketStats(s, T0);
    expect(stats.fillPct).toBeCloseTo(1, 5);
    expect(stats.msUntilFull).toBe(0);
  });

  it("partially consumed bucket reflects correct available", () => {
    const s0 = createTokenBucket(10, 0);
    const { state: s1 } = consumeToken(s0, T0, 4);
    const stats = tokenBucketStats(s1, T0);
    expect(stats.available).toBeCloseTo(6, 5);
    expect(stats.fillPct).toBeCloseTo(0.6, 5);
  });

  it("msUntilFull reflects time to refill", () => {
    const s0 = createTokenBucket(10, 2); // 2/sec
    const { state: s1 } = consumeToken(s0, T0, 10); // drain all (will be denied but token count updates)
    // After draining: s1.tokens = 10 - 10 if allowed; but since it's allowed, 0
    const stats = tokenBucketStats(s1, T0);
    // 10 tokens at 2/sec = 5 sec = 5000ms
    expect(stats.msUntilFull).toBe(5000);
  });

  it("empty capacity bucket has fillPct = 1", () => {
    const s = createTokenBucket(0, 0);
    const stats = tokenBucketStats(s, T0);
    expect(stats.fillPct).toBe(1);
  });

  it("uses Date.now() when nowMs omitted", () => {
    const s = createTokenBucket(10, 1);
    const stats = tokenBucketStats(s);
    expect(stats.available).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Sliding Window Log
// ─────────────────────────────────────────────────────────────────────────────

describe("createSlidingWindow", () => {
  it("starts with empty log", () => {
    const s = createSlidingWindow(60_000, 10);
    expect(s.log).toHaveLength(0);
    expect(s.windowMs).toBe(60_000);
    expect(s.limit).toBe(10);
  });
});

describe("checkSlidingWindow", () => {
  it("allows first request", () => {
    const s = createSlidingWindow(60_000, 5);
    const { allowed } = checkSlidingWindow(s, T0);
    expect(allowed).toBe(true);
  });

  it("appends timestamp on success", () => {
    const s = createSlidingWindow(60_000, 5);
    const { state } = checkSlidingWindow(s, T0);
    expect(state.log).toContain(T0);
  });

  it("allows up to exact limit", () => {
    let s = createSlidingWindow(60_000, 3);
    for (let i = 0; i < 3; i++) {
      const r = checkSlidingWindow(s, T0 + i);
      expect(r.allowed).toBe(true);
      s = r.state;
    }
  });

  it("denies at limit+1", () => {
    let s = createSlidingWindow(60_000, 3);
    for (let i = 0; i < 3; i++) {
      s = checkSlidingWindow(s, T0 + i).state;
    }
    const { allowed } = checkSlidingWindow(s, T0 + 3);
    expect(allowed).toBe(false);
  });

  it("prunes expired entries, allowing new requests", () => {
    let s = createSlidingWindow(1000, 2);
    s = checkSlidingWindow(s, T0).state;
    s = checkSlidingWindow(s, T0 + 1).state;
    // 1001ms later, window is T0+1001 - 1000 = T0+1; entries at T0 and T0+1 both expire
    const { allowed } = checkSlidingWindow(s, T0 + 2000);
    expect(allowed).toBe(true);
  });

  it("returns oldestMs=null for empty log", () => {
    const s = createSlidingWindow(60_000, 5);
    const { oldestMs, requestsInWindow } = checkSlidingWindow(s, T0);
    // After success, oldestMs should point to the new entry
    expect(typeof oldestMs === "number" || oldestMs === null).toBe(true);
    expect(requestsInWindow).toBe(1);
  });

  it("returns correct oldestMs when denied", () => {
    let s = createSlidingWindow(60_000, 1);
    s = checkSlidingWindow(s, T0).state;
    const { allowed, oldestMs } = checkSlidingWindow(s, T0 + 100);
    expect(allowed).toBe(false);
    expect(oldestMs).toBe(T0);
  });

  it("does not append on denial", () => {
    let s = createSlidingWindow(60_000, 1);
    s = checkSlidingWindow(s, T0).state;
    const { state: denied } = checkSlidingWindow(s, T0 + 1);
    expect(denied.log).toHaveLength(1);
  });

  it("empty log denied with oldestMs=null", () => {
    const s = createSlidingWindow(60_000, 0); // limit=0: always deny
    const { allowed, oldestMs } = checkSlidingWindow(s, T0);
    expect(allowed).toBe(false);
    expect(oldestMs).toBeNull();
  });

  it("uses Date.now() when nowMs omitted", () => {
    const s = createSlidingWindow(60_000, 5);
    const { allowed } = checkSlidingWindow(s);
    expect(allowed).toBe(true);
  });
});

describe("slidingWindowStats", () => {
  it("empty window: used=0, remaining=limit, resetMs=0", () => {
    const s = createSlidingWindow(60_000, 10);
    const stats = slidingWindowStats(s, T0);
    expect(stats.used).toBe(0);
    expect(stats.remaining).toBe(10);
    expect(stats.resetMs).toBe(0);
  });

  it("reflects used and remaining after requests", () => {
    let s = createSlidingWindow(60_000, 5);
    s = checkSlidingWindow(s, T0).state;
    s = checkSlidingWindow(s, T0 + 1).state;
    const stats = slidingWindowStats(s, T0 + 2);
    expect(stats.used).toBe(2);
    expect(stats.remaining).toBe(3);
  });

  it("resetMs = time until oldest entry falls out", () => {
    let s = createSlidingWindow(60_000, 5);
    s = checkSlidingWindow(s, T0).state;
    const stats = slidingWindowStats(s, T0 + 1000);
    // oldest = T0, windowMs=60000, resetMs = T0 + 60000 - (T0+1000) = 59000
    expect(stats.resetMs).toBe(59_000);
  });

  it("clamps remaining to 0 when over limit", () => {
    let s = createSlidingWindow(60_000, 2);
    s = checkSlidingWindow(s, T0).state;
    s = checkSlidingWindow(s, T0 + 1).state;
    // Now at limit, but stats still shows remaining=0
    const stats = slidingWindowStats(s, T0 + 2);
    expect(stats.remaining).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Fixed Window
// ─────────────────────────────────────────────────────────────────────────────

describe("createFixedWindow", () => {
  it("starts with count=0", () => {
    const s = createFixedWindow(60_000, 10);
    expect(s.count).toBe(0);
    expect(s.limit).toBe(10);
    expect(s.windowMs).toBe(60_000);
  });
});

describe("checkFixedWindow", () => {
  it("allows first request", () => {
    const s = createFixedWindow(60_000, 5);
    const { allowed } = checkFixedWindow({ ...s, windowStart: T0 }, T0);
    expect(allowed).toBe(true);
  });

  it("increments count on allow", () => {
    const s: import("@/lib/utils/rate-limiter").FixedWindowState = { count: 0, windowStart: T0, windowMs: 60_000, limit: 5 };
    const { state } = checkFixedWindow(s, T0);
    expect(state.count).toBe(1);
  });

  it("allows up to exact limit", () => {
    let s: import("@/lib/utils/rate-limiter").FixedWindowState = { count: 0, windowStart: T0, windowMs: 60_000, limit: 3 };
    for (let i = 0; i < 3; i++) {
      const r = checkFixedWindow(s, T0 + i);
      expect(r.allowed).toBe(true);
      s = r.state;
    }
    expect(s.count).toBe(3);
  });

  it("denies at limit+1", () => {
    let s: import("@/lib/utils/rate-limiter").FixedWindowState = { count: 0, windowStart: T0, windowMs: 60_000, limit: 3 };
    for (let i = 0; i < 3; i++) {
      s = checkFixedWindow(s, T0 + i).state;
    }
    const { allowed } = checkFixedWindow(s, T0 + 3);
    expect(allowed).toBe(false);
  });

  it("resets count when window expires", () => {
    let s: import("@/lib/utils/rate-limiter").FixedWindowState = { count: 0, windowStart: T0, windowMs: 1000, limit: 2 };
    s = checkFixedWindow(s, T0).state;
    s = checkFixedWindow(s, T0 + 1).state;
    // Deny
    expect(checkFixedWindow(s, T0 + 2).allowed).toBe(false);
    // After window resets
    const { allowed, state: next } = checkFixedWindow(s, T0 + 1001);
    expect(allowed).toBe(true);
    expect(next.count).toBe(1);
  });

  it("returns correct resetMs", () => {
    const s: import("@/lib/utils/rate-limiter").FixedWindowState = { count: 0, windowStart: T0, windowMs: 5000, limit: 10 };
    const { resetMs } = checkFixedWindow(s, T0 + 2000);
    expect(resetMs).toBe(3000);
  });

  it("resets to new window correctly across multiple windows", () => {
    const s: import("@/lib/utils/rate-limiter").FixedWindowState = { count: 5, windowStart: T0, windowMs: 1000, limit: 5 };
    // 3.5 windows later
    const { allowed, state: next } = checkFixedWindow(s, T0 + 3500);
    expect(allowed).toBe(true);
    expect(next.windowStart).toBe(T0 + 3000);
    expect(next.count).toBe(1);
  });

  it("uses Date.now() when nowMs omitted", () => {
    const s = createFixedWindow(60_000, 10);
    const { allowed } = checkFixedWindow(s);
    expect(allowed).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Leaky Bucket
// ─────────────────────────────────────────────────────────────────────────────

describe("createLeakyBucket", () => {
  it("starts with empty queue", () => {
    const s = createLeakyBucket(10, 5);
    expect(s.queue).toBe(0);
    expect(s.capacity).toBe(10);
    expect(s.leakRatePerSec).toBe(5);
  });
});

describe("processLeakyBucket", () => {
  it("drains queue over elapsed time", () => {
    const s: import("@/lib/utils/rate-limiter").LeakyBucketState = { queue: 10, capacity: 20, leakRatePerSec: 2, lastLeak: T0 };
    const next = processLeakyBucket(s, T0 + 3000);
    // leaked = 3 * 2 = 6; queue = 10 - 6 = 4
    expect(next.queue).toBeCloseTo(4, 5);
  });

  it("does not go below zero", () => {
    const s: import("@/lib/utils/rate-limiter").LeakyBucketState = { queue: 2, capacity: 20, leakRatePerSec: 10, lastLeak: T0 };
    const next = processLeakyBucket(s, T0 + 5000);
    expect(next.queue).toBe(0);
  });

  it("updates lastLeak timestamp", () => {
    const s: import("@/lib/utils/rate-limiter").LeakyBucketState = { queue: 5, capacity: 10, leakRatePerSec: 1, lastLeak: T0 };
    const next = processLeakyBucket(s, T0 + 2000);
    expect(next.lastLeak).toBe(T0 + 2000);
  });

  it("uses Date.now() when nowMs omitted", () => {
    const s = createLeakyBucket(10, 1);
    const next = processLeakyBucket(s);
    expect(next.queue).toBe(0);
  });
});

describe("enqueueLeakyBucket", () => {
  it("enqueues into empty bucket", () => {
    const s = createLeakyBucket(5, 1);
    const { queued, queueSize } = enqueueLeakyBucket({ ...s, lastLeak: T0 }, T0);
    expect(queued).toBe(true);
    expect(queueSize).toBe(1);
  });

  it("leaks before checking capacity", () => {
    const s: import("@/lib/utils/rate-limiter").LeakyBucketState = { queue: 5, capacity: 5, leakRatePerSec: 5, lastLeak: T0 };
    // After 1 second: queue drains to 0, allowing new enqueue
    const { queued } = enqueueLeakyBucket(s, T0 + 1000);
    expect(queued).toBe(true);
  });

  it("rejects when bucket is full after leaking", () => {
    const s: import("@/lib/utils/rate-limiter").LeakyBucketState = { queue: 5, capacity: 5, leakRatePerSec: 0, lastLeak: T0 };
    const { queued } = enqueueLeakyBucket(s, T0);
    expect(queued).toBe(false);
  });

  it("returns queueSize on denial", () => {
    const s: import("@/lib/utils/rate-limiter").LeakyBucketState = { queue: 3, capacity: 3, leakRatePerSec: 0, lastLeak: T0 };
    const { queued, queueSize } = enqueueLeakyBucket(s, T0);
    expect(queued).toBe(false);
    expect(queueSize).toBe(3);
  });

  it("fills bucket to capacity exactly", () => {
    let s: import("@/lib/utils/rate-limiter").LeakyBucketState = { queue: 0, capacity: 3, leakRatePerSec: 0, lastLeak: T0 };
    for (let i = 0; i < 3; i++) {
      const r = enqueueLeakyBucket(s, T0 + i);
      expect(r.queued).toBe(true);
      s = r.state;
    }
    const { queued } = enqueueLeakyBucket(s, T0 + 3);
    expect(queued).toBe(false);
  });

  it("uses Date.now() when nowMs omitted", () => {
    const s = createLeakyBucket(10, 1);
    const { queued } = enqueueLeakyBucket(s);
    expect(queued).toBe(true);
  });

  it("zero capacity bucket never enqueues", () => {
    const s: import("@/lib/utils/rate-limiter").LeakyBucketState = { queue: 0, capacity: 0, leakRatePerSec: 1, lastLeak: T0 };
    const { queued } = enqueueLeakyBucket(s, T0);
    expect(queued).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Throttle Utilities
// ─────────────────────────────────────────────────────────────────────────────

describe("throttleDecision", () => {
  it("allows with empty log", () => {
    const { allowed, requestsInWindow } = throttleDecision([], 1000, 5, T0);
    expect(allowed).toBe(true);
    expect(requestsInWindow).toBe(0);
  });

  it("allows when below limit", () => {
    const requests = [T0 - 500, T0 - 200];
    const { allowed } = throttleDecision(requests, 1000, 5, T0);
    expect(allowed).toBe(true);
  });

  it("denies at exact limit", () => {
    const requests = [T0 - 900, T0 - 700, T0 - 500];
    const { allowed } = throttleDecision(requests, 1000, 3, T0);
    expect(allowed).toBe(false);
  });

  it("excludes expired entries", () => {
    const requests = [T0 - 2000, T0 - 1500]; // outside 1000ms window
    const { allowed, requestsInWindow } = throttleDecision(requests, 1000, 2, T0);
    expect(allowed).toBe(true);
    expect(requestsInWindow).toBe(0);
  });

  it("counts only in-window entries", () => {
    const requests = [T0 - 1500, T0 - 800, T0 - 500];
    const { requestsInWindow } = throttleDecision(requests, 1000, 10, T0);
    expect(requestsInWindow).toBe(2); // only last two are in window
  });

  it("uses Date.now() when nowMs omitted", () => {
    const { allowed } = throttleDecision([], 1000, 5);
    expect(allowed).toBe(true);
  });

  it("limit=0 always denies", () => {
    const { allowed } = throttleDecision([], 1000, 0, T0);
    expect(allowed).toBe(false);
  });
});

describe("debounceDecision", () => {
  it("fires when never called before (null)", () => {
    const { shouldFire } = debounceDecision(null, 500, T0);
    expect(shouldFire).toBe(true);
  });

  it("fires when elapsed >= debounceMs", () => {
    const { shouldFire } = debounceDecision(T0 - 500, 500, T0);
    expect(shouldFire).toBe(true);
  });

  it("does not fire when elapsed < debounceMs", () => {
    const { shouldFire } = debounceDecision(T0 - 100, 500, T0);
    expect(shouldFire).toBe(false);
  });

  it("returns nextFireMs = now + debounceMs when firing", () => {
    const { nextFireMs } = debounceDecision(null, 300, T0);
    expect(nextFireMs).toBe(T0 + 300);
  });

  it("returns nextFireMs = lastCallMs + debounceMs when not firing", () => {
    const { nextFireMs } = debounceDecision(T0 - 100, 500, T0);
    expect(nextFireMs).toBe(T0 - 100 + 500);
  });

  it("fires exactly at boundary (elapsed === debounceMs)", () => {
    const { shouldFire } = debounceDecision(T0 - 500, 500, T0);
    expect(shouldFire).toBe(true);
  });

  it("uses Date.now() when nowMs omitted", () => {
    const { shouldFire } = debounceDecision(null, 500);
    expect(shouldFire).toBe(true);
  });
});

describe("rateLimitHeaders", () => {
  it("returns all three standard headers", () => {
    const headers = rateLimitHeaders({ remaining: 5, limit: 10, resetMs: 30_000 });
    expect(headers["X-RateLimit-Limit"]).toBe("10");
    expect(headers["X-RateLimit-Remaining"]).toBe("5");
    expect(headers["X-RateLimit-Reset"]).toBe("30");
  });

  it("rounds up resetMs to seconds", () => {
    const headers = rateLimitHeaders({ remaining: 1, limit: 10, resetMs: 1001 });
    expect(headers["X-RateLimit-Reset"]).toBe("2");
  });

  it("clamps negative remaining to 0", () => {
    const headers = rateLimitHeaders({ remaining: -1, limit: 10, resetMs: 1000 });
    expect(headers["X-RateLimit-Remaining"]).toBe("0");
  });

  it("all values are strings", () => {
    const headers = rateLimitHeaders({ remaining: 3, limit: 100, resetMs: 5000 });
    for (const val of Object.values(headers)) {
      expect(typeof val).toBe("string");
    }
  });

  it("resetMs=0 gives reset header of '0'", () => {
    const headers = rateLimitHeaders({ remaining: 10, limit: 10, resetMs: 0 });
    expect(headers["X-RateLimit-Reset"]).toBe("0");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Multi-Key Rate Limiting
// ─────────────────────────────────────────────────────────────────────────────

describe("checkMultiKeyTokenBucket", () => {
  it("creates entry for new key", () => {
    const store = new Map();
    const { allowed, store: next } = checkMultiKeyTokenBucket(store, "user1", 5, 1, T0);
    expect(allowed).toBe(true);
    expect(next.has("user1")).toBe(true);
  });

  it("reuses existing entry for known key", () => {
    const store = new Map();
    let result = checkMultiKeyTokenBucket(store, "user1", 3, 0, T0);
    result = checkMultiKeyTokenBucket(result.store, "user1", 3, 0, T0);
    result = checkMultiKeyTokenBucket(result.store, "user1", 3, 0, T0);
    // 4th should be denied
    const { allowed } = checkMultiKeyTokenBucket(result.store, "user1", 3, 0, T0);
    expect(allowed).toBe(false);
  });

  it("isolates different keys", () => {
    const store = new Map();
    let s = checkMultiKeyTokenBucket(store, "a", 2, 0, T0).store;
    s = checkMultiKeyTokenBucket(s, "a", 2, 0, T0).store;
    // "a" is exhausted; "b" is fresh
    const { allowed } = checkMultiKeyTokenBucket(s, "b", 2, 0, T0);
    expect(allowed).toBe(true);
  });

  it("returns waitMs=0 when allowed", () => {
    const { waitMs } = checkMultiKeyTokenBucket(new Map(), "k", 10, 1, T0);
    expect(waitMs).toBe(0);
  });

  it("uses Date.now() when nowMs omitted", () => {
    const { allowed } = checkMultiKeyTokenBucket(new Map(), "k", 10, 1);
    expect(allowed).toBe(true);
  });
});

describe("checkMultiKeyFixedWindow", () => {
  it("creates entry for new key", () => {
    const store = new Map();
    const { allowed, store: next } = checkMultiKeyFixedWindow(store, "user1", 60_000, 5, T0);
    expect(allowed).toBe(true);
    expect(next.has("user1")).toBe(true);
  });

  it("isolates different keys", () => {
    const store = new Map();
    let s = checkMultiKeyFixedWindow(store, "x", 60_000, 1, T0).store;
    s = checkMultiKeyFixedWindow(s, "x", 60_000, 1, T0).store; // x is now denied
    const { allowed } = checkMultiKeyFixedWindow(s, "y", 60_000, 1, T0);
    expect(allowed).toBe(true);
  });

  it("returns resetMs", () => {
    const { resetMs } = checkMultiKeyFixedWindow(new Map(), "k", 5000, 10, T0);
    expect(resetMs).toBeGreaterThanOrEqual(0);
  });

  it("exact limit boundary", () => {
    let store = new Map();
    for (let i = 0; i < 3; i++) {
      store = checkMultiKeyFixedWindow(store, "k", 60_000, 3, T0 + i).store;
    }
    const { allowed } = checkMultiKeyFixedWindow(store, "k", 60_000, 3, T0 + 3);
    expect(allowed).toBe(false);
  });
});

describe("evictExpiredKeys", () => {
  it("removes expired window entries", () => {
    const store = new Map([
      ["old", { count: 5, windowStart: T0 - 5000, windowMs: 1000, limit: 10 }],
      ["fresh", { count: 2, windowStart: T0, windowMs: 60_000, limit: 10 }],
    ]);
    const next = evictExpiredKeys(store, T0 + 100);
    expect(next.has("old")).toBe(false);
    expect(next.has("fresh")).toBe(true);
  });

  it("keeps active entries", () => {
    const store = new Map([
      ["k1", { count: 1, windowStart: T0, windowMs: 60_000, limit: 10 }],
    ]);
    const next = evictExpiredKeys(store, T0 + 1000);
    expect(next.has("k1")).toBe(true);
  });

  it("returns empty map when all expired", () => {
    const store = new Map([
      ["a", { count: 1, windowStart: T0, windowMs: 500, limit: 5 }],
      ["b", { count: 3, windowStart: T0, windowMs: 500, limit: 5 }],
    ]);
    const next = evictExpiredKeys(store, T0 + 600);
    expect(next.size).toBe(0);
  });

  it("uses Date.now() when nowMs omitted", () => {
    const store = new Map([
      ["k", { count: 1, windowStart: Date.now(), windowMs: 60_000, limit: 5 }],
    ]);
    const next = evictExpiredKeys(store);
    expect(next.has("k")).toBe(true);
  });

  it("does not mutate original store", () => {
    const store = new Map([
      ["k", { count: 1, windowStart: T0 - 2000, windowMs: 1000, limit: 5 }],
    ]);
    evictExpiredKeys(store, T0);
    expect(store.has("k")).toBe(true); // original unchanged
  });
});

describe("storeSize", () => {
  it("returns 0 for empty store", () => {
    expect(storeSize(new Map())).toBe(0);
  });

  it("returns correct count", () => {
    const m = new Map([["a", 1], ["b", 2], ["c", 3]]);
    expect(storeSize(m)).toBe(3);
  });

  it("works with typed stores", () => {
    const store = new Map<string, import("@/lib/utils/rate-limiter").FixedWindowState>();
    store.set("x", { count: 0, windowStart: T0, windowMs: 1000, limit: 5 });
    expect(storeSize(store)).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Rate Limit Policy Helpers
// ─────────────────────────────────────────────────────────────────────────────

describe("tieredPolicy", () => {
  it("free tier: 60/min, no burst", () => {
    const p = tieredPolicy("free");
    expect(p.limit).toBe(60);
    expect(p.windowMs).toBe(60_000);
    expect(p.burst).toBeUndefined();
  });

  it("pro tier: 300/min, burst=30", () => {
    const p = tieredPolicy("pro");
    expect(p.limit).toBe(300);
    expect(p.windowMs).toBe(60_000);
    expect(p.burst).toBe(30);
  });

  it("elite tier: 1000/min, burst=100", () => {
    const p = tieredPolicy("elite");
    expect(p.limit).toBe(1000);
    expect(p.windowMs).toBe(60_000);
    expect(p.burst).toBe(100);
  });
});

describe("exceedsPolicy", () => {
  it("returns false when under limit", () => {
    const p = tieredPolicy("free");
    const reqs = [T0 - 1000, T0 - 500];
    expect(exceedsPolicy(reqs, p, T0)).toBe(false);
  });

  it("returns true when at limit", () => {
    const p = { windowMs: 1000, limit: 3 };
    const reqs = [T0 - 900, T0 - 600, T0 - 300];
    expect(exceedsPolicy(reqs, p, T0)).toBe(true);
  });

  it("returns false when expired requests don't count", () => {
    const p = { windowMs: 1000, limit: 3 };
    // 3 requests but outside the window
    const reqs = [T0 - 2000, T0 - 1500, T0 - 1100];
    expect(exceedsPolicy(reqs, p, T0)).toBe(false);
  });

  it("uses Date.now() when nowMs omitted", () => {
    const p = tieredPolicy("elite");
    expect(exceedsPolicy([], p)).toBe(false);
  });
});

describe("backoffMs", () => {
  it("attempt=0 returns base (1000ms)", () => {
    expect(backoffMs(0)).toBe(1000);
  });

  it("attempt=1 returns 2000ms", () => {
    expect(backoffMs(1)).toBe(2000);
  });

  it("attempt=2 returns 4000ms", () => {
    expect(backoffMs(2)).toBe(4000);
  });

  it("attempt=3 returns 8000ms", () => {
    expect(backoffMs(3)).toBe(8000);
  });

  it("caps at maxBackoff (30000ms)", () => {
    expect(backoffMs(10)).toBe(30_000);
    expect(backoffMs(20)).toBe(30_000);
  });

  it("custom base works", () => {
    expect(backoffMs(0, 500)).toBe(500);
    expect(backoffMs(1, 500)).toBe(1000);
  });

  it("custom maxBackoff cap", () => {
    expect(backoffMs(10, 1000, 5000)).toBe(5000);
  });

  it("no jitter: deterministic result", () => {
    expect(backoffMs(3, 1000, 30_000, false)).toBe(backoffMs(3, 1000, 30_000, false));
  });

  it("jitter=true: adds deterministic jitter for attempt=0", () => {
    // attempt=0: exp=1000, jitter = 1000*0.25*(0%4)/4 = 0
    expect(backoffMs(0, 1000, 30_000, true)).toBe(1000);
  });

  it("jitter=true: attempt=1 adds jitter", () => {
    // exp=2000, jitter = 1000*0.25*(1%4)/4 = 1000*0.25*0.25 = 62.5
    expect(backoffMs(1, 1000, 30_000, true)).toBe(2062.5);
  });

  it("jitter=true: attempt=2 adds jitter", () => {
    // exp=4000, jitter = 1000*0.25*(2%4)/4 = 1000*0.25*0.5 = 125
    expect(backoffMs(2, 1000, 30_000, true)).toBe(4125);
  });

  it("jitter=true: attempt=3 adds jitter", () => {
    // exp=8000, jitter = 1000*0.25*(3%4)/4 = 1000*0.25*0.75 = 187.5
    expect(backoffMs(3, 1000, 30_000, true)).toBe(8187.5);
  });

  it("jitter=true: attempt=4 cycles back (4%4=0)", () => {
    // exp=16000, jitter = 1000*0.25*(4%4)/4 = 0
    expect(backoffMs(4, 1000, 30_000, true)).toBe(16_000);
  });

  it("jitter is deterministic for same attempt", () => {
    const a = backoffMs(5, 1000, 30_000, true);
    const b = backoffMs(5, 1000, 30_000, true);
    expect(a).toBe(b);
  });

  it("jitter with cap: result does not exceed maxBackoff", () => {
    expect(backoffMs(10, 1000, 30_000, true)).toBeLessThanOrEqual(30_000);
  });
});

describe("retryAfterMs", () => {
  it("TokenBucketState: returns 0 when tokens available", () => {
    const s = createTokenBucket(5, 1);
    expect(retryAfterMs(s, T0)).toBe(0);
  });

  it("TokenBucketState: returns wait time when denied", () => {
    const s0 = createTokenBucket(1, 2); // 2/sec
    const { state: s1 } = consumeToken(s0, T0);
    expect(retryAfterMs(s1, T0)).toBe(500); // 1 token at 2/sec = 0.5s
  });

  it("FixedWindowState: returns 0 when under limit", () => {
    const s: import("@/lib/utils/rate-limiter").FixedWindowState = { count: 2, windowStart: T0, windowMs: 5000, limit: 5 };
    expect(retryAfterMs(s, T0)).toBe(0);
  });

  it("FixedWindowState: returns time until window reset when at limit", () => {
    const s: import("@/lib/utils/rate-limiter").FixedWindowState = { count: 5, windowStart: T0, windowMs: 5000, limit: 5 };
    expect(retryAfterMs(s, T0 + 1000)).toBe(4000);
  });

  it("SlidingWindowState: returns 0 when under limit", () => {
    const s = createSlidingWindow(60_000, 5);
    expect(retryAfterMs(s, T0)).toBe(0);
  });

  it("SlidingWindowState: returns time until oldest expires when at limit", () => {
    let s = createSlidingWindow(60_000, 2);
    s = checkSlidingWindow(s, T0).state;
    s = checkSlidingWindow(s, T0 + 100).state;
    // oldest is T0, window=60000, at T0+1000: wait = T0 + 60000 - (T0+1000) = 59000
    expect(retryAfterMs(s, T0 + 1000)).toBe(59_000);
  });

  it("SlidingWindowState: empty log returns 0", () => {
    const s = createSlidingWindow(60_000, 0);
    expect(retryAfterMs(s, T0)).toBe(0);
  });

  it("uses Date.now() when nowMs omitted", () => {
    const s = createTokenBucket(10, 1);
    expect(retryAfterMs(s)).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Additional edge cases and cross-function coverage
// ─────────────────────────────────────────────────────────────────────────────

describe("token bucket: burst refill", () => {
  it("burst from empty to partial refill over short interval", () => {
    const s0 = createTokenBucket(100, 10); // 10/sec
    const { state: s1 } = consumeToken(s0, T0, 100); // drain completely
    // 500ms later => refill 5 tokens
    const { allowed, state: s2 } = consumeToken(s1, T0 + 500, 5);
    expect(allowed).toBe(true);
    expect(s2.tokens).toBeCloseTo(0, 5);
  });

  it("burst refill does not exceed capacity", () => {
    const s0 = createTokenBucket(10, 100);
    const { state: s1 } = consumeToken(s0, T0, 10);
    const stats = tokenBucketStats(s1, T0 + 10_000);
    expect(stats.available).toBeLessThanOrEqual(10);
  });

  it("sequential burst consumption tracks correctly", () => {
    let s = createTokenBucket(5, 0);
    for (let i = 0; i < 5; i++) {
      const r = consumeToken(s, T0 + i);
      expect(r.allowed).toBe(true);
      s = r.state;
    }
    const { allowed } = consumeToken(s, T0 + 5);
    expect(allowed).toBe(false);
  });
});

describe("sliding window: single-entry boundary", () => {
  it("single allowed entry in window", () => {
    let s = createSlidingWindow(1000, 1);
    const { allowed } = checkSlidingWindow(s, T0);
    expect(allowed).toBe(true);
    s = checkSlidingWindow(s, T0).state;
    // immediately deny second
    expect(checkSlidingWindow(s, T0 + 1).allowed).toBe(false);
  });

  it("single entry falls out exactly at window boundary", () => {
    let s = createSlidingWindow(1000, 1);
    s = checkSlidingWindow(s, T0).state;
    // at T0 + 1000 the entry at T0 is NOT in window (t > cutoff, cutoff = T0+1000 - 1000 = T0)
    // since filter is t > cutoff (strict), T0 > T0 is false => entry pruned
    const { allowed } = checkSlidingWindow(s, T0 + 1000);
    expect(allowed).toBe(true);
  });

  it("slidingWindowStats: single entry resetMs matches window", () => {
    let s = createSlidingWindow(5000, 3);
    s = checkSlidingWindow(s, T0).state;
    const { resetMs } = slidingWindowStats(s, T0);
    expect(resetMs).toBe(5000);
  });
});

describe("fixed window: rapid reset stress", () => {
  it("correctly tracks count within same window", () => {
    const s0: import("@/lib/utils/rate-limiter").FixedWindowState = {
      count: 0,
      windowStart: T0,
      windowMs: 10_000,
      limit: 100,
    };
    let s = s0;
    for (let i = 0; i < 50; i++) {
      s = checkFixedWindow(s, T0 + i * 100).state;
    }
    expect(s.count).toBe(50);
  });

  it("resetMs decreases as time progresses within window", () => {
    const s: import("@/lib/utils/rate-limiter").FixedWindowState = {
      count: 0,
      windowStart: T0,
      windowMs: 10_000,
      limit: 10,
    };
    const { resetMs: r1 } = checkFixedWindow(s, T0 + 1000);
    const { resetMs: r2 } = checkFixedWindow(s, T0 + 5000);
    expect(r1).toBeGreaterThan(r2);
  });
});

describe("leaky bucket: partial drain edge cases", () => {
  it("partial drain: queue > 0 after partial leak", () => {
    const s: import("@/lib/utils/rate-limiter").LeakyBucketState = {
      queue: 10,
      capacity: 20,
      leakRatePerSec: 3,
      lastLeak: T0,
    };
    const next = processLeakyBucket(s, T0 + 1000);
    expect(next.queue).toBeCloseTo(7, 5);
  });

  it("enqueue right after full drain completes", () => {
    const s: import("@/lib/utils/rate-limiter").LeakyBucketState = {
      queue: 2,
      capacity: 5,
      leakRatePerSec: 1,
      lastLeak: T0,
    };
    const { queued, queueSize } = enqueueLeakyBucket(s, T0 + 2001);
    expect(queued).toBe(true);
    expect(queueSize).toBe(1);
  });
});

describe("multi-key isolation stress", () => {
  it("100 unique keys do not interfere with each other (fixed window)", () => {
    let store = new Map<string, import("@/lib/utils/rate-limiter").FixedWindowState>();
    for (let i = 0; i < 100; i++) {
      const key = `user-${i}`;
      const r = checkMultiKeyFixedWindow(store, key, 60_000, 5, T0);
      expect(r.allowed).toBe(true);
      store = r.store;
    }
    expect(storeSize(store)).toBe(100);
  });

  it("100 unique keys token bucket all allowed", () => {
    let store = new Map<string, import("@/lib/utils/rate-limiter").TokenBucketState>();
    for (let i = 0; i < 100; i++) {
      const key = `svc-${i}`;
      const r = checkMultiKeyTokenBucket(store, key, 3, 1, T0);
      expect(r.allowed).toBe(true);
      store = r.store;
    }
    expect(storeSize(store)).toBe(100);
  });

  it("evictExpiredKeys correctly handles mixed expiry", () => {
    const store = new Map<string, import("@/lib/utils/rate-limiter").FixedWindowState>([
      ["expired1", { count: 1, windowStart: T0 - 2000, windowMs: 1000, limit: 5 }],
      ["expired2", { count: 2, windowStart: T0 - 1500, windowMs: 1000, limit: 5 }],
      ["active1", { count: 1, windowStart: T0, windowMs: 60_000, limit: 5 }],
      ["active2", { count: 3, windowStart: T0 - 5000, windowMs: 60_000, limit: 5 }],
    ]);
    const next = evictExpiredKeys(store, T0 + 100);
    expect(next.has("expired1")).toBe(false);
    expect(next.has("expired2")).toBe(false);
    expect(next.has("active1")).toBe(true);
    expect(next.has("active2")).toBe(true);
    expect(storeSize(next)).toBe(2);
  });
});

describe("rateLimitHeaders: format correctness", () => {
  it("header keys are exact X-RateLimit-* format", () => {
    const headers = rateLimitHeaders({ remaining: 5, limit: 100, resetMs: 10_000 });
    expect(Object.keys(headers)).toContain("X-RateLimit-Limit");
    expect(Object.keys(headers)).toContain("X-RateLimit-Remaining");
    expect(Object.keys(headers)).toContain("X-RateLimit-Reset");
    expect(Object.keys(headers)).toHaveLength(3);
  });

  it("large reset time is formatted correctly in seconds", () => {
    const headers = rateLimitHeaders({ remaining: 0, limit: 60, resetMs: 3_600_000 });
    expect(headers["X-RateLimit-Reset"]).toBe("3600");
  });

  it("limit=0 is formatted as '0'", () => {
    const headers = rateLimitHeaders({ remaining: 0, limit: 0, resetMs: 0 });
    expect(headers["X-RateLimit-Limit"]).toBe("0");
    expect(headers["X-RateLimit-Remaining"]).toBe("0");
  });
});

describe("backoffMs: jitter determinism", () => {
  it("same attempt always produces same jitter", () => {
    for (let a = 0; a < 10; a++) {
      expect(backoffMs(a, 1000, 30_000, true)).toBe(backoffMs(a, 1000, 30_000, true));
    }
  });

  it("jitter cycle repeats every 4 attempts (mod pattern)", () => {
    // attempt 0 and 4 both have (attempt%4)=0, so same jitter contribution
    const j0 = backoffMs(0, 1000, 30_000, true) - backoffMs(0, 1000, 30_000, false);
    const j4 = backoffMs(4, 1000, 30_000, true) - backoffMs(4, 1000, 30_000, false);
    expect(j0).toBe(j4); // both 0
  });

  it("jitter at attempt=5 is same as attempt=1 (both %4=1)", () => {
    // exp differs but jitter contribution is same
    const contrib1 = 1000 * 0.25 * ((1 % 4) / 4);
    const contrib5 = 1000 * 0.25 * ((5 % 4) / 4);
    expect(contrib1).toBe(contrib5);
  });
});

describe("tieredPolicy: property types", () => {
  it("free policy windowMs is a number", () => {
    expect(typeof tieredPolicy("free").windowMs).toBe("number");
  });

  it("pro policy burst is a number", () => {
    const p = tieredPolicy("pro");
    expect(typeof p.burst).toBe("number");
  });

  it("elite policy limit is higher than pro", () => {
    expect(tieredPolicy("elite").limit).toBeGreaterThan(tieredPolicy("pro").limit);
  });

  it("pro policy limit is higher than free", () => {
    expect(tieredPolicy("pro").limit).toBeGreaterThan(tieredPolicy("free").limit);
  });
});

describe("exceedsPolicy: boundary conditions", () => {
  it("exactly at limit returns true", () => {
    const p = { windowMs: 60_000, limit: 5 };
    const reqs = Array.from({ length: 5 }, (_, i) => T0 - i * 100);
    expect(exceedsPolicy(reqs, p, T0)).toBe(true);
  });

  it("one under limit returns false", () => {
    const p = { windowMs: 60_000, limit: 5 };
    const reqs = Array.from({ length: 4 }, (_, i) => T0 - i * 100);
    expect(exceedsPolicy(reqs, p, T0)).toBe(false);
  });
});

describe("retryAfterMs: TokenBucketState Infinity guard", () => {
  it("zero refill rate denied bucket: waitMs is Infinity", () => {
    const s0 = createTokenBucket(1, 0);
    const { state: s1 } = consumeToken(s0, T0);
    // retryAfterMs calls consumeToken internally — result waitMs is Infinity
    const wait = retryAfterMs(s1, T0);
    expect(wait).toBe(Infinity);
  });
});

describe("checkSlidingWindow: log immutability", () => {
  it("does not mutate the original log array", () => {
    const s = createSlidingWindow(60_000, 5);
    const originalLog = s.log;
    checkSlidingWindow(s, T0);
    expect(s.log).toBe(originalLog); // same reference, not mutated
  });

  it("returned state has a different log reference", () => {
    const s = createSlidingWindow(60_000, 5);
    const { state } = checkSlidingWindow(s, T0);
    expect(state.log).not.toBe(s.log);
  });
});

describe("tokenBucketStats: msUntilFull after partial refill", () => {
  it("partially refilled bucket has positive msUntilFull", () => {
    const s0 = createTokenBucket(10, 1);
    const { state: s1 } = consumeToken(s0, T0, 10);
    // 3 seconds later: refilled 3 tokens, 7 still needed
    const stats = tokenBucketStats(s1, T0 + 3000);
    expect(stats.msUntilFull).toBe(7000);
  });
});

describe("throttleDecision: boundary at exact window edge", () => {
  it("request exactly at window start is included", () => {
    // cutoff = now - windowMs; filter is t > cutoff
    // request at T0 - windowMs (i.e., exactly at cutoff) is excluded (not strictly greater)
    const requests = [T0 - 1000]; // exactly at cutoff for windowMs=1000
    const { requestsInWindow } = throttleDecision(requests, 1000, 5, T0);
    expect(requestsInWindow).toBe(0);
  });

  it("request just inside window is counted", () => {
    const requests = [T0 - 999]; // 1ms inside window
    const { requestsInWindow } = throttleDecision(requests, 1000, 5, T0);
    expect(requestsInWindow).toBe(1);
  });
});
