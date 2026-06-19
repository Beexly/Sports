/**
 * Cache and memoization utilities — pure, zero dependencies.
 *
 * LRU cache, TTL cache, memoization helpers, and cache statistics
 * for performance optimization in server-side data loading.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CacheStats {
  readonly hits: number;
  readonly misses: number;
  readonly size: number;
  readonly hitRate: number; // hits / (hits + misses), NaN if 0 total
}

export interface CacheEntry<V> {
  readonly value: V;
  readonly createdAt: number; // ms timestamp
  readonly expiresAt: number | null; // null = never expires
  readonly hits: number; // how many times this entry was accessed
}

// ─────────────────────────────────────────────────────────────────────────────
// LruCache
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Least-Recently-Used cache with a fixed capacity.
 * When the cache is full, the entry that was accessed least recently is evicted.
 */
export class LruCache<K, V> {
  private readonly maxSize: number;
  // Map preserves insertion order; we keep most-recent at the tail
  private readonly map: Map<K, V> = new Map();
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number) {
    if (maxSize < 1) throw new RangeError("maxSize must be at least 1");
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) {
      this.misses++;
      return undefined;
    }
    this.hits++;
    // Move to tail (most recent) by deleting and re-inserting
    const value = this.map.get(key) as V;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      // Refresh position
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      // Evict LRU (first entry in insertion order)
      const lruKey = this.map.keys().next().value as K;
      this.map.delete(lruKey);
    }
    this.map.set(key, value);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
    this.hits = 0;
    this.misses = 0;
  }

  get size(): number {
    return this.map.size;
  }

  get stats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.map.size,
      hitRate: total === 0 ? NaN : this.hits / total,
    };
  }

  keys(): K[] {
    return [...this.map.keys()];
  }

  values(): V[] {
    return [...this.map.values()];
  }

  entries(): [K, V][] {
    return [...this.map.entries()];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TtlCache
// ─────────────────────────────────────────────────────────────────────────────

interface InternalEntry<V> {
  value: V;
  createdAt: number;
  expiresAt: number | null;
  hits: number;
}

/**
 * TTL-based cache. Expired entries are NOT auto-removed on get; call prune()
 * explicitly to reclaim memory.
 */
export class TtlCache<K, V> {
  private readonly defaultTtlMs: number;
  private readonly map: Map<K, InternalEntry<V>> = new Map();
  private hits = 0;
  private misses = 0;

  constructor(defaultTtlMs: number) {
    if (defaultTtlMs < 0) throw new RangeError("defaultTtlMs must be >= 0");
    this.defaultTtlMs = defaultTtlMs;
  }

  private isExpired(entry: InternalEntry<V>): boolean {
    if (entry.expiresAt === null) return false;
    return Date.now() > entry.expiresAt;
  }

  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (entry === undefined || this.isExpired(entry)) {
      this.misses++;
      return undefined;
    }
    this.hits++;
    entry.hits++;
    return entry.value;
  }

  set(key: K, value: V, ttlMs?: number): void {
    const resolvedTtl = ttlMs !== undefined ? ttlMs : this.defaultTtlMs;
    const now = Date.now();
    this.map.set(key, {
      value,
      createdAt: now,
      expiresAt: resolvedTtl === 0 ? null : now + resolvedTtl,
      hits: 0,
    });
  }

  has(key: K): boolean {
    const entry = this.map.get(key);
    if (entry === undefined) return false;
    return !this.isExpired(entry);
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /** Remove expired entries and return the count removed. */
  prune(): number {
    let removed = 0;
    for (const [key, entry] of this.map) {
      if (this.isExpired(entry)) {
        this.map.delete(key);
        removed++;
      }
    }
    return removed;
  }

  /** Count of ALL entries including expired. */
  get size(): number {
    return this.map.size;
  }

  /** Count of non-expired entries only. */
  get activeSize(): number {
    let count = 0;
    for (const entry of this.map.values()) {
      if (!this.isExpired(entry)) count++;
    }
    return count;
  }

  get stats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.map.size,
      hitRate: total === 0 ? NaN : this.hits / total,
    };
  }

  getEntry(key: K): CacheEntry<V> | undefined {
    const entry = this.map.get(key);
    if (entry === undefined) return undefined;
    return {
      value: entry.value,
      createdAt: entry.createdAt,
      expiresAt: entry.expiresAt,
      hits: entry.hits,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// memoize
// ─────────────────────────────────────────────────────────────────────────────

type MemoizedFn<Args extends readonly unknown[], Return> = {
  (...args: Args): Return;
  readonly cache: Map<string, Return>;
  clear(): void;
};

/**
 * Memoize a synchronous function with an optional custom key function.
 * The returned function has a `.cache` Map and a `.clear()` method.
 */
export function memoize<Args extends readonly unknown[], Return>(
  fn: (...args: Args) => Return,
  keyFn?: (...args: Args) => string,
): MemoizedFn<Args, Return> {
  const cache = new Map<string, Return>();

  const memoized = (...args: Args): Return => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key) as Return;
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };

  Object.defineProperty(memoized, "cache", { get: () => cache });
  memoized.clear = () => cache.clear();

  return memoized as MemoizedFn<Args, Return>;
}

// ─────────────────────────────────────────────────────────────────────────────
// memoizeAsync
// ─────────────────────────────────────────────────────────────────────────────

type MemoizedAsyncFn<Args extends readonly unknown[], Return> = {
  (...args: Args): Promise<Return>;
  readonly cache: Map<string, Promise<Return>>;
  clear(): void;
};

/**
 * Memoize an async function. Concurrent calls with the same key share a single
 * in-flight promise. On rejection, the promise is removed so it can be retried.
 */
export function memoizeAsync<Args extends readonly unknown[], Return>(
  fn: (...args: Args) => Promise<Return>,
  keyFn?: (...args: Args) => string,
): MemoizedAsyncFn<Args, Return> {
  const cache = new Map<string, Promise<Return>>();

  const memoized = (...args: Args): Promise<Return> => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key) as Promise<Return>;
    }
    const promise = fn(...args).catch((err: unknown) => {
      cache.delete(key);
      return Promise.reject(err) as Promise<Return>;
    });
    cache.set(key, promise);
    return promise;
  };

  Object.defineProperty(memoized, "cache", { get: () => cache });
  memoized.clear = () => cache.clear();

  return memoized as MemoizedAsyncFn<Args, Return>;
}

// ─────────────────────────────────────────────────────────────────────────────
// withTtl
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wrap a zero-argument function so its result is cached for `ttlMs` milliseconds.
 * After the TTL expires, the next call re-evaluates fn.
 */
export function withTtl<T>(fn: () => T, ttlMs: number): () => T {
  let cachedValue: T | undefined;
  let expiresAt = 0;

  return (): T => {
    const now = Date.now();
    if (cachedValue !== undefined && now < expiresAt) {
      return cachedValue;
    }
    cachedValue = fn();
    expiresAt = now + ttlMs;
    return cachedValue;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// buildCacheKey
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a deterministic cache key by joining parts with ":".
 * null → "null", undefined → "undefined", others coerced to string.
 *
 * Example: buildCacheKey("picks", "nfl", 2024) → "picks:nfl:2024"
 */
export function buildCacheKey(
  ...parts: readonly (string | number | boolean | null | undefined)[]
): string {
  return parts
    .map((p) => {
      if (p === null) return "null";
      if (p === undefined) return "undefined";
      return String(p);
    })
    .join(":");
}

// ─────────────────────────────────────────────────────────────────────────────
// cacheStats
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format cache statistics as a human-readable string.
 * hitRate is shown as a percentage with one decimal place, or "N/A" when NaN.
 *
 * Example: "hits=10 misses=5 size=3 hitRate=66.7%"
 */
export function cacheStats(cache: { stats: CacheStats }): string {
  const s = cache.stats;
  const hitRateStr = Number.isNaN(s.hitRate)
    ? "N/A"
    : `${(s.hitRate * 100).toFixed(1)}%`;
  return `hits=${s.hits} misses=${s.misses} size=${s.size} hitRate=${hitRateStr}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// createScopedCache
// ─────────────────────────────────────────────────────────────────────────────

export interface ScopedCache<V> {
  get: (key: string) => V | undefined;
  set: (key: string, value: V) => void;
  invalidate: (key: string) => boolean;
  clear: () => void;
  stats: () => CacheStats;
}

/**
 * Factory for a namespaced TTL cache. All keys are stored internally as
 * `${scope}:${key}` to prevent collisions between caches.
 */
export function createScopedCache<V>(scope: string, ttlMs: number): ScopedCache<V> {
  const inner = new TtlCache<string, V>(ttlMs);

  const scopedKey = (key: string): string => `${scope}:${key}`;

  return {
    get: (key: string): V | undefined => inner.get(scopedKey(key)),
    set: (key: string, value: V): void => inner.set(scopedKey(key), value),
    invalidate: (key: string): boolean => inner.delete(scopedKey(key)),
    clear: (): void => inner.clear(),
    stats: (): CacheStats => inner.stats,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// staleWhileRevalidate
// ─────────────────────────────────────────────────────────────────────────────

// Module-level default cache shared across SWR calls that don't provide one
const _swrDefaultCache = new TtlCache<string, unknown>(0);

/**
 * Stale-While-Revalidate pattern.
 *
 * - If cache holds data (even expired): return it immediately, then revalidate
 *   in the background (errors silently swallowed).
 * - If cache is empty: await fetchFn, cache and return the result.
 */
export async function staleWhileRevalidate<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlMs: number,
  cache?: TtlCache<string, T>,
): Promise<T> {
  // Use provided cache or fall back to the module-level default
  const store: TtlCache<string, T> = cache ?? (_swrDefaultCache as TtlCache<string, T>);

  // Check for any existing entry (including expired) via getEntry
  const entry = store.getEntry(key);
  if (entry !== undefined) {
    // Return stale value immediately and revalidate in background
    void fetchFn()
      .then((fresh) => store.set(key, fresh, ttlMs))
      .catch(() => {
        /* silently swallow */
      });
    return entry.value;
  }

  // No cached data — must wait
  const result = await fetchFn();
  store.set(key, result, ttlMs);
  return result;
}
