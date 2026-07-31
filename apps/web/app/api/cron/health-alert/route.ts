/**
 * Health-alert cron — pages when /api/health would be degraded.
 *
 * Schedule: every 15 minutes (vercel.json).
 * Auth: CRON_SECRET (same as all other crons).
 *
 * Actions (all best-effort, never throw the cron):
 *  1. Evaluate live probes via computeLiveCapabilityProbes()
 *  2. Decide whether to alert (transition or 4h quiet window)
 *  3. If HEALTH_ALERT_WEBHOOK_URL is set, POST a short JSON payload
 *  4. Always return a machine-readable result for logs / external monitors
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

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const started = Date.now();
  const probes = await computeLiveCapabilityProbes();
  const snap = classifyHealthAlertSnapshot(probes);
  const decision = decideHealthAlert(snap, lastState);

  let webhookPosted = false;
  if (decision.shouldAlert) {
    const deploymentSha =
      process.env["VERCEL_GIT_COMMIT_SHA"]?.slice(0, 12) ??
      process.env["GIT_COMMIT_SHA"]?.slice(0, 12) ??
      null;

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
    });

    lastState = {
      lastAlertAt: new Date().toISOString(),
      lastUnhealthy: snap.unhealthy,
      lastReason: snap.reason,
    };

    console.warn(
      `[health-alert] ALERT: ${snap.reason} (webhook=${webhookPosted ? "posted" : "skipped"})`,
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
  });
}
