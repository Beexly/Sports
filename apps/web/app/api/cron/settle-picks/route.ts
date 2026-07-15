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
import { SUPPORTED_SPORTS } from "@sports/data-ingestion";
import { settleSport, freezeSlateCommitments, type SlateFreezeResult } from "@sports/ingestion-pipeline";
import { getReadinessGates } from "@sports/prediction-engine";

export const dynamic = "force-dynamic";
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
    picksVoided: number;
    error?: string;
  }> = [];

  for (const sport of sportsToProcess) {
    const result = await settleSport(sport, apiKey, gates, "[cron:settle-picks]");
    results.push({
      sport: result.sport,
      ok: result.status === "success",
      gamesSettled: result.gamesSettled,
      picksSettled: result.picksSettled,
      picksVoided: result.picksVoided,
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

  const elapsedMs = Date.now() - startedAt;
  const okCount = results.filter((r) => r.ok).length;
  const gamesSettled = results.reduce((sum, r) => sum + r.gamesSettled, 0);
  const picksSettled = results.reduce((sum, r) => sum + r.picksSettled, 0);
  const picksVoided = results.reduce((sum, r) => sum + r.picksVoided, 0);

  return NextResponse.json({
    ok: okCount === results.length,
    elapsedMs,
    okCount,
    totalCount: results.length,
    gamesSettled,
    picksSettled,
    picksVoided,
    requestedSport: requestedSport ?? null,
    bootstrapMode: gates.isBootstrapMode,
    results,
    freeze,
  });
}
