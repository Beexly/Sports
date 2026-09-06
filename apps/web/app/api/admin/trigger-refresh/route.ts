import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import { db } from "@sports/db";
import { getInSeasonSports, type OddsCreditLedgerDb } from "@sports/data-ingestion";
import { getReadinessGates } from "@sports/prediction-engine";
import {
  governedDecision,
  isLowQuota,
  processSport,
  recordPaidRunAccounting,
  type ProcessSportResult,
} from "@sports/ingestion-pipeline";
import { buildPaidOddsGovernor } from "@/lib/odds/paid-odds-governor";

export const dynamic = "force-dynamic";

/**
 * One entry per in-season sport: the processSport envelope when the paid call
 * ran, or a held/skipped marker when the credit governor refused it or the
 * cycle stopped on low quota. Held sports are REPORTED, never dropped, so the
 * response says what did not run and why.
 */
type TriggerRefreshEntry =
  | ProcessSportResult
  | { readonly sport: string; readonly status: "held" | "skipped"; readonly note: string };

export async function POST(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Per-admin throttle on a route that fans out to The Odds API for EVERY sport.
  // That bills per call — a single admin looping this endpoint drains the shared
  // monthly odds budget for everyone (denial-of-wallet). Stop it at the door.
  // Limit copied from subscriptions/checkout (10/min is ample for a human op).
  const limit = consumeRateLimit("admin-trigger-refresh", session.user.id, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many refresh requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const apiKey = process.env["THE_ODDS_API_KEY"];
  if (!apiKey) {
    return NextResponse.json({ error: "THE_ODDS_API_KEY not configured" }, { status: 503 });
  }

  // Read gates once — identical to how the scheduled worker reads them.
  // processSport() derives isBootstrap from these gates internally, ensuring
  // provenance (isBootstrap, GameSignal.isBootstrap) is correct regardless of
  // which ingestion path triggers the refresh.
  const gates = getReadinessGates();

  // GSE-SEC-040: season-gate the bulk refresh so out-of-season sports are not
  // billed against the paid Odds API quota. Mirrors the scheduled worker in
  // refresh-odds.ts which calls getInSeasonSports(). The ODDS_REFRESH_ALL_SPORTS
  // env override still forces all sports for backfills, so no admin workflow is lost.
  const sports = getInSeasonSports();

  // C-109: this route drives processSport with the REAL Odds API key for every
  // in-season sport, so it spends paid credits exactly like the refresh-odds
  // cron and the data-refresh worker, and it answers to the same durable
  // governor. Until 2026-09-06 it consulted no governor and recorded no
  // accounting at all: an admin refresh spent against the monthly plan without
  // the ledger ever seeing it, which both bypassed the budget and skewed the
  // burn reading the truth surface reports. The per-admin rate limit above
  // bounds how OFTEN this runs; the governor bounds what it may SPEND.
  const governor = buildPaidOddsGovernor({ db: db as unknown as OddsCreditLedgerDb });
  const results: TriggerRefreshEntry[] = [];
  for (let i = 0; i < sports.length; i++) {
    const sport = sports[i]!;
    const decision = await governedDecision(governor, sport.key);
    if (!decision.allow) {
      results.push({
        sport: sport.key,
        status: "held",
        note: `credit_governor: ${decision.reason}`,
      });
      continue;
    }
    const res = await processSport(sport, apiKey, gates, "[trigger-refresh]");
    results.push(res);
    // reserved:false when the governor failed open (decide() threw): nothing was
    // reserved, so the first paid request needs its own marker here.
    await recordPaidRunAccounting(governor, sport.key, res, { reserved: decision.reserved });
    // Same proactive cutoff the refreshOdds loop and the worker apply: stop
    // starting new sports once the vendor reports a near-exhausted budget.
    if (isLowQuota(res)) {
      for (const notRun of sports.slice(i + 1)) {
        results.push({
          sport: notRun.key,
          status: "skipped",
          note: `odds_api_low_quota_skip: only ${res.oddsApiRemainingRequests} credits left`,
        });
      }
      break;
    }
  }

  return NextResponse.json({ success: true, results });
}
