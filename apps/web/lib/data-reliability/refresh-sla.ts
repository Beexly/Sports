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
