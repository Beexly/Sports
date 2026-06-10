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
import { SUPPORTED_SPORTS } from "@sports/data-ingestion";
import { processSport } from "@sports/ingestion-pipeline";
import { getReadinessGates } from "@sports/prediction-engine";
import { checkCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Vercel hobby/pro cron caps at 5 min

export async function GET(request: Request) {
  const authError = checkCronAuth(request);
  if (authError) return authError;

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
