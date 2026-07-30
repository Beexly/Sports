/**
 * Vercel cron — settle completed games.
 *
 * Grades finished games on Vercel's scheduled-function infrastructure so the
 * operator doesn't have to keep a long-running worker box alive just to settle
 * picks. Shares the underlying logic via `@sports/ingestion-pipeline`'s
 * `settleSport()` — the exact same function the data-refresh worker calls — so
 * the two settlement paths can never drift.
 *
 * (Previously this route was a documented no-op: settlement only happened inside
 * the long-running worker, so a Vercel-only deploy would never grade a pick and
 * the public track record would silently never accrue.)
 *
 * Schedule is declared in `vercel.json` at the repo root.
 *
 * Authentication: Vercel invokes the route with
 *   Authorization: Bearer <CRON_SECRET>
 * so a public call without the right token returns 401.
 *
 * Settlement ALWAYS runs regardless of bootstrap mode — real outcomes are source
 * truth. Bootstrap/learning-eligibility flags only govern whether a settled pick
 * feeds canonical calibration, never whether it settles.
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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Belt-and-braces with noStoreFetch (data-ingestion): force-dynamic does NOT
// opt route-handler fetches out of Next's Data Cache — cached upstream scores
// stalled settlement on 2026-07-10 (207 pending picks). Force no-store here
// even if a future fetch forgets the option.
export const fetchCache = "force-no-store";
export const maxDuration = 300; // settling 7 sports with upstream calls + writes

export async function GET(request: Request) {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const apiKey = process.env["THE_ODDS_API_KEY"];
  if (!apiKey) {
    return NextResponse.json(
      { error: "THE_ODDS_API_KEY not configured" },
      { status: 500 }
    );
  }

  const startedAt = Date.now();
  const gates = getReadinessGates();
  const requestedSport = new URL(request.url).searchParams.get("sport");
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
      { status: 400 }
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

  // Externally supplied scheduler-invocation window (hardening 6.1): every
  // retry of THIS scheduled invocation resolves to the same settlement-run
  // identity inside settleSport, so retries can never fabricate evidence
  // corroboration.
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
    // Brief pause to avoid bursting the upstream API quota.
    await new Promise((r) => setTimeout(r, 750));
  }

  // SECOND FREEZE SHOT (hostile-review F1): the 10:00 UTC refresh-odds run is
  // otherwise a single point of loss for early-UTC slates (an offset-1 freeze
  // that fails there is unrecoverable by the slate's own post-kickoff day).
  // The freeze pass is idempotent (findUnique + unique-constraint rollback)
  // and non-fatal, so a 07:00 UTC retry here is pure redundancy.
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

  // DRAIN-AFTER-SETTLEMENT (hardening 6.8): kick the outbox immediately so
  // event→delivery latency is bounded by this cron's own runtime instead of
  // waiting for the next deliver-settlement-alerts schedule. The durable
  // retry worker remains the safety net; this is purely a latency win.
  // Non-fatal: a drain failure never fails settlement (which already
  // committed durably).
  let alertDrain: OutboxDrainSummary | null = null;
  try {
    alertDrain = await drainSettlementOutbox(db);
  } catch (drainErr) {
    console.warn(
      `[cron:settle-picks] post-settlement outbox drain failed: ` +
        `${drainErr instanceof Error ? drainErr.message : drainErr}`,
    );
  }

  const elapsedMs = Date.now() - startedAt;
  const okCount = results.filter((r) => r.ok).length;
  const gamesSettled = results.reduce((sum, r) => sum + r.gamesSettled, 0);
  const picksSettled = results.reduce((sum, r) => sum + r.picksSettled, 0);
  // Settlement-evidence telemetry (Phase 1E): surfaced so a non-zero count —
  // especially a promotion to OWNER_REVIEW — is visible in the cron response,
  // never silent. The durable receipts live in the SettlementDecision table;
  // these are per-run counters only.
  const observationsRecorded = results.reduce((sum, r) => sum + r.observationsRecorded, 0);
  const anomaliesOpened = results.reduce((sum, r) => sum + r.anomaliesOpened, 0);
  const anomaliesPromoted = results.reduce((sum, r) => sum + r.anomaliesPromoted, 0);
  const anomaliesResolved = results.reduce((sum, r) => sum + r.anomaliesResolved, 0);
  const outboxAppended = results.reduce((sum, r) => sum + r.outboxAppended, 0);

  return NextResponse.json({
    ok: okCount === results.length,
    elapsedMs,
    okCount,
    totalCount: results.length,
    gamesSettled,
    picksSettled,
    observationsRecorded,
    anomaliesOpened,
    anomaliesPromoted,
    anomaliesResolved,
    outboxAppended,
    requestedSport: requestedSport ?? null,
    bootstrapMode: gates.isBootstrapMode,
    results,
    freeze,
    alertDrain,
  });
}
