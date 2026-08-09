/**
 * Vercel cron — refresh odds on the schedule declared in `vercel.json`.
 *
 * Mirrors `workers/data-refresh/src/index.ts` but runs on Vercel's
 * scheduled-function infrastructure so the operator doesn't have to
 * deploy a long-running worker box. Shares the underlying logic via
 * `@sports/ingestion-pipeline`'s `refreshOdds()` (which itself calls
 * `processSport()`) so the two execution paths can never drift.
 *
 * Schedule is declared in `vercel.json` at the repo root: every 30 minutes
 * (the "every-30th-minute" cron pattern — written in prose here, not as the
 * literal cron string, because a literal star-slash sequence inside a block
 * comment terminates the comment early and breaks the build; that exact
 * mistake shipped once already, so it isn't getting a second chance).
 * This cadence is required so candidate odds stay inside the board gate's
 * MAX_CANDIDATE_ODDS_AGE_MS (6 hours) in `load-gate-slate.ts`. Do NOT widen
 * the 6h gate to hide a slow cron; keep this comment in sync with vercel.json.
 * The optional long-running worker still uses REFRESH_INTERVAL_MS = 30m.
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
import { SUPPORTED_SPORTS, resolveOddsApiKey, resolveRundownApiKey } from "@sports/data-ingestion";
import { refreshOdds } from "@sports/ingestion-pipeline";
import { getReadinessGates } from "@sports/prediction-engine";
import { pingHealthcheck } from "@/lib/data-reliability/healthcheck-ping";
import { monitorOddsFetchedAt } from "@/lib/data-reliability/monitor-odds-fetchedat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Belt-and-braces with noStoreFetch (data-ingestion): force-dynamic does NOT
// opt route-handler fetches out of Next's Data Cache — cached upstream odds
// froze the whole pipeline on 2026-07-10. This segment config forces every
// fetch in this route to no-store even if a future fetch forgets the option.
export const fetchCache = "force-no-store";
export const maxDuration = 300; // Vercel hobby/pro cron caps at 5 min

export async function GET(request: Request) {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const apiKey = resolveOddsApiKey();
  const rundownKey = resolveRundownApiKey();
  if (!apiKey && !rundownKey) {
    // Free mode: no quote key. Still try signal slate so board can open without books.
    const { generateSignalSlate } = await import("@sports/ingestion-pipeline");
    const signals = await generateSignalSlate({ logPrefix: "[cron:refresh-odds:signal-only]" });
    return NextResponse.json({
      ok: true,
      skipped: "no-odds-key",
      refreshed: false,
      reason: "No THE_ODDS_API_KEY / RUNDOWN_API_KEY — signal-only board fill attempted",
      signals,
    });
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

  // Autonomous board fill: independent signals in same tick (no founder cron wait).
  let signalFill: Awaited<ReturnType<typeof import("@sports/ingestion-pipeline").generateSignalSlate>> | null = null;
  try {
    const { generateSignalSlate } = await import("@sports/ingestion-pipeline");
    signalFill = await generateSignalSlate({ logPrefix: "[cron:refresh-odds:signal]" });
  } catch (sigErr) {
    console.warn(
      `[cron:refresh-odds] signal slate failed: ${sigErr instanceof Error ? sigErr.message : sigErr}`,
    );
  }

  if (result.ok) {
    await pingHealthcheck(pingUrl, "success");
  } else {
    await pingHealthcheck(pingUrl, "fail");
  }

  // DATA-PLANE freshness, reported separately from the JOB result above.
  //
  // The two answer different questions and must not be collapsed: `result.ok`
  // says the refresh RAN, `oddsFreshness` says whether the stored quotes are
  // actually recent. A run can succeed while writing nothing usable (provider
  // offline, circuit open, empty slate), and that combination is precisely the
  // silent failure this reports.
  //
  // Scope is global_max — an ops SLA signal, NOT gate clearance for any
  // candidate. `classifyGlobalMaxFetchedAt` says so in its own summary text so
  // a reader of this payload cannot mistake the two.
  //
  // Env-gated and non-throwing: a no-op until HC_ODDS_FETCHEDAT_PING_URL is
  // set, and it never fails the cron it is watching.
  const fetchedAtPingUrl = process.env["HC_ODDS_FETCHEDAT_PING_URL"];
  const oddsFetchedAt = await monitorOddsFetchedAt(fetchedAtPingUrl);

  return NextResponse.json({
    ok: result.ok,
    elapsedMs: result.elapsedMs,
    okCount: result.okCount,
    totalCount: result.totalCount,
    requestedSport: requestedSport ?? null,
    bootstrapMode: gates.isBootstrapMode,
    results: result.results,
    freeze: result.freeze,
    signals: signalFill,
    oddsFreshness: {
      scope: oddsFetchedAt.freshness.scope,
      status: oddsFetchedAt.freshness.status,
      ageMinutes: oddsFetchedAt.freshness.ageMinutes,
      summary: oddsFetchedAt.freshness.summary,
      pinged: oddsFetchedAt.pinged,
    },
  });
}
