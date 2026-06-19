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
import { cronAuthError } from "@/lib/cron/authorize";
import {
  SUPPORTED_SPORTS,
  type CheckClearanceFn,
  type ScoreClearanceRequest,
  type ScoreClearanceResult,
} from "@sports/data-ingestion";
import { settleSport, type SettleSportFreeDeps } from "@sports/ingestion-pipeline";
import { getReadinessGates } from "@sports/prediction-engine";
import { checkClearance, type ClearanceRequest } from "@/lib/scraping/clearance-engine";

/**
 * Adapt the real Scraping Clearance Engine to the free score pool's structural
 * `CheckClearanceFn`. The pool's request type widens mode/tool/intents to `string`
 * (it does not depend on apps/web); the providers only ever emit registry-valid
 * literals, so we narrow back to the real `ClearanceRequest` here. The engine
 * remains the single source of truth — this only bridges the package boundary,
 * never weakens any check (an unknown source/mode/tool still fails closed).
 */
const clearanceAdapter: CheckClearanceFn = (
  request: ScoreClearanceRequest,
): ScoreClearanceResult => {
  const result = checkClearance(request as unknown as ClearanceRequest);
  return { allowed: result.allowed, rightsSnapshot: result.rightsSnapshot };
};

export const dynamic = "force-dynamic";
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

  // Free keyless settlement fallback — INERT unless FREE_DATA_PROVIDER_ENABLED==="true".
  // When enabled we inject global fetch + the real Scraping Clearance Engine so the
  // free score providers stay clearance-gated and fail-closed. When the flag is off,
  // `freeDeps` is undefined and settleSport is byte-identical to the paid-only path.
  const freeDeps: SettleSportFreeDeps | undefined =
    process.env["FREE_DATA_PROVIDER_ENABLED"] === "true"
      ? { fetchFn: fetch, checkClearance: clearanceAdapter }
      : undefined;

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
    error?: string;
  }> = [];

  for (const sport of sportsToProcess) {
    const result = await settleSport(sport, apiKey, gates, "[cron:settle-picks]", freeDeps);
    results.push({
      sport: result.sport,
      ok: result.status === "success",
      gamesSettled: result.gamesSettled,
      picksSettled: result.picksSettled,
      ...(result.error ? { error: result.error } : {}),
    });
    // Brief pause to avoid bursting the upstream API quota.
    await new Promise((r) => setTimeout(r, 750));
  }

  const elapsedMs = Date.now() - startedAt;
  const okCount = results.filter((r) => r.ok).length;
  const gamesSettled = results.reduce((sum, r) => sum + r.gamesSettled, 0);
  const picksSettled = results.reduce((sum, r) => sum + r.picksSettled, 0);

  return NextResponse.json({
    ok: okCount === results.length,
    elapsedMs,
    okCount,
    totalCount: results.length,
    gamesSettled,
    picksSettled,
    requestedSport: requestedSport ?? null,
    bootstrapMode: gates.isBootstrapMode,
    results,
  });
}
