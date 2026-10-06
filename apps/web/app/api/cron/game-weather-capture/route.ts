/**
 * GET /api/cron/game-weather-capture
 *
 * THE WEATHER WRITER. The NWS read path (`loadNflGameWeather`) fetches honest
 * per-venue conditions, but nothing ever keyed them to a game: the observation
 * bundle's `weather` surface reads `game_signals` rows in the WEATHER /
 * VENUE_ENVIRONMENT categories, and prod has zero rows in them. This cron is
 * the writer — it snapshots NWS conditions for every upcoming outdoor NFL
 * game and upserts them as `game_signals` rows keyed by game.
 *
 * WHAT IT WRITES. One row per finite NWS metric (`wind_mph`, `temp_f`,
 * `precip_pct`), sourceName "nws", trust 0.88, expiring at kickoff. The
 * signalValue is the NWS number verbatim — no derived "impact score".
 *
 * WHAT IT DELIBERATELY DOES NOT WRITE. Dome / retractable-roof games get no
 * rows (a null-weather row would read as "measured calm"). A venue whose NWS
 * fetch failed gets no rows for that game. Every skip is reported with its
 * reason; a game that stops receiving weather is visible, not silently
 * absent.
 *
 * LAWS OBSERVED:
 * - CRON_SECRET Bearer <redacted>, same strict mode as the sibling ledger crons.
 * - Idempotent: upsert on `@@unique([gameId, sourceName, signalKey])`, so a
 *   re-run converges instead of duplicating.
 * - Read window is 7 days out: a pregame snapshot is only useful before
 *   kickoff, and `expiresAt` is the game's commence time.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { db } from "@sports/db";
import { nflTeamAbbr } from "@sports/ingestion-pipeline";
import { loadNflGameWeather } from "@/lib/weather/game-weather";
import { projectWeatherSignals } from "@/lib/weather/game-weather-capture";
import { captureError } from "@/lib/observability/sentry";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** How far ahead to capture weather for. A pregame snapshot is only useful before kickoff. */
const CAPTURE_WINDOW_DAYS = 7;

export async function GET(request: Request) {
  const authError = cronAuthError(request);
  if (authError) return authError;

  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + CAPTURE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const games = await db.game.findMany({
      where: {
        commenceTime: { gte: now, lte: windowEnd },
        sport: { key: "americanfootball_nfl" },
      },
      select: { id: true, homeTeamName: true, commenceTime: true },
    });

    const weather = await loadNflGameWeather();

    const { rows, skipped } = projectWeatherSignals(
      games.map((g) => ({
        gameId: g.id,
        homeTeamAbbr: nflTeamAbbr(g.homeTeamName) ?? "",
        commenceTime: g.commenceTime,
      })),
      weather,
    );

    let written = 0;
    const errors: string[] = [];
    for (const r of rows) {
      try {
        await db.gameSignal.upsert({
          where: {
            gameId_sourceName_signalKey: {
              gameId: r.gameId,
              sourceName: r.sourceName,
              signalKey: r.signalKey,
            },
          },
          create: {
            gameId: r.gameId,
            sourceCategory: r.sourceCategory,
            sourceName: r.sourceName,
            signalKey: r.signalKey,
            signalValue: r.signalValue,
            trustLevel: r.trustLevel,
            expiresAt: new Date(r.expiresAt),
            fetchedAt: now,
          },
          update: {
            signalValue: r.signalValue,
            trustLevel: r.trustLevel,
            expiresAt: new Date(r.expiresAt),
            fetchedAt: now,
          },
        });
        written += 1;
      } catch (error) {
        errors.push(
          `${r.gameId}/${r.signalKey}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        gamesConsidered: games.length,
        venuesLive: weather.venuesLive,
        rowsProjected: rows.length,
        rowsWritten: written,
        skipped,
        errors,
      },
      note:
        "Weather WRITER: NWS snapshots upserted as game-keyed `game_signals` rows (WEATHER/nws). " +
        "Dome games and failed venue fetches are skipped with reasons, never defaulted. " +
        "Rows expire at kickoff. The observation bundle's `weather` surface now has a feed.",
    });
  } catch (error) {
    captureError(error, { route: "cron/game-weather-capture" });
    return NextResponse.json(
      { success: false, error: "game-weather-capture failed" },
      { status: 500 },
    );
  }
}
