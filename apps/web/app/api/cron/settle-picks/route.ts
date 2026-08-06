/**
 * Vercel cron — settle completed games.
 *
 * Path A (paid scores): THE_ODDS_API_KEY present → settleSport (externalId match).
 * Path B (free scores): key missing → free-settlement-runner (ESPN + henrygd,
 *   team+date match, DISPUTED holds). oddsApiRequired=false forever on path B.
 *
 * Auth: Bearer CRON_SECRET. runtime=nodejs · force-dynamic.
 */

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { cronAuthError } from "@/lib/cron/authorize";
import { db } from "@sports/db";
import { SUPPORTED_SPORTS } from "@sports/data-ingestion";
import {
  settleSport,
  freezeSlateCommitments,
  computeScheduledWindow,
  type SlateFreezeResult,
} from "@sports/ingestion-pipeline";
import { getReadinessGates } from "@sports/prediction-engine";
import {
  drainSettlementOutbox,
  type OutboxDrainSummary,
} from "@/lib/settlement-outbox/worker";
import { runFreePathSettlement } from "@/lib/data-sources/free-settlement-runner";
import { persistFreeScores } from "@/lib/data-sources/free-score-persist";
import { hasOddsApiKey } from "@/lib/settlement/path-select";
import { loadSettlementHealth } from "@/lib/performance/settlement-health";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

export async function GET(request: Request) {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const apiKey = process.env["THE_ODDS_API_KEY"]?.trim();
  const requestedSport = new URL(request.url).searchParams.get("sport");
  const startedAt = Date.now();
  const gates = getReadinessGates();
  // ── Free path: no paid Odds key required ─────────────────────────────────
  // Negated type guard, so `apiKey` narrows to `string` for the paid path below.
  if (!hasOddsApiKey(apiKey)) {
    // Snapshot overdue before STP so burn-rate can tell whether this cycle drained the band.
    let priorOverdueCount: number | undefined;
    try {
      const healthBefore = await loadSettlementHealth(db, { graceHours: 6 });
      priorOverdueCount = healthBefore.overduePending;
    } catch (healthErr) {
      console.warn(
        `[cron:settle-picks:free] pre-cycle settlement health snapshot failed: ` +
          `${healthErr instanceof Error ? healthErr.message : healthErr}`,
      );
    }
    const freeScores = await persistFreeScores({ sportKey: requestedSport });
    const free = await runFreePathSettlement({
      sportKey: requestedSport,
      graceHours: 6,
      ...(priorOverdueCount !== undefined ? { priorOverdueCount } : {}),
    });

    let alertDrain: OutboxDrainSummary | null = null;
    try {
      alertDrain = await drainSettlementOutbox(db);
    } catch (drainErr) {
      console.warn(
        `[cron:settle-picks:free] outbox drain failed: ` +
          `${drainErr instanceof Error ? drainErr.message : drainErr}`,
      );
    }
    // Top-level clvRepair / snapshotRepair / scoreDates / rca for ops
    // (same values also under free.* for full free-path payload).
    return NextResponse.json({
      ok: free.sports.every((s) => s.ok),
      path: "free" as const,
      oddsApiRequired: false as const,
      elapsedMs: Date.now() - startedAt,
      picksSettled: free.picksSettled,
      picksHeld: free.picksHeld,
      clvRepair: free.clvRepair,
      snapshotRepair: free.snapshotRepair,
      scoreDates: free.scoreDates,
      rca: free.rca,
      bootstrapMode: gates.isBootstrapMode,
      free,
      freeScores,
      alertDrain,
      requestedSport: requestedSport ?? null,
    });
  }

  // ── Paid path (enrichment scores via Odds API) ───────────────────────────
  const sportsToProcess = requestedSport
    ? SUPPORTED_SPORTS.filter((sport) => sport.key === requestedSport)
    : SUPPORTED_SPORTS;

  if (requestedSport && sportsToProcess.length === 0) {
    return NextResponse.json(
      {
        error: "Unsupported sport",
        sport: requestedSport,
        supportedSports: SUPPORTED_SPORTS.map((sport) => sport.key),
      },
      { status: 400 },
    );
  }

  const results: Array<{
    sport: string;
    ok: boolean;
    gamesSettled: number;
    picksSettled: number;
    observationsRecorded: number;
    anomaliesOpened: number;
    anomaliesPromoted: number;
    anomaliesResolved: number;
    outboxAppended: number;
    error?: string;
  }> = [];

  const scheduledWindow = computeScheduledWindow();

  for (const sport of sportsToProcess) {
    const result = await settleSport(sport, apiKey, gates, "[cron:settle-picks]", {
      scheduledWindow,
    });
    results.push({
      sport: result.sport,
      ok: result.status === "success",
      gamesSettled: result.gamesSettled,
      picksSettled: result.picksSettled,
      observationsRecorded: result.observationsRecorded,
      anomaliesOpened: result.anomaliesOpened,
      anomaliesPromoted: result.anomaliesPromoted,
      anomaliesResolved: result.anomaliesResolved,
      outboxAppended: result.outboxAppended,
      ...(result.error ? { error: result.error } : {}),
    });
    await new Promise((r) => setTimeout(r, 750));
  }

  let freeze: SlateFreezeResult[] = [];
  try {
    freeze = await freezeSlateCommitments(
      sportsToProcess.map((sport) => sport.key),
      new Date(),
      (input: string) => createHash("sha256").update(input, "utf8").digest("hex"),
      "[cron:settle-picks]",
    );
  } catch (freezeErr) {
    console.warn(
      `[cron:settle-picks] slate commitment freeze pass failed: ` +
        `${freezeErr instanceof Error ? freezeErr.message : freezeErr}`,
    );
  }

  let alertDrain: OutboxDrainSummary | null = null;
  try {
    alertDrain = await drainSettlementOutbox(db);
  } catch (drainErr) {
    console.warn(
      `[cron:settle-picks] post-settlement outbox drain failed: ` +
        `${drainErr instanceof Error ? drainErr.message : drainErr}`,
    );
  }

  const okCount = results.filter((r) => r.ok).length;
  return NextResponse.json({
    ok: okCount === results.length,
    path: "odds-api" as const,
    oddsApiRequired: false as const,
    elapsedMs: Date.now() - startedAt,
    okCount,
    totalCount: results.length,
    gamesSettled: results.reduce((sum, r) => sum + r.gamesSettled, 0),
    picksSettled: results.reduce((sum, r) => sum + r.picksSettled, 0),
    observationsRecorded: results.reduce((sum, r) => sum + r.observationsRecorded, 0),
    anomaliesOpened: results.reduce((sum, r) => sum + r.anomaliesOpened, 0),
    anomaliesPromoted: results.reduce((sum, r) => sum + r.anomaliesPromoted, 0),
    anomaliesResolved: results.reduce((sum, r) => sum + r.anomaliesResolved, 0),
    outboxAppended: results.reduce((sum, r) => sum + r.outboxAppended, 0),
    requestedSport: requestedSport ?? null,
    bootstrapMode: gates.isBootstrapMode,
    results,
    freeze,
    alertDrain,
  });
}
