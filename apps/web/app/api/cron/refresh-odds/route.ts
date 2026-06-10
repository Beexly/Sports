/**
 * Vercel cron — refresh odds every 30 minutes.
 *
 * Mirrors `workers/data-refresh/src/index.ts` but runs on Vercel's
 * scheduled-function infrastructure so the operator doesn't have to
 * deploy a long-running worker box. Shares the underlying logic via
 * `@sports/ingestion-pipeline`'s `processSport()` so the two execution
 * paths can never drift.
 *
 * Schedule is declared in `vercel.json` at the repo root:
 *   "*\/30 * * * *"  → every 30 minutes
 *
 * Authentication: Vercel invokes the route with
 *   Authorization: Bearer <CRON_SECRET>
 * so a public POST without the right token returns 401. This is the
 * documented Vercel cron pattern.
 *
 * Behavior is governed by readiness gates exactly the same way the
 * long-running worker is. If `CANONICAL_HISTORY_ENABLED=false`, writes
 * are still marked `isBootstrap=true` — nothing here changes the gate
 * semantics; it only changes where the loop runs.
 */

import { NextResponse } from "next/server";
import {
  SUPPORTED_SPORTS,
  PROVIDER_JOB_STATUS,
  type ProviderJobStatus,
} from "@sports/data-ingestion";
import { processSport } from "@sports/ingestion-pipeline";
import { getReadinessGates } from "@sports/prediction-engine";
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

  const sportResults: Array<{
    sport: string;
    ok: boolean;
    error?: string;
    providerStatus?: ProviderJobStatus;
  }> = [];

  for (const sport of sportsToProcess) {
    try {
      // processSport is non-throwing by design: it records its own
      // IngestionRun (RUNNING -> SUCCESS | FAILED with the classified provider
      // reason) and returns a result. The previous bug was discarding that
      // return and always pushing ok:true — masking provider 401/403/429/5xx.
      // We now key off result.status so a failed pull is never reported ok.
      const result = await processSport(
        sport,
        apiKey,
        gates,
        "[cron:refresh-odds]"
      );
      if (result.status === "success") {
        sportResults.push({ sport: sport.key, ok: true });
      } else {
        sportResults.push({
          sport: sport.key,
          ok: false,
          error: result.error,
          providerStatus:
            result.providerStatus ?? PROVIDER_JOB_STATUS.UNKNOWN,
        });
      }
    } catch (err) {
      // Defensive: an unexpected throw (processSport is meant to be
      // non-throwing). Still surface as a failure, never as ok.
      captureError(err, { surface: "cron:refresh-odds", sport: sport.key });
      sportResults.push({
        sport: sport.key,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        providerStatus: PROVIDER_JOB_STATUS.UNKNOWN,
      });
    }
    // Brief pause to avoid bursting the upstream API quota.
    await new Promise((r) => setTimeout(r, 750));
  }

  const elapsedMs = Date.now() - startedAt;
  const okCount = sportResults.filter((r) => r.ok).length;
  const failedResults = sportResults.filter((r) => !r.ok);
  const allOk = failedResults.length === 0;

  // First classified provider reason — what monitoring should page on.
  // Internal/founder-only; not surfaced in any public copy.
  const failureReason =
    failedResults.find((r) => r.providerStatus)?.providerStatus ??
    (failedResults.length > 0 ? PROVIDER_JOB_STATUS.UNKNOWN : null);

  // Job-truth HTTP contract — make failure DETECTABLE to Vercel cron + uptime
  // monitors, which alert on non-2xx. We deliberately pick the status code by
  // outcome so legitimate partial success is still distinguishable:
  //   - all sports succeeded            -> 200 (ok:true)
  //   - some succeeded, some failed     -> 207 Multi-Status (partial)
  //   - every sport failed              -> 502 Bad Gateway (provider down)
  // Any non-200 plus top-level ok:false is enough for monitoring to fire; the
  // 207/502 split just preserves partial-success reporting fidelity.
  const httpStatus = allOk ? 200 : okCount > 0 ? 207 : 502;

  return NextResponse.json(
    {
      ok: allOk,
      // failureReason is the classified provider cause (PROVIDER_AUTH_FAILED,
      // PROVIDER_QUOTA_EXHAUSTED, PROVIDER_RATE_LIMITED, PROVIDER_UNAVAILABLE,
      // …) for the first failing sport; null on full success.
      failureReason,
      elapsedMs,
      okCount,
      failedCount: failedResults.length,
      totalCount: sportResults.length,
      requestedSport: requestedSport ?? null,
      bootstrapMode: gates.isBootstrapMode,
      results: sportResults,
    },
    { status: httpStatus }
  );
}
