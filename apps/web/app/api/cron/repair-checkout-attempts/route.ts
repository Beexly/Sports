/**
 * Vercel cron — checkout-attempt repair (directive 5.3 / 5.6).
 *
 * The DURABLE reconciliation backstop for the checkout money path. A crashed
 * claimant (stale REQUEST_IN_FLIGHT), an ambiguous Stripe outcome
 * (AMBIGUOUS), or a missed `checkout.session.expired` webhook (drifted
 * SESSION_CREATED) all converge here: the job queries Stripe by the attempt
 * id stamped into every session's metadata and converges each row —
 * releasing an intent's idempotency key ONLY on Stripe proof of absence or
 * expiry, never on elapsed time alone. Anything unprovable stays unresolved
 * and is surfaced to the owner queue (durable CockpitTask review item).
 *
 * Schedule is declared in `vercel.json` at the repo root ("30 8 * * *" —
 * DAILY, matching every other cron; Vercel Hobby's minimum interval).
 * Immediacy is covered by the inline reconciliation in the checkout route
 * (an unresolved past-TTL attempt reconciles on the user's next retry); this
 * scheduled pass is the self-healing safety net for attempts nobody retries.
 *
 * Authentication: Vercel invokes the route with
 *   Authorization: Bearer <CRON_SECRET>
 * via the shared `cronAuthError` helper — a public call without the right
 * token returns 401 (or 500 if CRON_SECRET is unset), like every other cron.
 */

import { NextResponse } from "next/server";
import { DurableWriteStoreUnavailableError } from "@sports/db";
import { cronAuthError } from "@/lib/cron/authorize";
import { runCheckoutAttemptRepair } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300; // Vercel hobby/pro cron caps at 5 min

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  let report;
  try {
    report = await runCheckoutAttemptRepair();
  } catch (err) {
    if (err instanceof DurableWriteStoreUnavailableError) {
      // No durable store → nothing can be reconciled safely. Typed 503; the
      // guard already recorded the ops incident line.
      return NextResponse.json(
        { ok: false, error: "durable write store unavailable" },
        { status: 503 },
      );
    }
    throw err;
  }

  return NextResponse.json({
    // `ok` reflects a clean pass: unresolved/errored attempts stay queued for
    // the next pass and are surfaced in the owner queue — the operator should
    // look when this is false repeatedly.
    ok: report.errors === 0 && report.unresolved === 0,
    ...report,
  });
}
