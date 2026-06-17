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
 *   - "Latest successful ingestion" is the SAME query `/api/health` uses:
 *     db.ingestionRun.findFirst({ where: { status: "SUCCESS" },
 *                                 orderBy: { completedAt: "desc" } }).
 *
 * Default-off contract: callers MUST gate the call to
 * `isPublicPicksSurfaceStale` behind `getReadinessGates().forceNoBetIfStale`.
 * With the flag off, this module is never invoked and behavior is byte-for-byte
 * identical to before it existed.
 */

import { db } from "@sports/db";
import { classifyRefreshFreshness } from "./refresh-sla";

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
 */
export async function isPublicPicksSurfaceStale(now: Date = new Date()): Promise<boolean> {
  const lastSuccessRun = await db.ingestionRun.findFirst({
    where: { status: "SUCCESS" },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true },
  });

  const lastSuccessAt = lastSuccessRun?.completedAt ?? null;
  return classifyRefreshFreshness(lastSuccessAt, now).status === "stale";
}
