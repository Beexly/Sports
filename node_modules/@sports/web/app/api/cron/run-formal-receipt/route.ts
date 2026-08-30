/**
 * Vercel cron — Track B formal-receipt violation detection (exactly-once
 * runtime handoff, 2026-07-22; extends PR #181's Track A on the same branch
 * by explicit owner authorization).
 *
 * Reads a trailing window of `control_event_ledger`, projects it through
 * `srqc-projection.ts`'s pure `projectWindow`, and structured-logs any
 * invocation whose projected abstract state the Formal Foundry's proofs say
 * is unreachable (`pendingCountClass === "GE2"`, or a rejected fingerprint on
 * an unbound id). DETECTION ONLY:
 *
 *   - No admission decision is made or consulted here (`admitUnderSRQC` is
 *     not called by this route) — nothing on any live dispatch path is
 *     gated on this job's output.
 *   - No new durable incident table. A `FormalIncident` row-store was
 *     explicitly deferred in the handoff that authorized Track B; this pass
 *     is log-only, using the EXISTING `processed_event` table (sinks
 *     `"formal_receipt"` / `"formal_receipt_violation"`) purely for
 *     exactly-once bookkeeping. See `formal-receipt-job.ts` for the full
 *     design rationale (why per-event bookkeeping and per-violation-witness
 *     log de-duplication are two different gates).
 *   - Formal Heartbeat (`formal-heartbeat/`) stays PURE/DORMANT/ZERO-I/O —
 *     it is not imported by this route or by `formal-receipt-job.ts`.
 *
 * Schedule: `vercel.json`, once daily (Hobby-plan native cron cap — see
 * `.github/workflows/external-cron.yml`'s header comment for why that cap
 * exists). This job is non-urgent detection work, not the sub-daily refresh
 * class that file's 30-minute workaround exists for, so no external-cron.yml
 * entry was added for it — a daily pass with a 26h lookback window (see
 * `formal-receipt-job.ts`) is a deliberate, documented choice, not an
 * oversight.
 *
 * Authentication: identical to every other `/api/cron/*` route — Vercel (or
 * the external-cron workaround for OTHER jobs) calls with
 *   Authorization: Bearer <CRON_SECRET>
 * A request without the right token gets 401 (`cronAuthError`, shared with
 * `drain-ai-telemetry-recovery`'s route).
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { runFormalReceiptPassProduction } from "@/lib/ai-control-plane";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

export async function GET(request: Request) {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const startedAt = Date.now();
  try {
    const summary = await runFormalReceiptPassProduction();
    return NextResponse.json({
      ok: summary.violationsDetected.length === 0,
      ...summary,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    // Fail closed (matches event-ledger.ts's StoreUnavailable convention): a
    // store problem must surface as an operational failure, never a silently
    // "clean" 200 that could hide a real violation window from an operator.
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
