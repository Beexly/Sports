/**
 * Response cache — stale-while-revalidate, with an honest staleness receipt.
 *
 * A native client that shows a board while offline is useful. A native client
 * that shows a board while offline and does not say so is the exact failure
 * CLAUDE.md rule 5 exists to prevent ("No stale data — always validate
 * timestamps and freshness"). So the cache returns an AGE alongside every hit,
 * and the UI is required to render it. Nothing in this file decides whether a
 * stale board is acceptable — that judgement belongs to the screen, which knows
 * what the user is looking at.
 *
 * Deliberate non-goals:
 *   · Not a database. No queries, no indexes, no partial reads.
 *   · No eviction policy beyond a hard TTL ceiling and a key cap. A phone that
 *     holds 2MB of sports JSON indefinitely is a phone that ships a stale
 *     season to a user next September.
 */

export interface CacheEntry<T> {
  /** The decoded payload. */
  value: T;
  /** Epoch ms when the payload was received from the network. */
  storedAt: number;
  /** Server-supplied version, when one exists. Not an HTTP ETag — see below. */
  version: string | null;
}

export interface CacheRead<T> {
  entry: CacheEntry<T>;
  ageMs: number;
  /** True when age exceeds the caller's freshness budget. */
  stale: boolean;
}
export interface CacheStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

export class Cache {
  private readonly storage: CacheStorage;
  private readonly namespace: string;

  constructor(storage: CacheStorage, namespace = "gse.cache.v1") {
    this.storage = storage;
    this.namespace = namespace;
  }

  private fullKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  /**
   * Read a cached payload.
   *
   * `budgetMs` is required, not defaulted. A default would silently apply one
   * surface's freshness expectation to another — a 60-second board budget
   * imposed on a six-hour calibration payload would mark every calibration read
   * stale and train the UI to ignore the flag.
   */
  async read<T>(key: string, budgetMs: number): Promise<CacheRead<T> | null> {
    const raw = await this.storage.get(this.fullKey(key));
    if (!raw) return null;
    let parsed: CacheEntry<T>;
    try {
      parsed = JSON.parse(raw) as CacheEntry<T>;
    } catch {
      // A corrupt entry is deleted rather than kept. Keeping it means the same
      // parse failure on every launch, forever.
      await this.storage.remove(this.fullKey(key));
      return null;
    }
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.storedAt !== "number" ||
      !Number.isFinite(parsed.storedAt)
    ) {
      await this.storage.remove(this.fullKey(key));
      return null;
    }
    // A negative age means the device clock moved backwards since the write
    // (timezone change, manual clock edit). Clamp to 0 rather than reporting
    // a negative age, and let the budget decide staleness.
    const ageMs = Math.max(0, Date.now() - parsed.storedAt);
    return { entry: parsed, ageMs, stale: ageMs > budgetMs };
  }

  async write<T>(key: string, value: T, version: string | null = null): Promise<void> {
    const entry: CacheEntry<T> = { value, storedAt: Date.now(), version };
    await this.storage.set(this.fullKey(key), JSON.stringify(entry));
    await this.enforceCeiling();
  }

  async invalidate(key: string): Promise<void> {
    await this.storage.remove(this.fullKey(key));
  }

  async clear(): Promise<void> {
    const all = await this.storage.keys();
    await Promise.all(
      all.filter((k) => k.startsWith(this.namespace)).map((k) => this.storage.remove(k)),
    );
  }

  /**
   * Hard ceiling. 60 entries is roughly a week of boards plus the static
   * surfaces; beyond that the oldest are dropped. A cap rather than an LRU
   * because the access pattern is "read the same four keys every session",
   * where LRU and oldest-first are the same policy.
   */
  private static readonly MAX_ENTRIES = 60;

  private async enforceCeiling(): Promise<void> {
    const all = (await this.storage.keys()).filter((k) => k.startsWith(this.namespace));
    if (all.length <= Cache.MAX_ENTRIES) return;

    const stamped: { key: string; storedAt: number }[] = [];
    for (const key of all) {
      const raw = await this.storage.get(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as CacheEntry<unknown>;
        stamped.push({ key, storedAt: parsed.storedAt ?? 0 });
      } catch {
        stamped.push({ key, storedAt: 0 });
      }
    }
    stamped.sort((a, b) => a.storedAt - b.storedAt);
    const drop = stamped.slice(0, stamped.length - Cache.MAX_ENTRIES);
    await Promise.all(drop.map((d) => this.storage.remove(d.key)));
  }
}

/**
 * In-memory implementation. Used by tests and as the fallback when the
 * persistent store is unavailable — a device whose keychain/storage is locked
 * (first launch before the user unlocks once) still gets a warm session.
 */
export class MemoryCacheStorage implements CacheStorage {
  private readonly map = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.map.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.map.delete(key);
  }

  async keys(): Promise<string[]> {
    return [...this.map.keys()];
  }
}

/**
 * Freshness budgets, in ms. These are UX budgets, not data-correctness
 * budgets: they decide when the app *revalidates in the background*, never
 * whether a payload is safe to show. The correctness gate is the pick-level
 * staleness predicate in `lib/trust.ts`.
 */
export const FRESHNESS_BUDGET_MS = {
  /** The board moves with the market. Revalidate aggressively. */
  board: 60_000,
  /** Published picks change far less often than their prices do. */
  picks: 120_000,
  /** Calibration moves once a day, after settlement. */
  calibration: 6 * 60 * 60 * 1000,
  /** Performance aggregates likewise. */
  performance: 6 * 60 * 60 * 1000,
  /** The daily brief is written once. */
  brief: 3 * 60 * 60 * 1000,
  /** Entitlements change only on a subscription event. */
  me: 30 * 60 * 1000,
  /** Static-ish reference data. */
  catalog: 24 * 60 * 60 * 1000,
} as const;

export type FreshnessKey = keyof typeof FRESHNESS_BUDGET_MS;

/** Human sentence for a cache hit, used by the freshness stamp. */
export function cacheNotice(ageMs: number): string {
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) return "Saved a moment ago";
  if (minutes < 60) return `Saved ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? "Saved 1 hr ago" : `Saved ${hours} hr ago`;
}
