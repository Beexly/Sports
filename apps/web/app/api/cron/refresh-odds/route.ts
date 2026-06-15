/**
 * Vercel cron — refresh odds on the schedule declared in `vercel.json`.
 *
 * Mirrors `workers/data-refresh/src/index.ts` but runs on Vercel's
 * scheduled-function infrastructure so the operator doesn't have to
 * deploy a long-running worker box. Shares the underlying logic via
 * `@sports/ingestion-pipeline`'s `processSport()` so the two execution
 * paths can never drift.
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
 */

import { NextResponse } from "next/server";
import { SUPPORTED_SPORTS } from "@sports/data-ingestion";
import { processSport } from "@sports/ingestion-pipeline";
import { getReadinessGates } from "@sports/prediction-engine";

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

  const sportResults: Array<{ sport: string; ok: boolean; error?: string }> =
    [];

  for (const sport of sportsToProcess) {
    try {
      await processSport(sport, apiKey, gates, "[cron:refresh-odds]");
      sportResults.push({ sport: sport.key, ok: true });
    } catch (err) {
      sportResults.push({
        sport: sport.key,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    // Brief pause to avoid bursting the upstream API quota.
    await new Promise((r) => setTimeout(r, 750));
  }

  const elapsedMs = Date.now() - startedAt;
  const okCount = sportResults.filter((r) => r.ok).length;

  return NextResponse.json({
    ok: okCount === sportResults.length,
    elapsedMs,
    okCount,
    totalCount: sportResults.length,
    requestedSport: requestedSport ?? null,
    bootstrapMode: gates.isBootstrapMode,
    results: sportResults,
  });
}
