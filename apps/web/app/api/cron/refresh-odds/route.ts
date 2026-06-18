/**
 * Vercel cron — refresh odds on the schedule declared in `vercel.json`.
 *
 * Mirrors `workers/data-refresh/src/index.ts` but runs on Vercel's
 * scheduled-function infrastructure so the operator doesn't have to
 * deploy a long-running worker box. Shares the underlying logic via
 * `@sports/ingestion-pipeline`'s `refreshOdds()` (which itself calls
 * `processSport()`) so the two execution paths can never drift.
 *
 * Schedule is declared in `vercel.json` at the repo root:
 *   "0 10 * * *"  → once daily at 10:00 UTC
 * NOTE: the long-running worker mirror still loops every 30 minutes
 * (`REFRESH_INTERVAL_MS`); the deployed Vercel cadence is daily. Keep
 * this comment in sync with `vercel.json` if the cadence changes.
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
 *
 * The per-cycle loop itself lives in `refreshOdds()` so the cron route,
 * the admin trigger, and the worker all run identical logic. This route
 * owns ONLY the HTTP concerns: auth, the env/sport pre-checks (and their
 * exact status codes), the equivalent JSON envelope, and an optional
 * env-gated dead-man's-switch ping.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { SUPPORTED_SPORTS } from "@sports/data-ingestion";
import { refreshOdds } from "@sports/ingestion-pipeline";
import { getReadinessGates } from "@sports/prediction-engine";
import { pingHealthcheck } from "@/lib/data-reliability/healthcheck-ping";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Vercel hobby/pro cron caps at 5 min

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

  const gates = getReadinessGates();
  const requestedSport = new URL(request.url).searchParams.get("sport");

  // Pre-validate an explicitly requested sport here so the 400 body stays
  // byte-for-byte what callers depend on (refreshOdds throws an equivalent
  // UnsupportedSportError, but we never reach it for the validated case).
  if (
    requestedSport &&
    !SUPPORTED_SPORTS.some((sport) => sport.key === requestedSport)
  ) {
    return NextResponse.json(
      {
        error: "Unsupported sport",
        sport: requestedSport,
        supportedSports: SUPPORTED_SPORTS.map((sport) => sport.key),
      },
      { status: 400 }
    );
  }

  // Dead-man's-switch monitor (env-gated; complete no-op until HC_REFRESH_PING_URL
  // is set, so wiring it in ships no behavior change). Never throws.
  const pingUrl = process.env["HC_REFRESH_PING_URL"];

  const result = await refreshOdds(
    requestedSport ? { sport: requestedSport } : {}
  );

  if (result.ok) {
    await pingHealthcheck(pingUrl, "success");
  } else {
    await pingHealthcheck(pingUrl, "fail");
  }

  return NextResponse.json({
    ok: result.ok,
    elapsedMs: result.elapsedMs,
    okCount: result.okCount,
    totalCount: result.totalCount,
    requestedSport: requestedSport ?? null,
    bootstrapMode: gates.isBootstrapMode,
    results: result.results,
  });
}
