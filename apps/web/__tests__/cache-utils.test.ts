/**
 * Tests for cache-utils: LruCache, TtlCache, memoize, memoizeAsync,
 * withTtl, buildCacheKey, cacheStats, createScopedCache, staleWhileRevalidate.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  LruCache,
  TtlCache,
  memoize,
  memoizeAsync,
  withTtl,
  buildCacheKey,
  cacheStats,
  createScopedCache,
  staleWhileRevalidate,
} from "@/lib/utils/cache-utils";

// ─────────────────────────────────────────────────────────────────────────────
// LruCache
// ─────────────────────────────────────────────────────────────────────────────

describe("LruCache — basic get/set", () => {
  it("returns undefined for a missing key", () => {
    const c = new LruCache<string, number>(3);
    expect(c.get("x")).toBeUndefined();
  });

  it("stores and retrieves a value", () => {
    const c = new LruCache<string, number>(3);
    c.set("a", 1);
    expect(c.get("a")).toBe(1);
  });

  it("stores multiple values", () => {
    const c = new LruCache<string, number>(5);
    c.set("a", 1);
    c.set("b", 2);
    expect(c.get("a")).toBe(1);
    expect(c.get("b")).toBe(2);
  });

  it("overwrites an existing key", () => {
    const c = new LruCache<string, number>(3);
    c.set("a", 1);
    c.set("a", 99);
    expect(c.get("a")).toBe(99);
  });

  it("size reflects number of entries", () => {
    const c = new LruCache<string, number>(5);
    c.set("a", 1);
    c.set("b", 2);
    expect(c.size).toBe(2);
  });

  it("has returns true for existing keys", () => {
    const c = new LruCache<string, number>(3);
    c.set("a", 1);
    expect(c.has("a")).toBe(true);
  });

  it("has returns false for missing keys", () => {
    const c = new LruCache<string, number>(3);
    expect(c.has("z")).toBe(false);
  });

  it("delete removes an entry and returns true", () => {
    const c = new LruCache<string, number>(3);
    c.set("a", 1);
    expect(c.delete("a")).toBe(true);
    expect(c.has("a")).toBe(false);
  });

  it("delete returns false for non-existent key", () => {
    const c = new LruCache<string, number>(3);
    expect(c.delete("nope")).toBe(false);
  });

  it("clear empties the cache", () => {
    const c = new LruCache<string, number>(3);
    c.set("a", 1);
    c.set("b", 2);
    c.clear();
    expect(c.size).toBe(0);
    expect(c.get("a")).toBeUndefined();
  });

  it("keys() returns all stored keys", () => {
    const c = new LruCache<string, number>(5);
    c.set("a", 1);
    c.set("b", 2);
    expect(c.keys()).toEqual(expect.arrayContaining(["a", "b"]));
    expect(c.keys().length).toBe(2);
  });

  it("values() returns all stored values", () => {
    const c = new LruCache<string, number>(5);
    c.set("a", 1);
    c.set("b", 2);
    expect(c.values()).toEqual(expect.arrayContaining([1, 2]));
  });

  it("entries() returns [key, value] pairs", () => {
    const c = new LruCache<string, number>(5);
    c.set("a", 1);
    expect(c.entries()).toEqual(expect.arrayContaining([["a", 1]]));
  });
});

describe("LruCache — LRU eviction", () => {
  it("evicts the oldest entry when maxSize is exceeded", () => {
    const c = new LruCache<string, number>(2);
    c.set("a", 1);
    c.set("b", 2);
    c.set("c", 3); // "a" should be evicted
    expect(c.has("a")).toBe(false);
    expect(c.has("b")).toBe(true);
    expect(c.has("c")).toBe(true);
  });

  it("accessing an entry promotes it and prevents eviction", () => {
    const c = new LruCache<string, number>(2);
    c.set("a", 1);
    c.set("b", 2);
    c.get("a"); // promote "a" — "b" is now LRU
    c.set("c", 3); // "b" should be evicted
    expect(c.has("a")).toBe(true);
    expect(c.has("b")).toBe(false);
    expect(c.has("c")).toBe(true);
  });

  it("re-setting an existing key promotes it and does not grow size", () => {
    const c = new LruCache<string, number>(2);
    c.set("a", 1);
    c.set("b", 2);
    c.set("a", 10); // refresh "a" — "b" is now LRU
    c.set("c", 3); // "b" should be evicted
    expect(c.has("a")).toBe(true);
    expect(c.get("a")).toBe(10);
    expect(c.has("b")).toBe(false);
    expect(c.has("c")).toBe(true);
  });

  it("does not exceed maxSize", () => {
    const c = new LruCache<string, number>(3);
    for (let i = 0; i < 10; i++) c.set(`k${i}`, i);
    expect(c.size).toBe(3);
  });

  it("throws if maxSize < 1", () => {
    expect(() => new LruCache(0)).toThrow(RangeError);
  });
});

describe("LruCache — stats", () => {
  it("initial stats have 0 hits/misses and NaN hitRate", () => {
    const c = new LruCache<string, number>(3);
    const s = c.stats;
    expect(s.hits).toBe(0);
    expect(s.misses).toBe(0);
    expect(Number.isNaN(s.hitRate)).toBe(true);
  });

  it("tracks hits on successful get", () => {
    const c = new LruCache<string, number>(3);
    c.set("a", 1);
    c.get("a");
    c.get("a");
    expect(c.stats.hits).toBe(2);
  });

  it("tracks misses on failed get", () => {
    const c = new LruCache<string, number>(3);
    c.get("missing");
    expect(c.stats.misses).toBe(1);
  });

  it("computes hitRate correctly", () => {
    const c = new LruCache<string, number>(3);
    c.set("a", 1);
    c.get("a"); // hit
    c.get("b"); // miss
    expect(c.stats.hitRate).toBeCloseTo(0.5);
  });

  it("clear resets stats", () => {
    const c = new LruCache<string, number>(3);
    c.set("a", 1);
    c.get("a");
    c.get("z");
    c.clear();
    expect(c.stats.hits).toBe(0);
    expect(c.stats.misses).toBe(0);
    expect(Number.isNaN(c.stats.hitRate)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TtlCache
// ─────────────────────────────────────────────────────────────────────────────

describe("TtlCache — basic operations", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a value before TTL expires", () => {
    const c = new TtlCache<string, number>(1000);
    c.set("a", 42);
    vi.advanceTimersByTime(500);
    expect(c.get("a")).toBe(42);
  });

  it("returns undefined after TTL expires", () => {
    const c = new TtlCache<string, number>(1000);
    c.set("a", 42);
    vi.advanceTimersByTime(1001);
    expect(c.get("a")).toBeUndefined();
  });

  it("supports custom per-entry TTL", () => {
    const c = new TtlCache<string, number>(5000);
    c.set("short", 1, 100);
    c.set("long", 2, 10000);
    vi.advanceTimersByTime(200);
    expect(c.get("short")).toBeUndefined();
    expect(c.get("long")).toBe(2);
  });

  it("has returns true before expiry", () => {
    const c = new TtlCache<string, number>(1000);
    c.set("a", 1);
    expect(c.has("a")).toBe(true);
  });

  it("has returns false after expiry", () => {
    const c = new TtlCache<string, number>(1000);
    c.set("a", 1);
    vi.advanceTimersByTime(1001);
    expect(c.has("a")).toBe(false);
  });

  it("has returns false for missing key", () => {
    const c = new TtlCache<string, number>(1000);
    expect(c.has("nope")).toBe(false);
  });

  it("delete removes an entry and returns true", () => {
    const c = new TtlCache<string, number>(1000);
    c.set("a", 1);
    expect(c.delete("a")).toBe(true);
    expect(c.has("a")).toBe(false);
  });

  it("delete returns false for non-existent key", () => {
    const c = new TtlCache<string, number>(1000);
    expect(c.delete("nope")).toBe(false);
  });

  it("clear empties the cache and resets stats", () => {
    const c = new TtlCache<string, number>(1000);
    c.set("a", 1);
    c.get("a");
    c.clear();
    expect(c.size).toBe(0);
    expect(c.stats.hits).toBe(0);
  });

  it("throws if defaultTtlMs < 0", () => {
    expect(() => new TtlCache(-1)).toThrow(RangeError);
  });
});

describe("TtlCache — prune and size", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("size includes expired entries", () => {
    const c = new TtlCache<string, number>(500);
    c.set("a", 1);
    c.set("b", 2);
    vi.advanceTimersByTime(600);
    expect(c.size).toBe(2);
  });

  it("activeSize excludes expired entries", () => {
    const c = new TtlCache<string, number>(500);
    c.set("a", 1);
    c.set("b", 2, 10000);
    vi.advanceTimersByTime(600);
    expect(c.activeSize).toBe(1);
  });

  it("prune removes expired entries and returns count", () => {
    const c = new TtlCache<string, number>(500);
    c.set("a", 1);
    c.set("b", 2);
    c.set("c", 3, 10000);
    vi.advanceTimersByTime(600);
    const removed = c.prune();
    expect(removed).toBe(2);
    expect(c.size).toBe(1);
  });

  it("prune returns 0 when nothing is expired", () => {
    const c = new TtlCache<string, number>(5000);
    c.set("a", 1);
    expect(c.prune()).toBe(0);
  });
});

describe("TtlCache — getEntry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns entry metadata for existing key", () => {
    const c = new TtlCache<string, number>(1000);
    const before = Date.now();
    c.set("a", 42);
    const entry = c.getEntry("a");
    expect(entry).toBeDefined();
    expect(entry?.value).toBe(42);
    expect(entry?.createdAt).toBeGreaterThanOrEqual(before);
    expect(entry?.expiresAt).toBe(before + 1000);
    expect(entry?.hits).toBe(0);
  });

  it("returns entry even if expired (getEntry does not filter)", () => {
    const c = new TtlCache<string, number>(500);
    c.set("a", 99);
    vi.advanceTimersByTime(600);
    const entry = c.getEntry("a");
    expect(entry).toBeDefined();
    expect(entry?.value).toBe(99);
  });

  it("returns undefined for missing key", () => {
    const c = new TtlCache<string, number>(1000);
    expect(c.getEntry("missing")).toBeUndefined();
  });

  it("hits counter in getEntry increments after get calls", () => {
    const c = new TtlCache<string, number>(5000);
    c.set("a", 1);
    c.get("a");
    c.get("a");
    const entry = c.getEntry("a");
    expect(entry?.hits).toBe(2);
  });
});

describe("TtlCache — stats", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("tracks hits and misses", () => {
    const c = new TtlCache<string, number>(1000);
    c.set("a", 1);
    c.get("a"); // hit
    c.get("b"); // miss
    expect(c.stats.hits).toBe(1);
    expect(c.stats.misses).toBe(1);
  });

  it("expired get counts as a miss", () => {
    const c = new TtlCache<string, number>(500);
    c.set("a", 1);
    vi.advanceTimersByTime(600);
    c.get("a");
    expect(c.stats.misses).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// memoize
// ─────────────────────────────────────────────────────────────────────────────

describe("memoize", () => {
  it("returns cached result for same args", () => {
    let calls = 0;
    const fn = memoize((x: number) => {
      calls++;
      return x * 2;
    });
    fn(5);
    fn(5);
    expect(calls).toBe(1);
    expect(fn(5)).toBe(10);
  });

  it("computes fresh result for different args", () => {
    let calls = 0;
    const fn = memoize((x: number) => {
      calls++;
      return x * 2;
    });
    fn(1);
    fn(2);
    expect(calls).toBe(2);
  });

  it("supports multiple arguments", () => {
    const fn = memoize((a: number, b: number) => a + b);
    expect(fn(1, 2)).toBe(3);
    expect(fn(1, 2)).toBe(3);
    expect(fn(2, 1)).toBe(3);
  });

  it("uses custom key function", () => {
    let calls = 0;
    const fn = memoize(
      (obj: { id: number }) => {
        calls++;
        return obj.id * 10;
      },
      (obj) => String(obj.id),
    );
    fn({ id: 1 });
    fn({ id: 1 });
    expect(calls).toBe(1);
  });

  it("exposes .cache Map", () => {
    const fn = memoize((x: number) => x + 1);
    fn(5);
    expect(fn.cache).toBeInstanceOf(Map);
    expect(fn.cache.size).toBe(1);
  });

  it(".clear() empties the cache", () => {
    let calls = 0;
    const fn = memoize((x: number) => {
      calls++;
      return x;
    });
    fn(1);
    fn.clear();
    fn(1);
    expect(calls).toBe(2);
    expect(fn.cache.size).toBe(1);
  });

  it("handles array args via JSON.stringify default key", () => {
    let calls = 0;
    const fn = memoize((arr: number[]) => {
      calls++;
      return arr.reduce((s, n) => s + n, 0);
    });
    fn([1, 2, 3]);
    fn([1, 2, 3]);
    expect(calls).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// memoizeAsync
// ─────────────────────────────────────────────────────────────────────────────

describe("memoizeAsync", () => {
  it("caches resolved promises", async () => {
    let calls = 0;
    const fn = memoizeAsync(async (x: number) => {
      calls++;
      return x * 2;
    });
    await fn(3);
    await fn(3);
    expect(calls).toBe(1);
  });

  it("computes for different args", async () => {
    let calls = 0;
    const fn = memoizeAsync(async (x: number) => {
      calls++;
      return x;
    });
    await fn(1);
    await fn(2);
    expect(calls).toBe(2);
  });

  it("de-duplicates concurrent same-key requests", async () => {
    let calls = 0;
    const fn = memoizeAsync(async (x: number) => {
      calls++;
      return x;
    });
    // Fire two concurrent calls with same key
    const [a, b] = await Promise.all([fn(7), fn(7)]);
    expect(a).toBe(7);
    expect(b).toBe(7);
    expect(calls).toBe(1);
  });

  it("removes entry from cache on error so it can be retried", async () => {
    let calls = 0;
    const fn = memoizeAsync(async () => {
      calls++;
      if (calls === 1) throw new Error("boom");
      return "ok";
    });
    await expect(fn()).rejects.toThrow("boom");
    const result = await fn();
    expect(result).toBe("ok");
    expect(calls).toBe(2);
  });

  it("exposes .cache Map", async () => {
    const fn = memoizeAsync(async (x: number) => x);
    await fn(1);
    expect(fn.cache).toBeInstanceOf(Map);
  });

  it(".clear() empties the async cache", async () => {
    let calls = 0;
    const fn = memoizeAsync(async (x: number) => {
      calls++;
      return x;
    });
    await fn(5);
    fn.clear();
    await fn(5);
    expect(calls).toBe(2);
  });

  it("supports custom key function", async () => {
    let calls = 0;
    const fn = memoizeAsync(
      async (obj: { id: number }) => {
        calls++;
        return obj.id;
      },
      (obj) => `id:${obj.id}`,
    );
    await fn({ id: 42 });
    await fn({ id: 42 });
    expect(calls).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// withTtl
// ─────────────────────────────────────────────────────────────────────────────

describe("withTtl", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls fn on first invocation", () => {
    let count = 0;
    const get = withTtl(() => ++count, 1000);
    expect(get()).toBe(1);
  });

  it("returns cached result within TTL", () => {
    let count = 0;
    const get = withTtl(() => ++count, 1000);
    get();
    vi.advanceTimersByTime(500);
    expect(get()).toBe(1);
    expect(count).toBe(1);
  });

  it("refreshes result after TTL expires", () => {
    let count = 0;
    const get = withTtl(() => ++count, 1000);
    get();
    vi.advanceTimersByTime(1001);
    expect(get()).toBe(2);
    expect(count).toBe(2);
  });

  it("counter increments correctly across multiple TTL cycles", () => {
    let count = 0;
    const get = withTtl(() => ++count, 500);
    get(); // count=1
    vi.advanceTimersByTime(600);
    get(); // count=2
    vi.advanceTimersByTime(600);
    get(); // count=3
    expect(count).toBe(3);
  });

  it("multiple cached reads within TTL do not call fn again", () => {
    let count = 0;
    const get = withTtl(() => ++count, 2000);
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(100);
      get();
    }
    expect(count).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildCacheKey
// ─────────────────────────────────────────────────────────────────────────────

describe("buildCacheKey", () => {
  it("joins string parts with colon", () => {
    expect(buildCacheKey("picks", "nfl", "week1")).toBe("picks:nfl:week1");
  });

  it("handles numbers", () => {
    expect(buildCacheKey("picks", "nfl", 2024)).toBe("picks:nfl:2024");
  });

  it("handles booleans", () => {
    expect(buildCacheKey("feature", true)).toBe("feature:true");
    expect(buildCacheKey("feature", false)).toBe("feature:false");
  });

  it("converts null to string 'null'", () => {
    expect(buildCacheKey("a", null, "b")).toBe("a:null:b");
  });

  it("converts undefined to string 'undefined'", () => {
    expect(buildCacheKey("a", undefined, "b")).toBe("a:undefined:b");
  });

  it("handles a single part", () => {
    expect(buildCacheKey("solo")).toBe("solo");
  });

  it("handles zero parts", () => {
    expect(buildCacheKey()).toBe("");
  });

  it("matches example from spec", () => {
    expect(buildCacheKey("picks", "nfl", 2024)).toBe("picks:nfl:2024");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// cacheStats
// ─────────────────────────────────────────────────────────────────────────────

describe("cacheStats", () => {
  it("formats stats correctly", () => {
    const c = new LruCache<string, number>(10);
    c.set("a", 1);
    c.get("a"); // hit
    c.get("b"); // miss
    const result = cacheStats(c);
    expect(result).toBe("hits=1 misses=1 size=1 hitRate=50.0%");
  });

  it("shows N/A for NaN hitRate (no ops)", () => {
    const c = new LruCache<string, number>(5);
    expect(cacheStats(c)).toBe("hits=0 misses=0 size=0 hitRate=N/A");
  });

  it("shows 100% hitRate when all hits", () => {
    const c = new LruCache<string, number>(5);
    c.set("a", 1);
    c.get("a");
    expect(cacheStats(c)).toContain("hitRate=100.0%");
  });

  it("shows 0.0% hitRate when all misses", () => {
    const c = new LruCache<string, number>(5);
    c.get("missing");
    expect(cacheStats(c)).toContain("hitRate=0.0%");
  });

  it("works with TtlCache", () => {
    const c = new TtlCache<string, number>(5000);
    c.set("a", 1);
    c.get("a"); // hit
    expect(cacheStats(c)).toContain("hits=1");
  });

  it("hitRate rounds to 1 decimal", () => {
    const c = new LruCache<string, number>(10);
    c.set("a", 1);
    c.get("a"); // hit
    c.get("b"); // miss
    c.get("c"); // miss
    // 1 hit / 3 total = 33.333…% → "33.3%"
    expect(cacheStats(c)).toContain("hitRate=33.3%");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createScopedCache
// ─────────────────────────────────────────────────────────────────────────────

describe("createScopedCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and retrieves a value", () => {
    const c = createScopedCache<number>("picks", 5000);
    c.set("nfl", 42);
    expect(c.get("nfl")).toBe(42);
  });

  it("returns undefined for missing key", () => {
    const c = createScopedCache<number>("picks", 5000);
    expect(c.get("missing")).toBeUndefined();
  });

  it("invalidate removes a key and returns true", () => {
    const c = createScopedCache<number>("picks", 5000);
    c.set("a", 1);
    expect(c.invalidate("a")).toBe(true);
    expect(c.get("a")).toBeUndefined();
  });

  it("invalidate returns false for non-existent key", () => {
    const c = createScopedCache<number>("picks", 5000);
    expect(c.invalidate("nope")).toBe(false);
  });

  it("clear removes all entries", () => {
    const c = createScopedCache<number>("picks", 5000);
    c.set("a", 1);
    c.set("b", 2);
    c.clear();
    expect(c.get("a")).toBeUndefined();
    expect(c.get("b")).toBeUndefined();
  });

  it("stats returns CacheStats object", () => {
    const c = createScopedCache<number>("picks", 5000);
    c.set("a", 1);
    c.get("a"); // hit
    c.get("z"); // miss
    const s = c.stats();
    expect(s.hits).toBe(1);
    expect(s.misses).toBe(1);
  });

  it("two scoped caches don't share keys", () => {
    const c1 = createScopedCache<number>("alpha", 5000);
    const c2 = createScopedCache<number>("beta", 5000);
    c1.set("x", 1);
    expect(c2.get("x")).toBeUndefined();
  });

  it("respects TTL for values", () => {
    const c = createScopedCache<number>("picks", 500);
    c.set("a", 99);
    vi.advanceTimersByTime(600);
    expect(c.get("a")).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// staleWhileRevalidate
// ─────────────────────────────────────────────────────────────────────────────

describe("staleWhileRevalidate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("first call awaits fetchFn and caches the result", async () => {
    const cache = new TtlCache<string, number>(5000);
    let calls = 0;
    const fetch = async () => {
      calls++;
      return 42;
    };
    const result = await staleWhileRevalidate("key", fetch, 5000, cache);
    expect(result).toBe(42);
    expect(calls).toBe(1);
  });

  it("second call returns stale value immediately without waiting", async () => {
    const cache = new TtlCache<string, number>(5000);
    let calls = 0;
    const fetch = async () => {
      calls++;
      return calls;
    };
    await staleWhileRevalidate("k", fetch, 5000, cache);
    const result = await staleWhileRevalidate("k", fetch, 5000, cache);
    // Returns the stale (first) value
    expect(result).toBe(1);
  });

  it("background revalidation updates cache after stale return", async () => {
    const cache = new TtlCache<string, number>(100);
    let version = 0;

    await staleWhileRevalidate("k", async () => ++version, 100, cache);
    // Advance so entry is stale
    vi.advanceTimersByTime(200);
    // Second call returns stale and triggers background fetch
    const staleResult = await staleWhileRevalidate("k", async () => ++version, 100, cache);
    expect(staleResult).toBe(1);
    // Let microtasks (background revalidation) settle
    await Promise.resolve();
    // Now cache should have been updated by background fetch
    const entry = cache.getEntry("k");
    expect(entry?.value).toBe(2);
  });

  it("background revalidation errors are silently swallowed", async () => {
    const cache = new TtlCache<string, number>(100);
    let calls = 0;
    const fetch = async () => {
      calls++;
      if (calls > 1) throw new Error("revalidation failed");
      return 1;
    };
    await staleWhileRevalidate("k", fetch, 100, cache);
    vi.advanceTimersByTime(200);
    // Should not throw even though revalidation errors
    const result = await staleWhileRevalidate("k", fetch, 100, cache);
    await Promise.resolve(); // flush background error
    expect(result).toBe(1);
  });

  it("uses internal cache when none is provided", async () => {
    // Call with unique key to avoid cross-test pollution from module-level cache
    const key = `swr-internal-${Date.now()}-${Math.random()}`;
    let calls = 0;
    const fetch = async () => {
      calls++;
      return 99;
    };
    const r1 = await staleWhileRevalidate(key, fetch, 5000);
    expect(r1).toBe(99);
    expect(calls).toBe(1);
  });

  it("caches result with correct TTL so subsequent calls use stale", async () => {
    const cache = new TtlCache<string, string>(2000);
    let version = "v1";
    const fetch = async () => version;
    await staleWhileRevalidate("k", fetch, 2000, cache);
    version = "v2";
    // Still within TTL — but SWR returns stale regardless and revalidates
    const result = await staleWhileRevalidate("k", fetch, 2000, cache);
    expect(result).toBe("v1"); // stale value returned
  });
});
