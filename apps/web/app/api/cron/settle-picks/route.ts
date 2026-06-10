/**
 * Vercel cron — settle completed games (D-011 Option A: Vercel-only host).
 *
 * Replaces the former no-op placeholder. The settlement core was extracted
 * from `workers/data-refresh/src/index.ts` into `@sports/ingestion-pipeline`'s
 * `settleOnce()` — the worker and this route call the SAME function, so the
 * two execution paths can never drift. One pass covers: scores pull
 * (classified provider errors), R-01 boundary grading (chosen-side →
 * home-perspective conversion at the settlement boundary), PickSignalSnapshot
 * outcome mirrors, TeamGameLog writes, CLV capture/compute (R-04 bet-time
 * lock), the R-05 VOID sweep, and the B-04 calibration regen trigger.
 *
 * Schedule is declared in `vercel.json` at the repo root:
 *   "0 * * * *"  → hourly
 *
 * Job-truth contract — identical to refresh-odds: failure is DETECTABLE.
 *   - 500 when CRON_SECRET / THE_ODDS_API_KEY are not configured
 *   - 401 on a bad bearer token (before any work)
 *   - 200 ok:true only when every sport settled cleanly
 *   - 207 partial (some sports failed, or the void sweep failed)
 *   - 502 total provider failure (every sport failed) with the classified
 *     failureReason (PROVIDER_AUTH_FAILED, PROVIDER_QUOTA_EXHAUSTED, …)
 * A failed pass is NEVER reported ok:true. With no real database the pass is
 * an honest stub no-op and the body says so (degraded) rather than implying
 * real settlement happened.
 *
 * calibrationRegenerated is expected to be false on Vercel — the regen script
 * is not traced into the lambda bundle. That is reported honestly in the body
 * but deliberately does NOT degrade the HTTP status (a permanent 207 would
 * train monitoring to ignore real partial failures). The long-running worker
 * host regenerates the report natively.
 */

import { NextResponse } from "next/server";
import { PROVIDER_JOB_STATUS } from "@sports/data-ingestion";
import { settleOnce } from "@sports/ingestion-pipeline";
import { getReadinessGates } from "@sports/prediction-engine";
import { isStubMode } from "@sports/db";
import { captureError } from "@/lib/observability";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Vercel hobby/pro cron caps at 5 min

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = process.env["CRON_SECRET"];
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env["THE_ODDS_API_KEY"];
  if (!apiKey) {
    return NextResponse.json(
      { error: "THE_ODDS_API_KEY not configured" },
      { status: 500 }
    );
  }

  const startedAt = Date.now();
  const gates = getReadinessGates();

  let result;
  try {
    // settleOnce is non-throwing by contract: every per-sport failure is
    // classified and counted in the structured result, never masked.
    result = await settleOnce({ apiKey, logPrefix: "[cron:settle-picks]" });
  } catch (err) {
    // Defensive: an unexpected throw (settleOnce is meant to be
    // non-throwing). Still surface as a total failure, never as ok.
    captureError(err, { surface: "cron:settle-picks" });
    return NextResponse.json(
      {
        ok: false,
        failureReason: PROVIDER_JOB_STATUS.UNKNOWN,
        error: err instanceof Error ? err.message : String(err),
        elapsedMs: Date.now() - startedAt,
      },
      { status: 502 }
    );
  }

  const elapsedMs = Date.now() - startedAt;
  const okCount = result.sports.filter((s) => s.ok).length;
  const totalFailure = result.failed >= result.totalSports;
  const anyFailure = result.failed > 0 || result.errors.length > 0;
  const allOk = !anyFailure;

  // First classified provider reason — what monitoring should page on.
  // Internal/founder-only; not surfaced in any public copy.
  const failureReason = anyFailure
    ? result.providerStatus ?? PROVIDER_JOB_STATUS.UNKNOWN
    : null;

  // Job-truth HTTP contract — mirror refresh-odds so Vercel cron + uptime
  // monitors (which alert on non-2xx) can detect failure:
  //   - every sport settled cleanly      -> 200 (ok:true)
  //   - partial (some failed, or sweep)  -> 207 Multi-Status
  //   - every sport failed               -> 502 Bad Gateway (provider down)
  const httpStatus = allOk ? 200 : totalFailure ? 502 : 207;

  return NextResponse.json(
    {
      ok: allOk,
      // failureReason is the classified provider cause (PROVIDER_AUTH_FAILED,
      // PROVIDER_QUOTA_EXHAUSTED, PROVIDER_RATE_LIMITED, PROVIDER_UNAVAILABLE,
      // …) for the first failing sport; null on full success.
      failureReason,
      elapsedMs,
      settled: result.settled,
      voided: result.voided,
      okCount,
      failedCount: result.failed,
      totalCount: result.totalSports,
      calibrationRegenerated: result.calibrationRegenerated,
      // Honest degraded note: under the @sports/db stub every count above is
      // a no-op — never imply a stub pass performed real settlement.
      degraded: isStubMode() ? "no-database (stub mode): settlement was a no-op" : null,
      bootstrapMode: gates.isBootstrapMode,
      errors: result.errors,
      results: result.sports,
    },
    { status: httpStatus }
  );
}
