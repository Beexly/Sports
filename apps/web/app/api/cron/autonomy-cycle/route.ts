/**
 * Autonomy cycle cron — plan + optional execute of autonomousSafe actions.
 *
 * Schedule: every 15 minutes (vercel.json), offset from health-alert.
 * Auth: CRON_SECRET.
 *
 * Default: dry-run plan only (safe). Set AUTONOMY_EXECUTE=true to invoke
 * free-spine-health / settle-picks when the pure planner queues them.
 * Never flips LAWS. Never runs ownerQueue items.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { computeLiveCapabilityProbes } from "@/lib/health/live-capability-probes";
import { classifyHealthAlertSnapshot } from "@/lib/ops/health-alert-decision";
import {
  loadSettlementHealth,
  SETTLEMENT_DEFAULT_GRACE_HOURS,
} from "@/lib/performance/settlement-health";
import { db } from "@sports/db";
import { planAutonomyCycle } from "@/lib/autonomy/operating-kernel";
import {
  executeAutonomyCycle,
  resolveAutonomyBaseUrl,
} from "@/lib/autonomy/execute-autonomy-cycle";
import { getReadinessGates } from "@sports/prediction-engine";
import {
  freeSpineSnapAgeMs,
  resolveBestFreeSpineSnapshot,
} from "@/lib/data-sources/free-spine-durable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function envFlag(name: string): boolean {
  return process.env[name]?.trim().toLowerCase() === "true";
}

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const started = Date.now();
  const url = new URL(request.url);
  const forceExecute = url.searchParams.get("execute") === "1";
  const forceDry = url.searchParams.get("dryRun") === "1";
  const executeEnabled = forceExecute || (envFlag("AUTONOMY_EXECUTE") && !forceDry);
  const dryRun = !executeEnabled;

  const deploymentSha =
    process.env["VERCEL_GIT_COMMIT_SHA"]?.slice(0, 12) ??
    process.env["GIT_COMMIT_SHA"]?.slice(0, 12) ??
    null;

  const probes = await computeLiveCapabilityProbes();
  const snap = classifyHealthAlertSnapshot(probes);

  let settlementBand: "NO_DATA" | "HEALTHY" | "DEGRADED" | "CRITICAL" | "UNKNOWN" =
    "UNKNOWN";
  let overdue: number | null = null;
  let commenced: number | null = null;
  try {
    const sh = await loadSettlementHealth(db, {
      graceHours: SETTLEMENT_DEFAULT_GRACE_HOURS,
    });
    settlementBand = sh.health;
    overdue = sh.overduePending;
    commenced = sh.commencedTotal;
  } catch (err) {
    console.warn(
      `[autonomy-cycle] settlement health failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  const gates = getReadinessGates();

  // I3/I8: best free-spine age (fresh process, else fresher of process|durable)
  let freeSpineAgeMinutes: number | null = null;
  let freeSpineSource: "process" | "durable" | "none" = "none";
  try {
    const resolved = await resolveBestFreeSpineSnapshot();
    freeSpineSource = resolved.source;
    const ageMs = freeSpineSnapAgeMs(resolved.snap);
    freeSpineAgeMinutes = ageMs == null ? null : Math.round(ageMs / 60000);
  } catch {
    freeSpineAgeMinutes = null;
    freeSpineSource = "none";
  }

  const observation = {
    observedAt: new Date().toISOString(),
    deploymentSha,
    databaseOk: probes.checks["database"]?.status === "ok",
    ingestionOk: probes.checks["ingestion"]?.status === "ok",
    ingestionAgeMinutes: snap.ingestionAgeMinutes,
    freeSpineAgeMinutes,
    settlementBand: snap.settlementUnavailable ? ("CRITICAL" as const) : settlementBand,
    settlementOverdue: overdue,
    settlementCommenced: commenced,
    topRcaCause: null,
    rcaHeadline: null,
    stpAutoEligible: null,
    stpExceptions: null,
    burnDraining: null,
    liveBoardEnabled: envFlag("LIVE_BOARD"),
    publicPicksEnabled: envFlag("PUBLIC_PICKS_ENABLED"),
    performanceStatsEnabled: envFlag("PERFORMANCE_STATS_ENABLED"),
    publishLedgerEnabled: envFlag("PUBLISH_LEDGER"),
    draftOnly: !envFlag("LIVE_BOARD"),
    boardSuppressed: true,
    openPicks: null,
    canonicalSettled: null,
    minSettledForLearning: gates.minSettledPicksForLearning ?? 100,
  };

  const plan = planAutonomyCycle(observation);
  const cronSecret = process.env["CRON_SECRET"]?.trim() ?? "";

  const cycle = await executeAutonomyCycle({
    plan,
    baseUrl: resolveAutonomyBaseUrl(),
    cronSecret,
    dryRun,
    maxActions: 2,
  });

  if (cycle.failedCount > 0) {
    console.warn(
      `[autonomy-cycle] failures=${cycle.failedCount} severity=${cycle.plannedSeverity} dryRun=${dryRun}`,
    );
  } else {
    console.info(
      `[autonomy-cycle] severity=${cycle.plannedSeverity} executed=${cycle.executedCount} dryRun=${dryRun}`,
    );
  }

  return NextResponse.json({
    ok: true,
    path: "autonomy-cycle",
    elapsedMs: Date.now() - started,
    dryRun,
    executeEnabled,
    observation: {
      ingestionAgeMinutes: observation.ingestionAgeMinutes,
      freeSpineAgeMinutes: observation.freeSpineAgeMinutes,
      freeSpineSource,
      settlementBand: observation.settlementBand,
      settlementOverdue: observation.settlementOverdue,
      databaseOk: observation.databaseOk,
      ingestionOk: observation.ingestionOk,
    },
    plan: {
      severity: plan.severity,
      headline: plan.headline,
      honestyScore: plan.introspection.honestyScore,
      refuseDefaultHeld: plan.introspection.refuseDefaultHeld,
      autonomousQueue: plan.autonomousQueue.map((a) => ({
        kind: a.kind,
        title: a.title,
        target: a.target,
      })),
      ownerQueue: plan.ownerQueue.map((a) => ({
        kind: a.kind,
        title: a.title,
        target: a.target,
      })),
    },
    cycle,
  });
}
