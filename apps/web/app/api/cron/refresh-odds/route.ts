/**
 * Vercel cron — refresh odds on the schedule declared in `vercel.json`.
 *
 * Schedule: every 30 minutes (see vercel.json). Required so candidate odds stay
 * inside MAX_CANDIDATE_ODDS_AGE_MS (6h). Do NOT widen the 6h gate to hide a slow cron.
 *
 * Auth: Authorization Bearer CRON_SECRET.
 * Health: optional HC_REFRESH_PING_URL (job) + HC_ODDS_FETCHEDAT_PING_URL (data plane).
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { SUPPORTED_SPORTS } from "@sports/data-ingestion";
import { refreshOdds } from "@sports/ingestion-pipeline";
import { getReadinessGates } from "@sports/prediction-engine";
import { pingHealthcheck } from "@/lib/data-reliability/healthcheck-ping";
import { monitorOddsFetchedAt } from "@/lib/data-reliability/monitor-odds-fetchedat";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

export async function GET(request: Request) {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const apiKey = process.env["THE_ODDS_API_KEY"];
  if (!apiKey) {
    return NextResponse.json(
      { error: "THE_ODDS_API_KEY not configured" },
      { status: 500 },
    );
  }

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
      { status: 400 },
    );
  }

  const pingUrl = process.env["HC_REFRESH_PING_URL"];
  const fetchedAtPingUrl = process.env["HC_ODDS_FETCHEDAT_PING_URL"];

  await pingHealthcheck(pingUrl, "start");

  const result = await refreshOdds(
    requestedSport ? { sport: requestedSport } : {},
  );

  if (result.ok) {
    await pingHealthcheck(pingUrl, "success");
  } else {
    await pingHealthcheck(pingUrl, "fail");
  }

  const fetchedAtMonitor = await monitorOddsFetchedAt(fetchedAtPingUrl);

  return NextResponse.json({
    ok: result.ok,
    elapsedMs: result.elapsedMs,
    okCount: result.okCount,
    totalCount: result.totalCount,
    requestedSport: requestedSport ?? null,
    bootstrapMode: gates.isBootstrapMode,
    results: result.results,
    freeze: result.freeze,
    fetchedAt: {
      status: fetchedAtMonitor.freshness.status,
      ageMinutes: fetchedAtMonitor.freshness.ageMinutes,
      maxFetchedAt:
        fetchedAtMonitor.freshness.maxFetchedAt?.toISOString() ?? null,
      summary: fetchedAtMonitor.freshness.summary,
      pinged: fetchedAtMonitor.pinged,
    },
  });
}
