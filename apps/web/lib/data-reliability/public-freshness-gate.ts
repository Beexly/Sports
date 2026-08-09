/**
 * Stale-Data Kill Switch — shared freshness gate for the PUBLIC picks surface.
 *
 * Implements CLAUDE.md rule #5 ("no stale data") at the READ boundary. When the
 * `FORCE_NO_BET_IF_STALE` gate is enabled (default OFF — see
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
 * Default-off contract: callers MUST gate the call to
 * `isPublicPicksSurfaceStale` behind `getReadinessGates().forceNoBetIfStale`.
 * With the flag off, this module is never invoked and behavior is byte-for-byte
 * identical to before it existed.
 */

import { db } from "@sports/db";
import { classifyRefreshFreshness } from "./refresh-sla";
import { resolveBoardSurface } from "@/lib/board/board-surface-policy";

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
  boardSurface: "market" | "signal";
  hint: string;
} {
  const surface = resolveBoardSurface();
  if (surface === "signal") {
    return {
      error: `${featureName} is temporarily dark: quiet board / awaiting fresh model slate.`,
      reason: "stale_data",
      bootstrapMode: false,
      boardSurface: "signal",
      hint:
        "Signal board quiet: no recent published non-seed picks within the Refresh SLA. " +
        "This is not a book-odds outage. Model signals only — never labeled as book lines. " +
        "Reopens when generate-drafts / settle pipeline publishes a fresh slate.",
    };
  }
  return {
    error: `${featureName} is temporarily dark: quiet board / awaiting fresh odds.`,
    reason: "stale_data",
    bootstrapMode: false,
    boardSurface: "market",
    hint:
      "Market board quiet: last odds-inserting run older than Refresh SLA. " +
      "Reopens on next successful odds insert (oddsInserted>0). Do not lower the SLA. " +
      "Set PUBLIC_BOARD_SURFACE=signal for model-signal board (slate-fresh, not book lines).",
  };
}

/**
 * Returns true when the latest successful ingestion run is classified "stale"
 * by the shared Refresh SLA. A never-succeeded pipeline (no SUCCESS run, or a
 * SUCCESS run with no completedAt) classifies as stale — never-fresh is not
 * "ok", matching classifyRefreshFreshness(null).
 *
 * Pure read; performs no writes. On a DB error it is the caller's
 * responsibility to decide fail-open vs fail-closed (consumers below fail OPEN
 * — i.e. do not suppress — so a transient DB blip can't black out a fresh
 * surface; freshness is also enforced separately by /api/health).
 *
 * KNOWN LIMITATION (tracked enhancement — per-sport freshness):
 * This uses the GLOBAL latest successful IngestionRun, but ingestion runs are
 * per-sport. If one in-season sport's ingestion fails past the SLA while
 * another sport keeps succeeding, the global SUCCESS masks the stale sport —
 * and that sport's picks could remain visible on the public surface. A
 * per-sport freshness check (suppress only the stale sport's picks) is a
 * planned follow-up; this global check is intentionally the coarse first cut.
 */
/** Market board: last odds-inserting SUCCESS within Refresh SLA. */
export async function isMarketBoardOddsStale(now: Date = new Date()): Promise<boolean> {
  const lastSuccessRun = await db.ingestionRun.findFirst({
    where: { status: "SUCCESS", oddsInserted: { gt: 0 } },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true },
  });
  const lastSuccessAt = lastSuccessRun?.completedAt ?? null;
  return classifyRefreshFreshness(lastSuccessAt, now).status === "stale";
}

/**
 * Signal board: slate/pick generation freshness (published non-bootstrap pick).
 * Does NOT use odds inserts. Never certifies book lines.
 */
export async function isSignalBoardSlateStale(now: Date = new Date()): Promise<boolean> {
  const lastPick = await db.pick.findFirst({
    where: {
      isPublished: true,
      isBootstrap: false,
      NOT: { modelVersion: "v5.0.0-seed" },
    },
    orderBy: { generatedAt: "desc" },
    select: { generatedAt: true },
  });
  const lastAt = lastPick?.generatedAt ?? null;
  return classifyRefreshFreshness(lastAt, now).status === "stale";
}

/**
 * Public picks surface stale check — dual mode via PUBLIC_BOARD_SURFACE.
 * market (default): oddsInserted>0 SLA
 * signal: published pick generation SLA
 */
export async function isPublicPicksSurfaceStale(now: Date = new Date()): Promise<boolean> {
  const surface = resolveBoardSurface();
  if (surface === "signal") {
    return isSignalBoardSlateStale(now);
  }
  return isMarketBoardOddsStale(now);
}
