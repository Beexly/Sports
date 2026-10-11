/**
 * Vercel cron — refresh odds on the schedule declared in `vercel.json`.
 *
 * Mirrors `workers/data-refresh/src/index.ts` but runs on Vercel's
 * scheduled-function infrastructure so the operator doesn't have to
 * deploy a long-running worker box. Shares the underlying logic via
 * `@sports/ingestion-pipeline`'s `refreshOdds()` (which itself calls
 * `processSport()`) so the two execution paths can never drift.
 *
 * 2026-10-08: a missing Odds API key and a missing Rundown key is the
 * Galaxy path, not a skip. `refreshOdds` already sends `espn-free-path`
 * in that case. Do not return signal-only before that call.
 *
 * Schedule is declared in `apps/web/vercel.json` — the ONLY copy Vercel reads,
 * because cron schedules are loaded from the project's Root Directory. (The
 * repo-root vercel.json is an inert byte-identical duplicate; see
 * `__tests__/vercel-config-drift.test.ts`.) The declared cadence is every
 * fifteenth minute — written in prose here, not as the literal cron string,
 * because a literal star-slash sequence inside a block comment terminates the
 * comment early and breaks the build; that exact mistake shipped once already,
 * so it isn't getting a second chance.
 *
 * This cadence keeps candidate odds well inside the board gate's * MAX_CANDIDATE_ODDS_AGE_MS (6 hours) in `load-gate-slate.ts`. Do NOT widen
 * the 6h gate to hide a slow cron; keep this comment in sync with vercel.json.
 * `__tests__/cron-schedule-manifest.test.ts` pins the declared cadence against
 * `lib/ops/cron-schedule-manifest.ts`, so the real number is asserted there
 * rather than trusted from this prose.
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
import { db } from "@sports/db";
import {
  SUPPORTED_SPORTS,
  resolveOddsApiKey,
  type OddsCreditLedgerDb,
} from "@sports/data-ingestion";
import { refreshOdds } from "@sports/ingestion-pipeline";
import { getReadinessGates } from "@sports/prediction-engine";
import { pingHealthcheck } from "@/lib/data-reliability/healthcheck-ping";
import { monitorOddsFetchedAt } from "@/lib/data-reliability/monitor-odds-fetchedat";
import { runShadowEvaluationPass, type ShadowPassResult } from "@/lib/ops/shadow-evaluation-pass";
import { buildPaidOddsGovernor } from "@/lib/odds/paid-odds-governor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

export async function GET(request: Request) {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const apiKey = resolveOddsApiKey();
  const gates = getReadinessGates();
  const requestedSport = new URL(request.url).searchParams.get("sport");

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

  const pingUrl = process.env["HC_REFRESH_PING_URL"];
  const governor = apiKey
    ? buildPaidOddsGovernor({ db: db as unknown as OddsCreditLedgerDb })
    : undefined;
  const result = await refreshOdds({
    ...(requestedSport ? { sport: requestedSport } : {}),
    ...(governor ? { governor } : {}),
  });

  let signalFill: Awaited<ReturnType<typeof import("@sports/ingestion-pipeline").generateSignalSlate>> | null = null;
  try {
    const { generateSignalSlate, slateAssociationTrace } = await import("@sports/ingestion-pipeline");
    signalFill = await generateSignalSlate({
      logPrefix: "[cron:refresh-odds:signal]",
      trace: await slateAssociationTrace(),
    });
  } catch (sigErr) {
    console.warn(
      `[cron:refresh-odds] signal slate failed: ${sigErr instanceof Error ? sigErr.message : sigErr}`,
    );
  }

  const shadow: Record<string, ShadowPassResult | { readonly error: string }> = {};
  const shadowSports = requestedSport
    ? SUPPORTED_SPORTS.filter((sport) => sport.key === requestedSport)
    : SUPPORTED_SPORTS;
  for (const sport of shadowSports) {
    try {
      shadow[sport.key] = await runShadowEvaluationPass(sport.key);
    } catch (shadowErr) {
      const message = shadowErr instanceof Error ? shadowErr.message : String(shadowErr);
      console.warn(`[cron:refresh-odds] shadow pass failed for ${sport.key}: ${message}`);
      shadow[sport.key] = { error: message };
    }
  }

  if (result.ok) {
    await pingHealthcheck(pingUrl, "success");
  } else {
    await pingHealthcheck(pingUrl, "fail");
  }

  const fetchedAtPingUrl = process.env["HC_ODDS_FETCHEDAT_PING_URL"];
  const oddsFetchedAt = await monitorOddsFetchedAt(fetchedAtPingUrl);

  return NextResponse.json({
    ok: result.ok,
    elapsedMs: result.elapsedMs,
    okCount: result.okCount,
    totalCount: result.totalCount,
    requestedSport: requestedSport ?? null,
    bootstrapMode: gates.isBootstrapMode,
    path: apiKey ? "paid-key-present" : "galaxy-espn-free-path",
    results: result.results,
    freeze: result.freeze,
    signals: signalFill,
    shadow,
    oddsFreshness: {
      scope: oddsFetchedAt.freshness.scope,
      status: oddsFetchedAt.freshness.status,
      ageMinutes: oddsFetchedAt.freshness.ageMinutes,
      summary: oddsFetchedAt.freshness.summary,
      pinged: oddsFetchedAt.pinged,
    },
  });
}
