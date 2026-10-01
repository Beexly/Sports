/**
 * GET /api/cron/prediction-market-snapshot — persist prediction-market fair
 * values as game_signals observation rows.
 *
 * WHY THIS EXISTS. `tryKalshiFairValue` and `tryPolymarketIndependentFairValue`
 * fetched de-vigged fair values but had zero production callers and nothing
 * persisted their snapshots — the fetch→persist loop was open. This cron
 * closes it: per upcoming NFL game it calls the gated fetchers and upserts
 * whatever they return into `game_signals` (MARKET_SENTIMENT / kalshi|polymarket
 * / fair_value_moneyline).
 *
 * RIGHTS POSTURE — READ THIS BEFORE TOUCHING THE GATES:
 * - Kalshi: source-registry verdict "paid-required" (Developer Agreement v1.1
 *   §3/§3.1 — written grant required before ingest). `isIngestible("kalshi")`
 *   is false, so the fetcher returns null. THIS CRON DOES NOT BYPASS THAT.
 * - Polymarket: compliance hold, default OFF (`INDEPENDENT_POLYMARKET=1`).
 * The cron reports per-source coverage honestly; when gates are closed it
 * persists nothing. The day Garrett clears the rights, persistence starts
 * with zero new code. NOTHING here feeds scoring — the engine-input path
 * (`OddsInput.context.independentFairValues`) stays founder-gated.
 *
 * LAWS OBSERVED:
 * - WRITES ONLY to `game_signals`, idempotent upsert on
 *   (gameId, sourceName, signalKey). No other tables.
 * - Bounded: 16 games max per run. Per-game try/catch; one game's failure
 *   never aborts the run.
 * - CRON_SECRET Bearer <redacted> (cronAuthError, sync in this route's lineage).
 * - Rows expire at kickoff.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { db } from "@sports/db";
import {
  tryKalshiFairValue,
  tryPolymarketIndependentFairValue,
} from "@sports/ingestion-pipeline";
import { toMarketSignalRow } from "@/lib/ops/prediction-market-snapshot";
import { captureError } from "@/lib/observability/sentry";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const CAPTURE_WINDOW_DAYS = 7;
const MAX_GAMES = 16;
const SPORT_KEY = "americanfootball_nfl";

export async function GET(request: Request) {
  const authError = cronAuthError(request);
  if (authError) return authError;

  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + CAPTURE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const games = await db.game.findMany({
      where: {
        commenceTime: { gte: now, lte: windowEnd },
        sport: { key: SPORT_KEY },
      },
      select: {
        id: true,
        homeTeamName: true,
        awayTeamName: true,
        commenceTime: true,
      },
      orderBy: { commenceTime: "asc" },
      take: MAX_GAMES,
    });

    let written = 0;
    let kalshiHits = 0;
    let polymarketHits = 0;
    const skipped: string[] = [];
    const errors: string[] = [];

    for (const g of games) {
      try {
        const input = {
          sportKey: SPORT_KEY,
          homeTeam: g.homeTeamName,
          awayTeam: g.awayTeamName,
          commenceTime: g.commenceTime,
        };
        // Both fetchers enforce their own rights gates and soft-fail to null.
        const [kalshi, polymarket] = await Promise.all([
          tryKalshiFairValue(input),
          tryPolymarketIndependentFairValue(input),
        ]);
        if (kalshi) kalshiHits += 1;
        if (polymarket) polymarketHits += 1;

        for (const fv of [kalshi, polymarket]) {
          if (!fv) continue;
          const row = toMarketSignalRow(fv);
          if (!row) {
            skipped.push(`${g.id}/${fv.source}: null-pair`);
            continue;
          }
          await db.gameSignal.upsert({
            where: {
              gameId_sourceName_signalKey: {
                gameId: g.id,
                sourceName: row.sourceName,
                signalKey: row.signalKey,
              },
            },
            create: {
              gameId: g.id,
              sourceCategory: row.sourceCategory,
              sourceName: row.sourceName,
              signalKey: row.signalKey,
              signalValue: row.signalValue as object,
              trustLevel: row.trustLevel,
              expiresAt: g.commenceTime,
              fetchedAt: now,
            },
            update: {
              signalValue: row.signalValue as object,
              trustLevel: row.trustLevel,
              expiresAt: g.commenceTime,
              fetchedAt: now,
            },
          });
          written += 1;
        }
      } catch (error) {
        errors.push(
          `${g.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        gamesConsidered: games.length,
        rowsWritten: written,
        kalshiHits,
        polymarketHits,
        skipped,
        errors,
      },
      note:
        "Prediction-market fair values persisted as MARKET_SENTIMENT observation " +
        "rows. Kalshi is rights-blocked (source-registry verdict paid-required — " +
        "written grant required); Polymarket is on compliance hold (default OFF). " +
        "Both gates are enforced inside the fetchers; this cron bypasses neither. " +
        "Nothing here feeds scoring.",
    });
  } catch (error) {
    captureError(error, { route: "cron/prediction-market-snapshot" });
    return NextResponse.json(
      { success: false, error: "prediction-market-snapshot failed" },
      { status: 500 },
    );
  }
}
