/**
 * Shared Refresh SLA — single source of truth for "how stale is the odds
 * refresh allowed to get before we warn / alarm?"
 *
 * Why these numbers:
 *   The target refresh cadence is ~30 minutes (the long-running worker's
 *   `REFRESH_INTERVAL_MS`). The DEPLOYED Vercel fallback cron, however, runs
 *   DAILY, and schedulers jitter. A previous `/api/health` check flipped to a
 *   503 after just 2 HOURS — a hard-coded magic number that was both
 *   inconsistent with Jarvis (6h warn / 24h red) and a source of FALSE 503s
 *   whenever the cadence relaxed or a single cycle slipped.
 *
 *   These constants split the difference and give one honest answer:
 *     - WARN  at 120 min (2h): a couple of missed 30-min cycles. Operator
 *       should glance, but this is not yet an outage.
 *     - STALE at 240 min (4h): genuinely behind. This mirrors the existing 4h
 *       precedent in `stale-data-detector.ts` (its default `thresholdHours`),
 *       so the platform speaks with one voice about staleness. Generous enough
 *       to absorb scheduler jitter and avoid false 503s, tight enough to catch
 *       a truly stuck pipeline.
 *
 * Consumers: `/api/health` (uses STALE for its error/503 trigger) and Jarvis's
 * ingestion classifier (uses WARN→AMBER, STALE→RED).
 */

/** Below this age the refresh is healthy; at/above it Jarvis goes AMBER. */
export const REFRESH_WARN_AFTER_MINUTES = 120;

/** At/above this age the refresh is stale: Jarvis RED, /api/health 503. */
export const REFRESH_STALE_AFTER_MINUTES = 240;

export type RefreshFreshnessStatus = "ok" | "warn" | "stale";

export interface RefreshFreshness {
  /** Age of the last success in whole minutes, or null if never succeeded. */
  readonly ageMinutes: number | null;
  readonly status: RefreshFreshnessStatus;
}

/**
 * Classifies the freshness of the last successful refresh against the shared
 * SLA thresholds. Pure and I/O-free for easy unit testing.
 *
 * Boundary semantics (consistent with the existing detectStaleSource `>` rule):
 *   - ageMinutes >  STALE → "stale"
 *   - ageMinutes >  WARN  → "warn"
 *   - otherwise           → "ok"
 *   - lastSuccessAt null  → status "stale" (never succeeded is not "ok"),
 *     ageMinutes null.
 */
export function classifyRefreshFreshness(
  lastSuccessAt: Date | null,
  now: Date = new Date(),
): RefreshFreshness {
  if (lastSuccessAt === null) {
    return { ageMinutes: null, status: "stale" };
  }

  const ageMs = now.getTime() - lastSuccessAt.getTime();
  const ageMinutes = Math.round(ageMs / (1000 * 60));
  const ageMinutesExact = ageMs / (1000 * 60);

  let status: RefreshFreshnessStatus;
  if (ageMinutesExact > REFRESH_STALE_AFTER_MINUTES) {
    status = "stale";
  } else if (ageMinutesExact > REFRESH_WARN_AFTER_MINUTES) {
    status = "warn";
  } else {
    status = "ok";
  }

  return { ageMinutes, status };
}

/**
 * ── Per-sport freshness gating (Wave 6) ─────────────────────────────────────
 *
 * The shared SLA above is a single global clock. But sports are not uniform:
 *   - An off-season sport has no live games to refresh, so a "stale" reading is
 *     EXPECTED and must NOT trip the board kill-switch or /api/health 503.
 *   - Some in-season sports legitimately refresh on a slower cadence (e.g. a
 *     daily-card sport vs a continuous one), so a per-sport threshold lets an
 *     owner tighten or loosen without touching the global constant.
 *
 * Design: additive + backward-compatible. The global `classifyRefreshFreshness`
 * is unchanged; callers that want per-sport awareness call the functions below.
 * Everything here is pure and I/O-free for unit testing.
 */

/** Per-sport threshold overrides. Keyed by The Odds API sport key. */
export interface PerSportFreshnessThresholds {
  readonly warnMinutes: number;
  readonly staleMinutes: number;
}

/**
 * Resolve the freshness thresholds for a sport. Falls back to the global SLA
 * when no override is registered. Pure: pass `overrides` explicitly in tests.
 */
export function resolveFreshnessThresholds(
  sportKey: string,
  overrides: Readonly<Record<string, PerSportFreshnessThresholds>> = {},
): PerSportFreshnessThresholds {
  const o = overrides[sportKey];
  if (o) return { warnMinutes: o.warnMinutes, staleMinutes: o.staleMinutes };
  return {
    warnMinutes: REFRESH_WARN_AFTER_MINUTES,
    staleMinutes: REFRESH_STALE_AFTER_MINUTES,
  };
}

export interface PerSportRefreshFreshness extends RefreshFreshness {
  /**
   * True when the sport is out of season on `now`, so a "stale" reading is
   * expected and must NOT count as a freshness failure at the board/health
   * layer. Consumers should treat `exempt` as "do not gate on this sport".
   */
  readonly exempt: boolean;
  /** The sport key this classification was resolved for. */
  readonly sportKey: string;
}

/**
 * Classify a sport's last-success freshness with per-sport awareness.
 *
 * Rules:
 *   - `lastSuccessAt === null` while in season → "stale" (never-succeeded is a
 *     real failure only when the sport is actually in season).
 *   - Out of season → status "stale" BUT `exempt: true` (expected staleness;
 *     the gate must not trip on it).
 *   - In season → normal threshold classification using the per-sport override
 *     when present, else the global SLA.
 *
 * `isInSeason` is injected (defaults to a no-op returning true) so this stays
 * pure and testable without importing the data-ingestion package here.
 */
export function classifyPerSportRefreshFreshness(
  sportKey: string,
  lastSuccessAt: Date | null,
  now: Date = new Date(),
  isInSeason: (key: string, date: Date) => boolean = () => true,
  overrides: Readonly<Record<string, PerSportFreshnessThresholds>> = {},
): PerSportRefreshFreshness {
  const inSeason = isInSeason(sportKey, now);
  if (!inSeason) {
    // Expected staleness — flag it but mark exempt so the gate ignores it.
    const ageMinutes = lastSuccessAt
      ? Math.round((now.getTime() - lastSuccessAt.getTime()) / (1000 * 60))
      : null;
    return { ageMinutes, status: "stale", exempt: true, sportKey };
  }

  const { warnMinutes, staleMinutes } = resolveFreshnessThresholds(sportKey, overrides);
  const ageMs = lastSuccessAt === null ? Infinity : now.getTime() - lastSuccessAt.getTime();
  const ageMinutes = lastSuccessAt === null ? null : Math.round(ageMs / (1000 * 60));
  const ageExact = lastSuccessAt === null ? Infinity : ageMs / (1000 * 60);

  let status: RefreshFreshnessStatus;
  if (ageExact > staleMinutes) status = "stale";
  else if (ageExact > warnMinutes) status = "warn";
  else status = "ok";

  return { ageMinutes, status, exempt: false, sportKey };
}
