/**
 * Stale-Data Kill Switch — shared freshness gate for the PUBLIC picks surface.
 *
 * Implements CLAUDE.md rule #5 ("no stale data") at the READ boundary. When the
 * `FORCE_NO_BET_IF_STALE` gate is enabled (default ON — see
 * platform-config.ts), the public picks endpoints and board loaders must
 * auto-suppress whenever the odds data is stale, so lifting
 * `PUBLIC_PICKS_ENABLED` cannot expose a stale slate.
 *
 * Single source of truth for "is the public picks surface stale right now?":
 *   - Freshness threshold is `classifyRefreshFreshness` (the shared 240m SLA) —
 *     this module adds NO new threshold and duplicates none of it.
 *   - "Latest successful ingestion" requires a run that actually inserted odds
 *     (status:"SUCCESS" AND oddsInserted > 0), ordered by completedAt desc.
 *     This is intentionally STRICTER than /api/health: an empty-but-200 Odds API
 *     response records a SUCCESS run with oddsInserted=0, which would otherwise
 *     reset the freshness clock and let the picks surface read "fresh" while no
 *     real odds flowed (G4). Only a run that brought in real odds counts.
 *
 * Override contract: callers MUST gate the call to
 * `isPublicPicksSurfaceStale` behind `getReadinessGates().forceNoBetIfStale`.
 * With an explicit false override, this module is not invoked.
 */

import { db } from "@sports/db";
import { classifyRefreshFreshness } from "./refresh-sla";

/**
 * Structured 503 body for a surface darkened by the stale-data kill switch.
 * Deliberately DISTINCT from `bootstrapGateResponse`: during the 2026-07-10
 * incident the stale branch reused the bootstrap body, so from the outside
 * "env flags regressed" and "board dark awaiting fresh data" were
 * indistinguishable — the wrong runbook for either diagnosis. `reason` gives
 * monitors and operators a stable discriminator.
 */
export function staleDataGateResponse(featureName: string): {
  error: string;
  reason: "stale_data";
  bootstrapMode: false;
  hint: string;
} {
  return {
    error: `${featureName} is temporarily dark: awaiting fresh odds data.`,
    reason: "stale_data",
    bootstrapMode: false,
    hint:
      "The stale-data kill switch (FORCE_NO_BET_IF_STALE) suppressed this surface because " +
      "the last odds-inserting ingestion run is older than the Refresh SLA. It reopens " +
      "automatically on the next successful ingestion — check /api/health and recent " +
      "ingestion runs, not the environment flags.",
  };
}

export function backendOutageResponse(featureName: string): {
  error: string;
  reason: "backend_outage";
  bootstrapMode: false;
  hint: string;
} {
  return {
    error: `${featureName} is temporarily unavailable.`,
    reason: "backend_outage",
    bootstrapMode: false,
    hint:
      "The backend read failed. Check /api/health, the database provider, and recent " +
      "deploys. This is not bootstrap gating and no environment flag needs changing.",
  };
}

/**
 * Returns true when the latest successful ingestion run is classified "stale"
 * by the shared Refresh SLA. A never-succeeded pipeline (no SUCCESS run, or a
 * SUCCESS run with no completedAt) classifies as stale — never-fresh is not
 * "ok", matching classifyRefreshFreshness(null).
 *
 * Pure read; performs no writes. Consumers fail closed on a DB error: if the
 * read boundary cannot prove freshness, it must not expose actionable prices.
 *
 * This coarse global check is paired with `getFreshPublicOddsSportKeys` at each
 * public query boundary. The latter prevents one fresh sport from masking a
 * stale sport while allowing genuinely fresh sports to remain visible.
 */
export async function isPublicPicksSurfaceStale(now: Date = new Date()): Promise<boolean> {
  const lastSuccessRun = await db.ingestionRun.findFirst({
    // Requires a run that actually INSERTED ODDS. An empty-but-200 Odds API
    // response is recorded as SUCCESS with oddsInserted=0; without this filter
    // that empty run resets the freshness clock and the public picks surface
    // reads "fresh" while no real odds flowed (G4). oddsInserted > 0 means only
    // a run that brought in real odds counts as fresh.
    where: { status: "SUCCESS", oddsInserted: { gt: 0 } },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true },
  });

  const lastSuccessAt = lastSuccessRun?.completedAt ?? null;
  return classifyRefreshFreshness(lastSuccessAt, now).status === "stale";
}

export async function getFreshPublicOddsSportKeys(
  now: Date = new Date(),
): Promise<Set<string>> {
  const runs = await db.ingestionRun.findMany({
    where: { status: "SUCCESS", oddsInserted: { gt: 0 }, sport: { not: null } },
    orderBy: { completedAt: "desc" },
    distinct: ["sport"],
    select: { sport: true, completedAt: true },
  });

  const freshSportKeys = new Set<string>();
  for (const run of runs) {
    if (
      run.sport &&
      classifyRefreshFreshness(run.completedAt, now).status !== "stale"
    ) {
      freshSportKeys.add(run.sport);
    }
  }
  return freshSportKeys;
}
