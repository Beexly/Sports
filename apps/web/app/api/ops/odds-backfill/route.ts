/**
 * POST /api/ops/odds-backfill — fill OPEN/CLOSE line history for past games.
 *
 * WHY. Calibration needs opening and closing lines for games that commenced
 * before the live ingest existed. The Odds API's historical endpoint returns
 * every game's odds as of a past timestamp; this route backfills
 * `OddsLineSnapshot` with OPEN (commence−7d) and CLOSE (commence−1h) phases.
 *
 * AUTHORIZATION + COST (Garrett, 2026-10-01): he approved spending the paid
 * quota on backfills but does not want to keep paying — so this route is:
 * - CRON_SECRET Bearer <redacted> (founder/ops only, never a public surface).
 * - Idempotent: games already holding both phases are skipped before any call.
 * - Bounded: `maxCalls` caps paid calls per run (default 32 ≈ one NFL week).
 * - Paced: `reservePaidCallSlot` (hourly slot) + the credit governor; the run
 *   stops when the governor refuses or remaining credits fall below the floor.
 * - Dry-run mode: `dryRun: true` plans and reports without a single paid call.
 *
 * SHAPE. One row per bookmaker per market per side (SPREAD/TOTAL; moneylines
 * skipped), source `odds-api-historical`, matching live ingestion.
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { db } from "@sports/db";
import {
  OddsApiClient,
  resolveOddsApiKey,
  reservePaidCallSlot,
  decidePaidOddsCall,
  MONTHLY_CREDITS,
  type OddsCreditLedgerDb,
} from "@sports/data-ingestion";
import {
  BACKFILL_SOURCE,
  estimateCalls,
  mapHistoricalEventToRows,
  phaseTimestamp,
  planBackfill,
  type BackfillPhase,
  type BackfillSnapshotRow,
} from "@/lib/ops/odds-backfill";

export const dynamic = "force-dynamic";

const NFL_SPORT_KEY = "americanfootball_nfl";
const DEFAULT_MAX_CALLS = 32;
const CREDIT_FLOOR = 2_000;
const MARKETS = ["spreads", "totals"] as const;

interface BackfillBody {
  fromDate?: string;
  toDate?: string;
  maxCalls?: number;
  dryRun?: boolean;
}

function bad(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  const authError = cronAuthError(request);
  if (authError) return authError;

  let body: BackfillBody = {};
  try {
    body = (await request.json()) as BackfillBody;
  } catch {
    return bad("request body must be JSON");
  }

  const { fromDate, toDate, dryRun = false } = body;
  const maxCalls = Math.max(
    1,
    Math.min(200, Math.floor(body.maxCalls ?? DEFAULT_MAX_CALLS)),
  );
  if (!fromDate || !toDate) return bad("fromDate and toDate (ISO) are required");
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from >= to) {
    return bad("fromDate/toDate must be valid ISO dates with fromDate < toDate");
  }

  const key = resolveOddsApiKey();
  if (!key && !dryRun) {
    return NextResponse.json(
      { ok: false, error: "odds_api_key_absent", note: "No Odds API key in env; backfill cannot run." },
      { status: 503 },
    );
  }

  // Load NFL games in the window.
  const games = await db.game.findMany({
    where: { sportId: NFL_SPORT_KEY, commenceTime: { gte: from, lt: to } },
    select: { id: true, externalId: true, commenceTime: true },
    orderBy: { commenceTime: "asc" },
  });

  // Existing phases per game (idempotency).
  const existing = await db.oddsLineSnapshot.findMany({
    where: { gameId: { in: games.map((g) => g.id) }, source: BACKFILL_SOURCE },
    select: { gameId: true, phase: true },
  });
  const phasesByGame = new Map<string, string[]>();
  for (const row of existing) {
    const list = phasesByGame.get(row.gameId) ?? [];
    if (!list.includes(row.phase)) list.push(row.phase);
    phasesByGame.set(row.gameId, list);
  }

  const plan = planBackfill(
    games.map((g) => ({
      gameId: g.id,
      externalId: g.externalId,
      commenceTime: g.commenceTime,
      existingPhases: phasesByGame.get(g.id) ?? [],
    })),
  );
  const estimatedCalls = estimateCalls(plan);

  if (dryRun || !key) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      gamesInWindow: games.length,
      gamesNeedingBackfill: plan.length,
      estimatedPaidCalls: estimatedCalls,
      plan: plan.map((p) => ({
        externalId: p.externalId,
        commenceTime: p.commenceTime.toISOString(),
        phases: p.phases,
      })),
    });
  }

  const client = new OddsApiClient({ apiKey: key });
  const now = new Date();
  let callsMade = 0;
  let rowsWritten = 0;
  let creditsRemaining: number | null = null;
  const stoppedEarly: string | null = null;
  const perGame: Array<{ externalId: string; phases: BackfillPhase[]; rows: number }> = [];

  for (const item of plan) {
    for (const phase of item.phases) {
      if (callsMade >= maxCalls) break;

      // Pace: one paid call per hourly slot.
      const slot = await reservePaidCallSlot(db as unknown as OddsCreditLedgerDb, {
        sport: NFL_SPORT_KEY,
        purpose: "odds",
        now,
        intervalMs: 60 * 60 * 1_000,
      });
      if (!slot.reserved) break;

      // Governor: refuse when the quota cannot fund the run.
      const decision = decidePaidOddsCall({
        remaining: creditsRemaining,
        now,
        purpose: "odds",
        hasEventWithin48h: null,
        freeCoversPurpose: false,
      });
      if (!decision.allow) break;
      if (creditsRemaining !== null && creditsRemaining < CREDIT_FLOOR) break;

      const asOf = phaseTimestamp(item.commenceTime, phase);
      let rows: BackfillSnapshotRow[] = [];
      try {
        const res = await client.getHistoricalOdds(
          NFL_SPORT_KEY,
          asOf.toISOString(),
          [...MARKETS],
        );
        callsMade += 1;
        if (res.remainingRequests !== null) creditsRemaining = res.remainingRequests;
        const event = res.data.data.find((e) => e.id === item.externalId);
        if (event) {
          rows = mapHistoricalEventToRows(event, item.gameId, phase, new Date(res.data.timestamp));
        }
      } catch (err) {
        // One failed timestamp must not kill the run; record and continue.
        perGame.push({ externalId: item.externalId, phases: [phase], rows: -1 });
        continue;
      }

      if (rows.length > 0) {
        await db.oddsLineSnapshot.createMany({ data: rows, skipDuplicates: true });
        rowsWritten += rows.length;
      }
      perGame.push({ externalId: item.externalId, phases: [phase], rows: rows.length });
    }
    if (callsMade >= maxCalls) break;
  }

  return NextResponse.json({
    ok: true,
    dryRun: false,
    gamesInWindow: games.length,
    gamesNeedingBackfill: plan.length,
    estimatedPaidCalls: estimatedCalls,
    callsMade,
    rowsWritten,
    creditsRemaining,
    stoppedEarly,
    monthlyCredits: MONTHLY_CREDITS,
    perGame,
  });
}
