/**
 * Vercel cron — settle completed games. Hourly (`20 * * * *`).
 *
 * Law (apps/web/lib/settlement/path-select.ts, since 2026-09-02): the FREE
 * grader runs first on every cycle — ESPN finals plus registered consensus
 * sources, team+date matching, DISPUTED/AMBIGUOUS holds — followed by the
 * stale backfill. When THE_ODDS_API_KEY is present the paid `settleSport`
 * pass runs afterwards as a SUPPLEMENT for anything still PENDING; when it
 * fails (dead key, provider outage) the cycle is still `ok` because the free
 * pass already graded, and the failure is reported in `paidSupplement` and
 * captured to Sentry. `?path=free` skips the supplement. oddsApiRequired is
 * false forever.
 *
 * Why free-first: from 2026-08-24 to 2026-09-02 a deactivated key made the
 * paid branch run alone and throw every hour, so nothing graded for 9 days
 * while ESPN had every final. Ordering the graders by cost-to-fail instead of
 * by key presence removes that failure mode structurally.
 *
 * Auth: Bearer CRON_SECRET. runtime=nodejs · force-dynamic.
 */

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { cronAuthError } from "@/lib/cron/authorize";
import { captureError } from "@/lib/observability/sentry";
import { db } from "@sports/db";
import { SUPPORTED_SPORTS } from "@sports/data-ingestion";
import {
  settleSport,
  freezeSlateCommitments,
  computeScheduledWindow,
  drainPendingTeamGameLogs,
  type SlateFreezeResult,
} from "@sports/ingestion-pipeline";
import { getReadinessGates } from "@sports/prediction-engine";
import {
  drainSettlementOutbox,
  type OutboxDrainSummary,
} from "@/lib/settlement-outbox/worker";
import { runFreePathSettlement } from "@/lib/data-sources/free-settlement-runner";
import { persistFreeScores } from "@/lib/data-sources/free-score-persist";
import { backfillStaleSettlement, type BackfillResult } from "@/lib/data-sources/settle-backfill";
import { hasOddsApiKey, selectSettlementPlan } from "@/lib/settlement/path-select";
import { loadSettlementHealth, SETTLEMENT_DEFAULT_GRACE_HOURS } from "@/lib/performance/settlement-health";
import { drainPendingClvGrades } from "@/lib/settlement/free-path-clv";
import { drainPendingSnapshotOutcomes } from "@/lib/settlement/free-path-snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

/** Per-sport outcome of the paid supplement pass. */
export interface PaidSupplementSportResult {
  readonly sport: string;
  readonly ok: boolean;
  readonly gamesSettled: number;
  readonly picksSettled: number;
  readonly observationsRecorded: number;
  readonly anomaliesOpened: number;
  readonly anomaliesPromoted: number;
  readonly anomaliesResolved: number;
  readonly outboxAppended: number;
  readonly error?: string;
}

export interface PaidSupplementSummary {
  readonly ok: boolean;
  readonly okCount: number;
  readonly totalCount: number;
  readonly failedSports: readonly string[];
  readonly picksSettled: number;
  readonly gamesSettled: number;
  readonly results: readonly PaidSupplementSportResult[];
  readonly clvRepair: { attempted: number; graded: number; noClose: number; failed: number } | null;
  readonly snapshotRepair: { attempted: number; done: number; failed: number } | null;
  readonly teamGameLogRepair: { attempted: number; done: number; failed: number } | null;
}

export async function GET(request: Request) {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const apiKey = process.env["THE_ODDS_API_KEY"]?.trim();
  const url = new URL(request.url);
  const requestedSport = url.searchParams.get("sport");
  // Owner drain: ?path=free skips the paid supplement even when a key is set.
  const forceFree = url.searchParams.get("path") === "free";
  const startedAt = Date.now();
  const gates = getReadinessGates();
  const plan = selectSettlementPlan(apiKey, { forceFree });

  // Settlement is backward-looking (grading games already played) and free —
  // unlike refresh (forward-looking, billed), it must NEVER season-gate.
  // workers/data-refresh/src/index.ts and settle-sport.ts make this contract
  // explicit: refresh uses getInSeasonSports(), settlement always uses
  // SUPPORTED_SPORTS (an MLB World Series game in November must still settle).
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

  // ── 1. Free pass (always first) ────────────────────────────────────────────
  // Snapshot overdue before STP so burn-rate can tell whether this cycle drained the band.
  let priorOverdueCount: number | undefined;
  try {
    const healthBefore = await loadSettlementHealth(db, { graceHours: SETTLEMENT_DEFAULT_GRACE_HOURS });
    priorOverdueCount = healthBefore.overduePending;
  } catch (healthErr) {
    console.warn(
      `[cron:settle-picks] pre-cycle settlement health snapshot failed: ` +
        `${healthErr instanceof Error ? healthErr.message : healthErr}`,
    );
    captureError(healthErr, { path: "settle-picks", stage: "free:health-snapshot" });
  }
  const freeScores = await persistFreeScores({ sportKey: requestedSport });
  const free = await runFreePathSettlement({
    sportKey: requestedSport,
    graceHours: SETTLEMENT_DEFAULT_GRACE_HOURS,
    ...(priorOverdueCount !== undefined ? { priorOverdueCount } : {}),
  });

  // ── 2. Paid supplement (key present, not forced free) ─────────────────────
  // PENDING-scoped like the free pass; grades only what the free pass left.
  let paidSupplement: PaidSupplementSummary | null = null;
  if (plan.paidSupplement && hasOddsApiKey(apiKey)) {
    paidSupplement = await runPaidSupplement(apiKey, sportsToProcess, gates);
  }

  // ── 3. Stale backfill (every published PENDING pick past the 6h grace) ────
  const staleBackfill = await runStaleBackfillSafe("[cron:settle-picks]");

  // ── 4. Slate commitment freeze (hash-chained receipts; no odds key needed) ─
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
    captureError(freezeErr, { path: "settle-picks", stage: "slate-freeze" });
  }

  // ── 5. Alert outbox drain ─────────────────────────────────────────────────
  let alertDrain: OutboxDrainSummary | null = null;
  try {
    alertDrain = await drainSettlementOutbox(db);
  } catch (drainErr) {
    console.warn(
      `[cron:settle-picks] outbox drain failed: ` +
        `${drainErr instanceof Error ? drainErr.message : drainErr}`,
    );
    captureError(drainErr, { path: "settle-picks", stage: "outbox-drain" });
  }

  const advisories: string[] = [];
  if (paidSupplement && paidSupplement.failedSports.length > 0) {
    advisories.push(
      `Paid supplement failed for ${paidSupplement.failedSports.length}/${paidSupplement.totalCount} sport(s) ` +
        `(${paidSupplement.failedSports.join(", ")}). The free pass already graded this cycle; ` +
        `if this repeats every hour THE_ODDS_API_KEY is dead — remove or renew it.`,
    );
  }

  const freeOk = free.sports.every((s) => s.ok);
  // Top-level clvRepair / snapshotRepair / scoreDates / rca for ops
  // (same values also under free.* for the full free-path payload).
  return NextResponse.json({
    ok: freeOk,
    path: plan.label,
    plan,
    oddsApiRequired: false as const,
    elapsedMs: Date.now() - startedAt,
    picksSettled: free.picksSettled + (paidSupplement?.picksSettled ?? 0),
    picksHeld: free.picksHeld,
    clvRepair: free.clvRepair,
    snapshotRepair: free.snapshotRepair,
    teamGameLogRepair: free.teamGameLogRepair,
    scoreDates: free.scoreDates,
    rca: free.rca,
    staleBackfill,
    bootstrapMode: gates.isBootstrapMode,
    free,
    freeScores,
    paidSupplement,
    advisories,
    freeze,
    alertDrain,
    requestedSport: requestedSport ?? null,
  });
}

async function runPaidSupplement(
  apiKey: string,
  sportsToProcess: ReadonlyArray<(typeof SUPPORTED_SPORTS)[number]>,
  gates: ReturnType<typeof getReadinessGates>,
): Promise<PaidSupplementSummary> {
  const results: PaidSupplementSportResult[] = [];
  const scheduledWindow = computeScheduledWindow();

  for (const sport of sportsToProcess) {
    try {
      const result = await settleSport(sport, apiKey, gates, "[cron:settle-picks:paid]", {
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
    } catch (err) {
      // settleSport catches internally and returns status: failed; this guard
      // exists so an unexpected throw in one sport never aborts the others.
      const message = err instanceof Error ? err.message : String(err);
      captureError(err, { path: "settle-picks", stage: "paid:settle-sport", sport: sport.key });
      results.push({
        sport: sport.key,
        ok: false,
        gamesSettled: 0,
        picksSettled: 0,
        observationsRecorded: 0,
        anomaliesOpened: 0,
        anomaliesPromoted: 0,
        anomaliesResolved: 0,
        outboxAppended: 0,
        error: message,
      });
    }
    await new Promise((r) => setTimeout(r, 750));
  }

  const failedSports = results.filter((r) => !r.ok).map((r) => r.sport);
  if (failedSports.length > 0) {
    captureError(new Error(`settle-picks paid supplement failed: ${failedSports.join(", ")}`), {
      path: "settle-picks",
      stage: "paid:supplement-failed",
      failedSports,
    });
  }

  // Repair: complete any PENDING PostSettlementWork rows left by a crash
  // between settleSport()'s enqueue and its inline write (hardening 6.10).
  // The free pass drains these every cycle; the paid pass repeats it so a
  // mid-cycle crash inside the supplement never leaves rows PENDING forever.
  let clvRepair: PaidSupplementSummary["clvRepair"] = null;
  try {
    clvRepair = await drainPendingClvGrades(db as never, { take: 100 });
  } catch (err) {
    console.warn(
      `[cron:settle-picks:paid] CLV repair drain failed: ${err instanceof Error ? err.message : err}`,
    );
    captureError(err, { path: "settle-picks", stage: "paid:clv-repair" });
  }

  let snapshotRepair: PaidSupplementSummary["snapshotRepair"] = null;
  try {
    snapshotRepair = await drainPendingSnapshotOutcomes(db as never, { take: 100 });
  } catch (err) {
    console.warn(
      `[cron:settle-picks:paid] SNAPSHOT repair drain failed: ${err instanceof Error ? err.message : err}`,
    );
    captureError(err, { path: "settle-picks", stage: "paid:snapshot-repair" });
  }

  let teamGameLogRepair: PaidSupplementSummary["teamGameLogRepair"] = null;
  try {
    teamGameLogRepair = await drainPendingTeamGameLogs(db as never, gates, { take: 100 });
  } catch (err) {
    console.warn(
      `[cron:settle-picks:paid] TEAM_GAME_LOG repair drain failed: ${err instanceof Error ? err.message : err}`,
    );
    captureError(err, { path: "settle-picks", stage: "paid:team-game-log-repair" });
  }

  const okCount = results.filter((r) => r.ok).length;
  return {
    ok: okCount === results.length,
    okCount,
    totalCount: results.length,
    failedSports,
    picksSettled: results.reduce((sum, r) => sum + r.picksSettled, 0),
    gamesSettled: results.reduce((sum, r) => sum + r.gamesSettled, 0),
    results,
    clvRepair,
    snapshotRepair,
    teamGameLogRepair,
  };
}

async function runStaleBackfillSafe(logPrefix: string): Promise<BackfillResult | { error: string }> {
  try {
    return await backfillStaleSettlement({ db: db as never });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`${logPrefix} stale backfill failed: ${message}`);
    captureError(err, { path: "settle-picks", stage: "stale-backfill" });
    return { error: message };
  }
}
