/**
 * Health-alert cron — pages when /api/health would be degraded.
 *
 * Schedule: every 15 minutes (vercel.json).
 * Auth: CRON_SECRET (same as all other crons).
 *
 * Actions (all best-effort, never throw the cron):
 *  1. Evaluate live probes via computeLiveCapabilityProbes()
 *  2. Decide whether to alert (stateless escalation ladder — see health-alert-decision)
 *  3. Plan autonomy cycle (pure) — P0 settlement drain, free-spine, gates
 *  4. If HEALTH_ALERT_WEBHOOK_URL is set, POST a short JSON payload (+ autonomy severity)
 *  5. Always return a machine-readable result for logs / external monitors
 *
 * NO PROCESS-LOCAL STATE. This used to hold `lastState` in a module-level `let`,
 * which a serverless cold start silently reset — every tick then looked like a
 * fresh healthy->unhealthy transition, so the 4h quiet window never actually held
 * in production. The decision is now derived from observables (ingestion age and
 * wall clock); see the ladder note in lib/ops/health-alert-decision.ts.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { computeLiveCapabilityProbes } from "@/lib/health/live-capability-probes";
import {
  classifyHealthAlertSnapshot,
  decideHealthAlertStateless,
  assessOddsQuota,
} from "@/lib/ops/health-alert-decision";
import { loadActiveCalibrationDrift } from "@/lib/ops/calibration-eligibility-durable";
import { loadSettlementHealth, SETTLEMENT_DEFAULT_GRACE_HOURS } from "@/lib/performance/settlement-health";
import { db } from "@sports/db";
import {
  loadOddsCreditTruthOutcome,
  emptyOddsCreditTruth,
  type OddsCreditLedgerDb,
} from "@sports/data-ingestion";
import { isLowQuota, checkArchiveStaleness } from "@sports/ingestion-pipeline";
import { planAutonomyCycle } from "@/lib/autonomy/operating-kernel";
import { getReadinessGates } from "@sports/prediction-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Outcome of an alert delivery attempt.
 *
 * `configured` is reported separately from `delivered` on purpose. The previous
 * shape returned a bare `false` for both "no webhook URL set" and "the POST
 * failed", so a production deployment with no alerting configured at all was
 * indistinguishable in the logs and the JSON from one that was healthy. A
 * monitor that cannot page anyone, and does not say so, is worse than no
 * monitor — it manufactures confidence. Now the caller can tell them apart.
 */
type WebhookOutcome = {
  readonly configured: boolean;
  readonly delivered: boolean;
  readonly status: number | null;
  readonly error: string | null;
};

/**
 * Human-readable one-liner carried alongside the structured fields.
 *
 * Discord rejects a payload with no `content`/`embeds`, and Slack rejects one
 * with no `text`/`blocks` — both with a 400. The old payload had neither, so the
 * two most likely webhook targets a solo operator would reach for could not work
 * even once the URL was set. Both keys are cheap; carrying them makes one URL
 * work for Discord, Slack, or ntfy without a per-vendor branch here.
 */
function summarize(input: {
  unhealthy: boolean;
  reason: string;
  decisionReason: string;
  ingestionAgeMinutes: number | null;
  deploymentSha: string | null;
  autonomySeverity: string | null;
}): string {
  const head = input.unhealthy ? "🔴 GSE UNHEALTHY" : "🟢 GSE recovered";
  const age =
    input.ingestionAgeMinutes === null ? "n/a" : `${input.ingestionAgeMinutes}m`;
  const line = [
    head,
    `reason: ${input.reason}`,
    `ingestion age: ${age}`,
    `severity: ${input.autonomySeverity ?? "n/a"}`,
    `deploy: ${input.deploymentSha ?? "unknown"}`,
    `trigger: ${input.decisionReason}`,
    "https://www.galaxysportsedge.com/api/health",
  ].join("\n");
  // Discord hard-caps `content` at 2000 characters and 400s past it.
  return line.length > 1800 ? `${line.slice(0, 1797)}...` : line;
}

async function postWebhook(payload: Record<string, unknown>): Promise<WebhookOutcome> {
  const url =
    process.env["HEALTH_ALERT_WEBHOOK_URL"]?.trim() ||
    process.env["ALERT_WEBHOOK_URL"]?.trim();
  if (!url) return { configured: false, delivered: false, status: null, error: null };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8_000),
    });
    return {
      configured: true,
      delivered: res.ok,
      status: res.status,
      error: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.warn(`[health-alert] webhook failed: ${error}`);
    return { configured: true, delivered: false, status: null, error };
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
  // Post-publish calibration drift marker (durable, read-only here). The loader
  // swallows its own errors and returns null in stub mode; the extra guard keeps
  // a thrown rejection from taking the health cron down with it.
  const calibrationDrift = await loadActiveCalibrationDrift().catch(() => null);

  // F1: a quota that could not be READ is not a quota that is fine.
  // `loadOddsCreditTruth` cannot distinguish "empty ledger" from "database
  // down" (both are remaining=null), so reporting its boolean reported
  // oddsApiLowQuota=false straight through a total outage. Read the outcome,
  // keep the reading three-state, and let it reach the classifier.
  // The guard keeps this route's "never throw the cron" promise: an unexpected
  // throw becomes an UNREADABLE quota (red), never a fine one (green).
  const creditOutcome = await loadOddsCreditTruthOutcome(
    db as unknown as OddsCreditLedgerDb,
    new Date(),
  ).catch((err: unknown) => ({
    truth: emptyOddsCreditTruth(),
    readFailed: true,
    error: err instanceof Error ? err.message : String(err),
  }));
  const credits = creditOutcome.truth;
  if (creditOutcome.readFailed) {
    console.warn(
      `[health-alert] odds credit ledger unreadable: ${creditOutcome.error ?? "unknown error"}; ` +
        "reporting quota as UNMEASURABLE, not fine",
    );
  }
  const oddsQuota = assessOddsQuota({
    remaining: credits.remaining,
    readFailed: creditOutcome.readFailed,
    lowQuotaWhenMeasured: isLowQuota({ oddsApiRemainingRequests: credits.remaining }),
  });
  // Tri-state: null when unmeasurable, so this can no longer be read as "fine".
  const oddsApiLowQuota = oddsQuota.lowQuota;

  const snap = classifyHealthAlertSnapshot({
    checks: probes.checks,
    capabilities: probes.capabilities,
    calibrationDrift,
    quota: oddsQuota,
  });
  const decision = decideHealthAlertStateless(snap);

  const deploymentSha =
    process.env["VERCEL_GIT_COMMIT_SHA"]?.slice(0, 12) ??
    process.env["GIT_COMMIT_SHA"]?.slice(0, 12) ??
    null;

  // Line-archive write freshness (GSE-MON-012). This monitor was written FOR the
  // 2026-08-22 -> 2026-09-13 outage, where the archive died for 21 days because
  // the writer's Prisma filter was wrong and its catch swallowed the error. It
  // carried 36 passing tests and ZERO callers, so the alarm for that outage was
  // never actually armed. Run it here, every tick.
  //
  // Best-effort, and fail-visible: a read that throws must NOT read as healthy,
  // so an unreadable monitor reports isStale with the reason, never an all-clear.
  let archiveStaleness: {
    isStale: boolean;
    writesInWindow: number;
    lastWriteAt: string | null;
    windowHours: number;
    alerted: boolean;
    reason: string;
  };
  try {
    const r = await checkArchiveStaleness({ db: db as never, env: process.env });
    archiveStaleness = {
      isStale: r.isStale,
      writesInWindow: r.writesInWindow,
      lastWriteAt: r.lastWriteAt ? r.lastWriteAt.toISOString() : null,
      windowHours: r.windowHours,
      alerted: r.alerted,
      reason: r.reason,
    };
  } catch (err) {
    archiveStaleness = {
      isStale: true,
      writesInWindow: 0,
      lastWriteAt: null,
      windowHours: 6,
      alerted: false,
      reason: `archive staleness monitor could not be read: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

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

  const observedAt = new Date().toISOString();
  let webhook: WebhookOutcome = {
    configured: false,
    delivered: false,
    status: null,
    error: null,
  };

  if (decision.shouldAlert) {
    const summary = summarize({
      unhealthy: snap.unhealthy,
      reason: snap.reason,
      decisionReason: decision.reason,
      ingestionAgeMinutes: snap.ingestionAgeMinutes,
      deploymentSha,
      autonomySeverity: autonomy?.severity ?? null,
    });

    webhook = await postWebhook({
      // Vendor-compatible keys first: `content` for Discord, `text` for Slack.
      // ntfy ignores both and renders the body, so one URL serves all three.
      content: summary,
      text: summary,
      // Structured fields retained verbatim for machine consumers.
      type: "gse.health_alert",
      status: snap.unhealthy ? "unhealthy" : "healthy",
      reason: snap.reason,
      decisionReason: decision.reason,
      ingestionAgeMinutes: snap.ingestionAgeMinutes,
      settlementUnavailable: snap.settlementUnavailable,
      lineArchiveStaleness: archiveStaleness,
      calibrationDrift: calibrationDrift
        ? {
            since: calibrationDrift.since,
            previousStatus: calibrationDrift.previousStatus,
            currentStatus: calibrationDrift.currentStatus,
            failingFloors: calibrationDrift.failingFloors,
          }
        : null,
      checks: probes.checks,
      deploymentSha,
      observedAt,
      healthUrl: "https://www.galaxysportsedge.com/api/health",
      autonomySeverity: autonomy?.severity ?? null,
      autonomyHeadline: autonomy?.headline ?? null,
      autonomyTopActions: autonomy?.actions.slice(0, 3).map((a) => a.title) ?? [],
      oddsApiRemainingRequests: credits.remaining,
      // null (not false) when the quota could not be read. A consumer doing
      // `if (oddsApiLowQuota === false) ...` sees the difference; one reading
      // it as a boolean sees null, which is honest rather than reassuring.
      oddsApiLowQuota,
      oddsApiQuota: oddsQuota,
    });

    if (!webhook.configured) {
      // Escalated from silence to console.error: an alert fired and reached
      // nobody. This is a monitoring outage in its own right and must be
      // greppable, not inferred from a missing line.
      console.error(
        "[health-alert] BLIND: alert fired but no webhook configured " +
          "(set HEALTH_ALERT_WEBHOOK_URL or ALERT_WEBHOOK_URL). " +
          `reason=${snap.reason}`,
      );
    } else if (!webhook.delivered) {
      console.error(
        `[health-alert] UNDELIVERED: webhook rejected the alert (${webhook.error}). reason=${snap.reason}`,
      );
    }

    console.warn(
      `[health-alert] ALERT: ${snap.reason} (webhook=${webhook.delivered ? "delivered" : webhook.configured ? "failed" : "unconfigured"}) ` +
        `autonomy=${autonomy?.severity ?? "n/a"}`,
    );
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
    calibrationDrift: calibrationDrift
      ? {
          since: calibrationDrift.since,
          previousStatus: calibrationDrift.previousStatus,
          currentStatus: calibrationDrift.currentStatus,
          failingFloors: calibrationDrift.failingFloors,
        }
      : null,
    webhookConfigured: webhook.configured,
    webhookPosted: webhook.delivered,
    webhookStatus: webhook.status,
    webhookError: webhook.error,
    // True whenever an alert fired and reached nobody — the single field an
    // external monitor should watch to detect that alerting itself is down.
    alertDeliveryFailed: decision.shouldAlert && !webhook.delivered,
    observedAt,
    oddsApiRemainingRequests: credits.remaining,
    oddsApiLowQuota,
    // The full three-state reading: whether the quota was measurable at all,
    // and whether the ledger read failed. `oddsApiLowQuota: false` alone can
    // no longer be mistaken for "quota checked out fine".
    oddsApiQuota: oddsQuota,
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
