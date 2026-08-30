/**
 * Process-local free-spine probe cache (hot path).
 * free-spine-health cron writes; jarvis-data reads (no network in assessment path).
 * Multi-instance: each isolate has its own RAM until free-spine-durable (Neon)
 * warms this cache on load — see free-spine-durable.ts (I3/I8).
 *
 * I5: empty RAM / offseason zero-games must not be scored as RED Critical.
 * freeSpineLiveScore returns null for missing, stale, or empty-labelled snaps.
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

/** Align live score TTL with I8 durable SLA (120m). */
export const FREE_SPINE_LIVE_SCORE_MAX_AGE_MS = 120 * 60 * 1000;

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

/**
 * Honest empty slate: probe ran, sports returned 0 games (offseason / bye week).
 * Not a probe failure — label empty, do not treat as Critical.
 */
export function isFreeSpineEmptySlate(snap: FreeSpineCacheSnapshot | null): boolean {
  if (!snap) return false;
  return snap.sportsProbed > 0 && snap.sportsWithGames === 0;
}

/**
 * 0..1 live probe score from last free-spine run.
 * null when: never probed, stale (>120m), or empty-labelled (0 games) — I5.
 * Never invents coverage.
 */
export function freeSpineLiveScore(
  snap: FreeSpineCacheSnapshot | null,
  maxAgeMs = FREE_SPINE_LIVE_SCORE_MAX_AGE_MS,
): number | null {
  if (!snap) return null;
  const age = Date.now() - Date.parse(snap.probedAt);
  if (!Number.isFinite(age) || age < 0 || age > maxAgeMs) return null;
  if (snap.sportsProbed <= 0) return null;
  // I5: offseason / zero-game slate is empty-labelled, not RED.
  if (snap.sportsWithGames === 0) return null;
  return Math.min(1, snap.sportsWithGames / snap.sportsProbed);
}
