/**
 * Health-alert cron — pages when /api/health would be degraded.
 *
 * Schedule: every 15 minutes (vercel.json).
 * Auth: CRON_SECRET (same as all other crons).
 *
 * Actions (all best-effort, never throw the cron):
 *  1. Evaluate live probes via computeLiveCapabilityProbes()
 *  2. Decide whether to alert (transition or 4h quiet window)
 *  3. Plan autonomy cycle (pure) — P0 settlement drain, free-spine, gates
 *  4. If HEALTH_ALERT_WEBHOOK_URL is set, POST a short JSON payload (+ autonomy severity)
 *  5. Always return a machine-readable result for logs / external monitors
 *
 * State is process-local (same limitation as free-spine cache). Multi-instance
 * may re-alert within the quiet window on a different isolate — acceptable for
 * v1; external UptimeRobot on /api/health is the zero-code backup.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { computeLiveCapabilityProbes } from "@/lib/health/live-capability-probes";
import {
  classifyHealthAlertSnapshot,
  decideHealthAlert,
  type HealthAlertState,
} from "@/lib/ops/health-alert-decision";
import { loadSettlementHealth, SETTLEMENT_DEFAULT_GRACE_HOURS } from "@/lib/performance/settlement-health";
import { db } from "@sports/db";
import { planAutonomyCycle } from "@/lib/autonomy/operating-kernel";
import { getReadinessGates } from "@sports/prediction-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

let lastState: HealthAlertState = {
  lastAlertAt: null,
  lastUnhealthy: false,
  lastReason: null,
};

async function postWebhook(payload: Record<string, unknown>): Promise<boolean> {
  const url =
    process.env["HEALTH_ALERT_WEBHOOK_URL"]?.trim() ||
    process.env["ALERT_WEBHOOK_URL"]?.trim();
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8_000),
    });
    return res.ok;
  } catch (err) {
    console.warn(
      `[health-alert] webhook failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}

function envFlag(name: string): boolean {
  return process.env[name]?.trim().toLowerCase() === "true";
}

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const started = Date.now();
  const probes = await computeLiveCapabilityProbes();
  const snap = classifyHealthAlertSnapshot(probes);
  const decision = decideHealthAlert(snap, lastState);

  const deploymentSha =
    process.env["VERCEL_GIT_COMMIT_SHA"]?.slice(0, 12) ??
    process.env["GIT_COMMIT_SHA"]?.slice(0, 12) ??
    null;

  // Settlement + gates → autonomy plan (best-effort; never fail the cron)
  let autonomy: ReturnType<typeof planAutonomyCycle> | null = null;
  try {
    const gates = getReadinessGates();
    let settlementBand: "NO_DATA" | "HEALTHY" | "DEGRADED" | "CRITICAL" | "UNKNOWN" = "UNKNOWN";
    let overdue: number | null = null;
    let commenced: number | null = null;
    try {
      const sh = await loadSettlementHealth(db, { graceHours: SETTLEMENT_DEFAULT_GRACE_HOURS });
      settlementBand = sh.health;
      overdue = sh.overduePending;
      commenced = sh.commencedTotal;
    } catch {
      /* probe already covers unavailable */
    }

    autonomy = planAutonomyCycle({
      observedAt: new Date().toISOString(),
      deploymentSha,
      databaseOk: probes.checks["database"]?.status === "ok",
      ingestionOk: probes.checks["ingestion"]?.status === "ok",
      ingestionAgeMinutes: snap.ingestionAgeMinutes,
      settlementBand: snap.settlementUnavailable ? "CRITICAL" : settlementBand,
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
      boardSuppressed: true, // health-alert does not load board; assume conservative
      openPicks: null,
      canonicalSettled: null,
      minSettledForLearning: gates.minSettledPicksForLearning ?? 100,
    });
  } catch (err) {
    console.warn(
      `[health-alert] autonomy plan failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  let webhookPosted = false;
  if (decision.shouldAlert) {
    webhookPosted = await postWebhook({
      type: "gse.health_alert",
      status: snap.unhealthy ? "unhealthy" : "healthy",
      reason: snap.reason,
      decisionReason: decision.reason,
      ingestionAgeMinutes: snap.ingestionAgeMinutes,
      settlementUnavailable: snap.settlementUnavailable,
      checks: probes.checks,
      deploymentSha,
      observedAt: new Date().toISOString(),
      healthUrl: "https://www.galaxysportsedge.com/api/health",
      autonomySeverity: autonomy?.severity ?? null,
      autonomyHeadline: autonomy?.headline ?? null,
      autonomyTopActions: autonomy?.actions.slice(0, 3).map((a) => a.title) ?? [],
    });

    lastState = {
      lastAlertAt: new Date().toISOString(),
      lastUnhealthy: snap.unhealthy,
      lastReason: snap.reason,
    };

    console.warn(
      `[health-alert] ALERT: ${snap.reason} (webhook=${webhookPosted ? "posted" : "skipped"}) ` +
        `autonomy=${autonomy?.severity ?? "n/a"}`,
    );
  } else if (!snap.unhealthy && lastState.lastUnhealthy) {
    // Recovery transition — update state so next degradation re-alerts
    lastState = {
      lastAlertAt: lastState.lastAlertAt,
      lastUnhealthy: false,
      lastReason: "recovered",
    };
    console.info("[health-alert] recovered — status healthy");
  }

  return NextResponse.json({
    ok: true,
    path: "health-alert",
    elapsedMs: Date.now() - started,
    unhealthy: snap.unhealthy,
    shouldAlert: decision.shouldAlert,
    decisionReason: decision.reason,
    snapReason: snap.reason,
    ingestionAgeMinutes: snap.ingestionAgeMinutes,
    settlementUnavailable: snap.settlementUnavailable,
    webhookPosted,
    lastState,
    autonomy: autonomy
      ? {
          version: autonomy.version,
          severity: autonomy.severity,
          headline: autonomy.headline,
          autonomousQueue: autonomy.autonomousQueue.map((a) => ({
            kind: a.kind,
            title: a.title,
            target: a.target,
          })),
          ownerQueue: autonomy.ownerQueue.map((a) => ({
            kind: a.kind,
            title: a.title,
            target: a.target,
          })),
          honestyScore: autonomy.introspection.honestyScore,
          refuseDefaultHeld: autonomy.introspection.refuseDefaultHeld,
          revenueReadiness: autonomy.revenueReadiness,
          learningDirectives: autonomy.learningDirectives,
        }
      : null,
  });
}
