/**
 * Data Refresh Worker
 * Fetches live odds from The Odds API every 30 minutes.
 * Upserts games + odds, then triggers pick generation.
 */

import { db } from "@sports/db";
import {
  OddsApiClient,
  DataNormalizer,
  SUPPORTED_SPORTS,
  MARKETS,
} from "@sports/data-ingestion";
import { scoreGames } from "@sports/prediction-engine";
import type { OddsInput } from "@sports/types";

const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

async function runRefreshCycle(): Promise<void> {
  const apiKey = process.env["THE_ODDS_API_KEY"];
  if (!apiKey) {
    throw new Error("THE_ODDS_API_KEY environment variable is not set");
  }

  const client = new OddsApiClient(apiKey);
  const normalizer = new DataNormalizer();

  console.log(`[data-refresh] Starting refresh cycle at ${new Date().toISOString()}`);

  for (const sport of SUPPORTED_SPORTS) {
    const run = await db.ingestionRun.create({
      data: { sport: sport.key, status: "RUNNING" },
    });

    try {
      console.log(`[data-refresh] Fetching ${sport.key}...`);

      const { data: events, remainingRequests } = await client.getOdds(
        sport.key,
        [...MARKETS]
      );

      console.log(
        `[data-refresh] ${sport.key}: ${events.length} events. Remaining API requests: ${remainingRequests}`
      );

      const fetchedAt = new Date();

      if (!normalizer.validateFreshness(fetchedAt)) {
        throw new Error("Data failed freshness validation (too old)");
      }

      const normalizedGames = normalizer.normalizeGames(events);
      const normalizedOdds = normalizer.normalizeOdds(events, fetchedAt);

      // Ensure sport record exists
      const sportRecord = await db.sport.upsert({
        where: { key: sport.key },
        create: {
          key: sport.key,
          name: sport.name,
          displayName: sport.displayName,
        },
        update: {},
      });

      let gamesUpserted = 0;
      for (const game of normalizedGames) {
        await db.game.upsert({
          where: { externalId: game.externalId },
          create: {
            externalId: game.externalId,
            sportId: sportRecord.id,
            homeTeamName: game.homeTeam,
            awayTeamName: game.awayTeam,
            commenceTime: game.commenceTime,
          },
          update: {
            homeTeamName: game.homeTeam,
            awayTeamName: game.awayTeam,
            commenceTime: game.commenceTime,
          },
        });
        gamesUpserted++;
      }

      let oddsInserted = 0;
      for (const odds of normalizedOdds) {
        const game = await db.game.findUnique({
          where: { externalId: odds.gameExternalId },
        });
        if (!game) continue;

        await db.odds.create({
          data: {
            gameId: game.id,
            ingestionRunId: run.id,
            bookmaker: odds.bookmaker,
            market: odds.market,
            homePrice: odds.homePrice,
            awayPrice: odds.awayPrice,
            drawPrice: odds.drawPrice,
            spread: odds.spread,
            homeSpreadPrice: odds.homeSpreadPrice,
            awaySpreadPrice: odds.awaySpreadPrice,
            total: odds.total,
            overPrice: odds.overPrice,
            underPrice: odds.underPrice,
            fetchedAt: odds.fetchedAt,
          },
        });
        oddsInserted++;
      }

      // Generate picks from this run's data
      const oddsInputs: OddsInput[] = [];
      for (const game of normalizedGames) {
        const gameRecord = await db.game.findUnique({
          where: { externalId: game.externalId },
        });
        if (!gameRecord) continue;

        const gameOdds = normalizedOdds.filter(
          (o) => o.gameExternalId === game.externalId
        );

        oddsInputs.push({
          gameId: gameRecord.id,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          commenceTime: game.commenceTime,
          sport: sport.name,
          bookmakerOdds: gameOdds.map((o) => ({
            bookmaker: o.bookmaker,
            market: o.market,
            homePrice: o.homePrice,
            awayPrice: o.awayPrice,
            spread: o.spread,
            homeSpreadPrice: o.homeSpreadPrice,
            awaySpreadPrice: o.awaySpreadPrice,
            total: o.total,
            overPrice: o.overPrice,
            underPrice: o.underPrice,
          })),
        });
      }

      const scoredPicks = scoreGames(oddsInputs);
      let picksGenerated = 0;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      for (const pick of scoredPicks) {
        const existing = await db.pick.findFirst({
          where: {
            gameId: pick.gameId,
            pickType: pick.pickType,
            generatedAt: { gte: todayStart },
          },
        });

        if (!existing) {
          await db.pick.create({
            data: {
              gameId: pick.gameId,
              ingestionRunId: run.id,
              pickType: pick.pickType,
              selection: pick.selection,
              line: pick.line,
              confidence: pick.confidence,
              tier: pick.tier,
              reasoning: pick.reasoning,
              modelVersion: pick.modelVersion,
            },
          });
          picksGenerated++;
        }
      }

      await db.ingestionRun.update({
        where: { id: run.id },
        data: {
          status: "SUCCESS",
          gamesUpserted,
          oddsInserted,
          completedAt: new Date(),
        },
      });

      console.log(
        `[data-refresh] ${sport.key}: ${gamesUpserted} games, ${oddsInserted} odds records, ${picksGenerated} new picks`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[data-refresh] ${sport.key} FAILED: ${message}`);

      await db.ingestionRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          errorMessage: message,
          completedAt: new Date(),
        },
      });
    }

    // Small delay between sports to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(`[data-refresh] Cycle complete at ${new Date().toISOString()}`);
}

async function settleResults(): Promise<void> {
  const apiKey = process.env["THE_ODDS_API_KEY"];
  if (!apiKey) return;

  const client = new OddsApiClient(apiKey);
  const normalizer = new DataNormalizer();

  for (const sport of SUPPORTED_SPORTS) {
    try {
      const { data: scores } = await client.getScores(sport.key, 2);
      const normalized = normalizer.normalizeScores(scores);

      for (const score of normalized) {
        if (!score.completed) continue;

        const game = await db.game.findUnique({
          where: { externalId: score.externalId },
          include: { picks: { where: { result: "PENDING" } } },
        });

        if (!game || game.picks.length === 0) continue;

        // Update game scores
        await db.game.update({
          where: { id: game.id },
          data: {
            homeScore: score.homeScore,
            awayScore: score.awayScore,
            status: "FINAL",
          },
        });

        // Settle each pending pick
        if (
          score.homeScore !== null &&
          score.awayScore !== null
        ) {
          for (const pick of game.picks) {
            const result = calculatePickResult(
              pick.pickType as "SPREAD" | "MONEYLINE" | "TOTAL",
              pick.selection,
              pick.line,
              game.homeTeamName,
              game.awayTeamName,
              score.homeScore,
              score.awayScore
            );

            await db.pick.update({
              where: { id: pick.id },
              data: { result, settledAt: new Date() },
            });
          }
        }
      }
    } catch (err) {
      console.error(
        `[data-refresh] Score settlement failed for ${sport.key}: ${err instanceof Error ? err.message : err}`
      );
    }
  }
}

function calculatePickResult(
  pickType: "SPREAD" | "MONEYLINE" | "TOTAL",
  selection: string,
  line: number,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number
): "WIN" | "LOSS" | "PUSH" {
  if (pickType === "MONEYLINE") {
    const homeWon = homeScore > awayScore;
    const pickedHome = selection.includes(homeTeam);
    if (homeScore === awayScore) return "PUSH";
    return pickedHome === homeWon ? "WIN" : "LOSS";
  }

  if (pickType === "SPREAD") {
    const pickedHome = selection.includes(homeTeam);
    const homeMargin = homeScore - awayScore;
    const adjustedMargin = homeMargin + (pickedHome ? -line : line);
    if (adjustedMargin === 0) return "PUSH";
    return adjustedMargin > 0 ? "WIN" : "LOSS";
  }

  if (pickType === "TOTAL") {
    const totalScore = homeScore + awayScore;
    const isOver = selection.startsWith("OVER");
    if (totalScore === line) return "PUSH";
    return (isOver && totalScore > line) || (!isOver && totalScore < line)
      ? "WIN"
      : "LOSS";
  }

  return "PUSH";
}

// Main execution loop
async function main(): Promise<void> {
  console.log("[data-refresh] Worker starting...");

  // Run immediately on startup
  await runRefreshCycle();
  await settleResults();

  // Then run on schedule
  setInterval(async () => {
    try {
      await runRefreshCycle();
      await settleResults();
    } catch (err) {
      console.error(
        "[data-refresh] Unhandled error in refresh cycle:",
        err instanceof Error ? err.message : err
      );
    }
  }, REFRESH_INTERVAL_MS);
}

main().catch((err) => {
  console.error("[data-refresh] Fatal error:", err);
  process.exit(1);
});
