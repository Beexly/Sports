/**
 * Odds API quota burn-down loader (R-13) — cockpit visibility for The Odds
 * API request quota.
 *
 * processSport persists the x-requests-remaining / x-requests-used response
 * headers onto each IngestionRun (nullable remainingRequests/usedRequests
 * columns). This loader reads the latest quota-bearing run and shapes it for
 * the /cockpit/sources burn-down tile:
 *
 *   - remaining/used from the most recent run that carried quota headers
 *   - a low-quota flag when remaining falls below an env-tunable threshold
 *     (ODDS_QUOTA_WARN_THRESHOLD, default 50)
 *
 * Fail-soft + stub-safe: every DB call is .catch-guarded; with no DATABASE_URL
 * the @sports/db stub returns null and the view degrades to hasData:false —
 * the tile renders an honest "no quota data yet", never a fabricated number.
 */

import { db } from "@sports/db";

/** Default low-quota warning threshold when the env override is unset. */
export const DEFAULT_QUOTA_WARN_THRESHOLD = 50;

export interface OddsQuotaView {
  /** True when at least one IngestionRun row carried quota headers. */
  hasData: boolean;
  /** Requests remaining on the key, from the latest quota-bearing run. */
  remainingRequests: number | null;
  /** Requests used on the key, from the latest quota-bearing run. */
  usedRequests: number | null;
  /** Sport of the run the quota was read from (null = unknown). */
  sport: string | null;
  /** ISO timestamp of when the quota-bearing run started (null = unknown). */
  recordedAt: string | null;
  /** The active warning threshold (env override or default). */
  warnThreshold: number;
  /** True when remaining is known and below the warning threshold. */
  isLow: boolean;
}

/**
 * Resolve the low-quota warning threshold: ODDS_QUOTA_WARN_THRESHOLD when it
 * parses to a non-negative integer, otherwise the default of 50.
 */
export function quotaWarnThreshold(
  raw: string | undefined = process.env["ODDS_QUOTA_WARN_THRESHOLD"]
): number {
  if (raw === undefined || raw.trim() === "") return DEFAULT_QUOTA_WARN_THRESHOLD;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_QUOTA_WARN_THRESHOLD;
  return parsed;
}

/**
 * Pure shaping step: latest quota-bearing run row → tile view model.
 * Exported separately so the threshold/empty-state logic is unit-testable
 * without a DB.
 */
export function buildOddsQuotaView(
  run: {
    sport: string | null;
    startedAt: Date;
    remainingRequests: number | null;
    usedRequests: number | null;
  } | null,
  warnThreshold: number = quotaWarnThreshold()
): OddsQuotaView {
  if (!run || (run.remainingRequests === null && run.usedRequests === null)) {
    return {
      hasData: false,
      remainingRequests: null,
      usedRequests: null,
      sport: null,
      recordedAt: null,
      warnThreshold,
      isLow: false,
    };
  }
  return {
    hasData: true,
    remainingRequests: run.remainingRequests,
    usedRequests: run.usedRequests,
    sport: run.sport,
    recordedAt: run.startedAt.toISOString(),
    warnThreshold,
    isLow: run.remainingRequests !== null && run.remainingRequests < warnThreshold,
  };
}

/**
 * Load the latest quota-bearing IngestionRun and shape it for the tile.
 * Stub-safe and fail-soft: any DB error degrades to the empty view.
 */
export async function loadOddsQuotaView(): Promise<OddsQuotaView> {
  const run = await db.ingestionRun
    .findFirst({
      where: { remainingRequests: { not: null } },
      orderBy: { startedAt: "desc" },
      select: {
        sport: true,
        startedAt: true,
        remainingRequests: true,
        usedRequests: true,
      },
    })
    .catch(() => null);
  return buildOddsQuotaView(run);
}
