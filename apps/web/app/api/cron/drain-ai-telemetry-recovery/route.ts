/**
 * Vercel cron — drain the §9.7 AI telemetry recovery queue.
 *
 * `ai_telemetry_recovery` holds authoritative finalizations that could not
 * land at dispatch time (post-success store blip, lease fence, ambiguous
 * finalize failure). Without a drainer those rows would accumulate forever
 * and the queue's attempt caps / abandonment terminals could never engage —
 * the enqueue side would be theater. This route runs the lease-fenced,
 * attempt-capped drain pass (`drainAiTelemetryRecoveryProduction`) on the
 * same scheduled-function infrastructure as the other cron work.
 *
 * The drain performs NO provider dispatch and can never spend funds — it only
 * completes bookkeeping for calls that already happened. Safe to run
 * concurrently (FOR UPDATE SKIP LOCKED partitions claimers) and safe to
 * re-run at any cadence (every operation is fenced and idempotent).
 *
 * Schedule is declared in `vercel.json` at the repo root.
 *
 * Authentication: Vercel invokes the route with
 *   Authorization: Bearer <CRON_SECRET>
 * so a public call without the right token returns 401.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { drainAiTelemetryRecoveryProduction } from "@/lib/ai-control-plane";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

export async function GET(request: Request) {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const startedAt = Date.now();
  try {
    const summary = await drainAiTelemetryRecoveryProduction();
    return NextResponse.json({
      ok: true,
      ...summary,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    // A drain failure is operational, never authoritative: rows stay leased or
    // unleased in the queue and the next scheduled pass retries them.
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startedAt,
      },
      { status: 500 },
    );
  }
}
