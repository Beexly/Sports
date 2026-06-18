/**
 * Vercel cron — stale-ingestion check (B1).
 *
 * Runs per-source freshness detection over the supported sports' ingestion
 * history and, for any source that is stale beyond the shared 4h threshold (or
 * in an UNKNOWN state — never seen a successful run), files a DEDUPED
 * CockpitTask assigned to the TAL data-reliability agent. Those tasks then
 * surface automatically in the Daily Command Approval Queue (which reads
 * CockpitTask rows) — this route does not touch that lane.
 *
 * Why per-sport: ingestion runs are recorded per sport (`IngestionRun.sport`),
 * so "a source" here is a sport's odds pipeline. A run only counts as a fresh
 * success if it actually inserted odds (`status:"SUCCESS"` AND
 * `oddsInserted > 0`) — an empty-but-200 Odds API response is a SUCCESS with
 * `oddsInserted=0` and must NOT reset the freshness clock (same G4 rule the
 * public-freshness gate enforces).
 *
 * Critical sources: a source is flagged CRITICAL when its sport is currently
 * IN SEASON (`isSportInSeason`) — an in-season major going stale is the case
 * that actually hurts the slate. Off-season staleness is expected and stays
 * HIGH (not CRITICAL).
 *
 * DEDUP: `persistStaleIngestionTask` keys on the CockpitTask `source` column
 * (`stale-ingestion:<sourceId>:<class>`) and skips creation when an open
 * (non-ARCHIVED/non-APPROVED) task already exists for the same source+class.
 *
 * Authentication: Vercel invokes with `Authorization: Bearer <CRON_SECRET>`
 * via the shared `cronAuthError` helper (constant-time compare).
 *
 * Idempotent + never-throw at the route boundary: any unexpected error is
 * caught and returned as a 500 JSON envelope (logged), never an unhandled throw.
 *
 * HONESTY: writes real CockpitTask rows only. Flips no gate, settles nothing,
 * touches no public surface.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { db } from "@sports/db";
import { SUPPORTED_SPORTS, isSportInSeason } from "@sports/data-ingestion";
import { detectStaleSource } from "@/lib/data-reliability/stale-data-detector";
import { summarizeIngestionHealth } from "@/lib/data-reliability/ingestion-health";
import {
  persistStaleIngestionTask,
  type StaleTaskResult,
} from "@/lib/data-reliability/stale-ingestion-task-writer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Stale threshold in hours — mirrors stale-data-detector default + Refresh SLA. */
const THRESHOLD_HOURS = 4;

export async function GET(request: Request) {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const startedAt = Date.now();
  const nowDate = new Date();
  const nowIso = nowDate.toISOString();

  try {
    const taskResults: StaleTaskResult[] = [];
    const sourceStatuses = [];

    for (const sport of SUPPORTED_SPORTS) {
      // Latest run that actually inserted odds — an empty SUCCESS does not
      // reset the freshness clock (G4).
      const lastSuccess = await db.ingestionRun.findFirst({
        where: { sport: sport.key, status: "SUCCESS", oddsInserted: { gt: 0 } },
        orderBy: { completedAt: "desc" },
        select: { completedAt: true },
      });

      const status = detectStaleSource(
        {
          sourceId: sport.key,
          lastSuccessAt: lastSuccess?.completedAt?.toISOString() ?? null,
          now: nowIso,
          critical: isSportInSeason(sport.key, nowDate),
        },
        THRESHOLD_HOURS,
      );
      sourceStatuses.push(status);

      const result = await persistStaleIngestionTask(db, status);
      taskResults.push(result);
    }

    const stale = sourceStatuses.filter((s) => s.status !== "FRESH").length;
    const created = taskResults.filter((r) => r.outcome === "created").length;
    const deduped = taskResults.filter((r) => r.outcome === "deduped").length;

    return NextResponse.json({
      ok: true,
      elapsedMs: Date.now() - startedAt,
      checked: sourceStatuses.length,
      stale,
      created,
      deduped,
      health: summarizeIngestionHealth(sourceStatuses),
      results: taskResults,
    });
  } catch (error) {
    // Never throw at the route boundary — log and return a 500 JSON envelope.
    console.error("[cron:stale-ingestion-check] failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: "stale-ingestion-check failed",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
