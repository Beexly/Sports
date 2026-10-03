/**
 * In-process TTL cache for quote providers (Gamma cron plane).
 * Single-process only — Redis later when multi-instance.
 */

export interface CacheEntry<T> {
  readonly value: T;
  readonly expiresAtMs: number;
  readonly storedAtMs: number;
  readonly hits: number;
}

export interface TtlCacheStats {
  readonly size: number;
  readonly hits: number;
  readonly misses: number;
  readonly evictions: number;
  readonly hitRate: number;
}

export class TtlCache<T> {
  private readonly map = new Map<string, CacheEntry<T>>();
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(
    private readonly defaultTtlMs: number,
    private readonly maxEntries = 500,
  ) {
    if (defaultTtlMs <= 0) throw new Error("ttl must be > 0");
  }

  get(key: string, nowMs = Date.now()): T | undefined {
    const e = this.map.get(key);
    if (!e) {
      this.misses++;
      return undefined;
    }
    if (e.expiresAtMs <= nowMs) {
      this.map.delete(key);
      this.evictions++;
      this.misses++;
      return undefined;
    }
    // bump hit count immutably
    this.map.set(key, { ...e, hits: e.hits + 1 });
    this.hits++;
    return e.value;
  }

  set(key: string, value: T, ttlMs = this.defaultTtlMs, nowMs = Date.now()): void {
    if (this.map.size >= this.maxEntries && !this.map.has(key)) {
      // evict oldest by storedAt
      let oldestKey: string | undefined;
      let oldest = Infinity;
      for (const [k, v] of this.map) {
        if (v.storedAtMs < oldest) {
          oldest = v.storedAtMs;
          oldestKey = k;
        }
      }
      if (oldestKey) {
        this.map.delete(oldestKey);
        this.evictions++;
      }
    }
    this.map.set(key, {
      value,
      expiresAtMs: nowMs + ttlMs,
      storedAtMs: nowMs,
      hits: 0,
    });
  }

  /** get-or-set with factory; only calls factory on miss */
  async getOrSet(
    key: string,
    factory: () => Promise<T>,
    ttlMs = this.defaultTtlMs,
    nowMs = Date.now(),
  ): Promise<{ value: T; cacheHit: boolean }> {
    const hit = this.get(key, nowMs);
    if (hit !== undefined) return { value: hit, cacheHit: true };
    const value = await factory();
    this.set(key, value, ttlMs, nowMs);
    return { value, cacheHit: false };
  }

  invalidate(key: string): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  stats(): TtlCacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.map.size,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate: total === 0 ? 0 : this.hits / total,
    };
  }
}

/** Stable cache key for quote fetch requests */
export function quoteCacheKey(parts: {
  providerId: string;
  sport: string;
  eventId?: string;
  market?: string;
}): string {
  return [
    parts.providerId,
    parts.sport,
    parts.eventId ?? "*",
    parts.market ?? "*",
  ].join("|");
}
