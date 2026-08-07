/**
 * Process-local free-spine probe cache (hot path).
 * free-spine-health cron writes; jarvis-data reads (no network in assessment path).
 * Multi-instance: each isolate has its own RAM until free-spine-durable (Neon)
 * warms this cache on load — see free-spine-durable.ts (I3/I8).
 */

export type FreeSpineCacheSnapshot = {
  readonly probedAt: string;
  readonly sportsProbed: number;
  readonly sportsWithGames: number;
  readonly criticalGaps: number;
  readonly requireSpend: number;
  readonly freeCovered: number;
  readonly live: ReadonlyArray<{
    readonly sport: string;
    readonly used: string | null;
    readonly games: number;
    readonly failover: boolean;
  }>;
};

let latest: FreeSpineCacheSnapshot | null = null;

export function writeFreeSpineCache(snap: FreeSpineCacheSnapshot): void {
  latest = snap;
}

export function readFreeSpineCache(): FreeSpineCacheSnapshot | null {
  return latest;
}

export function clearFreeSpineCache(): void {
  latest = null;
}

/** 0..1 live probe score from last free-spine run (null if never probed). */
export function freeSpineLiveScore(snap: FreeSpineCacheSnapshot | null, maxAgeMs = 36e5 * 30): number | null {
  if (!snap) return null;
  const age = Date.now() - Date.parse(snap.probedAt);
  if (!Number.isFinite(age) || age > maxAgeMs) return null;
  if (snap.sportsProbed <= 0) return 0;
  return Math.min(1, snap.sportsWithGames / snap.sportsProbed);
}
