/**
 * Data Refresh Worker — v3
 * Fetches live odds every 30 minutes, enriches with game context
 * (opening lines, rest days, ATS form), then scores picks.
 */

import { db } from "@sports/db";
import {
  OddsApiClient,
  DataNormalizer,
  SUPPORTED_SPORTS,
  MARKETS,
  enrichGameContext,
  getAtsForm,
  settleGameLogs,
} from "@sports/data-ingestion";
import { scoreGames } from "@sports/prediction-engine";
import type { OddsInput, GameContextInput } from "@sports/types";

const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

async function runRefreshCycle(): Promise<void> {
  const apiKey = process.env["THE_ODDS_API_KEY"];
  if (!apiKey) throw new Error("THE_ODDS_API_KEY not set");

  const client = new OddsApiClient(apiKey);
  const normalizer = new DataNormalizer();

  console.log(`[data-refresh] Cycle start ${new Date().toISOString()}`);

  for (const sport of SUPPORTED_SPORTS) {
    const run = await db.ingestionRun.create({
      data: { sport: sport.key, status: "RUNNING" },
    });

    try {
      const { data: events, remainingRequests } = await client.getOdds(sport.key, [...MARKETS]);
      const fetchedAt = new Date();

      console.log(`[data-refresh] ${sport.key}: ${events.length} events, ${remainingRequests} requests remaining`);

      if (!normalizer.validateFreshness(fetchedAt)) {
        throw new Error("Freshness validation failed");
      }

      const normalizedGames = normalizer.normalizeGames(events);
      const normalizedOdds = normalizer.normalizeOdds(events, fetchedAt);

      const sportRecord = await db.sport.upsert({
        where: { key: sport.key },
        create: { key: sport.key, name: sport.name, displayName: sport.displayName },
        update: {},
      });

      // Upsert all games first
      const gameRecords: Record<string, { id: string; homeTeamName: string; awayTeamName: string; commenceTime: Date }> = {};
      for (const game of normalizedGames) {
        const record = await db.game.upsert({
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
        gameRecords[game.externalId] = record;
      }

      // Ingest odds
      let oddsInserted = 0;
      for (const odds of normalizedOdds) {
        const game = gameRecords[odds.gameExternalId];
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

      // Build OddsInputs with game context
      const oddsInputs: OddsInput[] = [];
      for (const game of normalizedGames) {
        const gameRecord = gameRecords[game.externalId];
        if (!gameRecord) continue;

        const gameOdds = normalizedOdds.filter((o) => o.gameExternalId === game.externalId);
        const bookmakerKeys = new Set(gameOdds.map((o) => o.bookmaker));
        const bookmakerCoverageMax = bookmakerKeys.size;

        // Compute avg spread and total for context
        const spreadOdds = gameOdds.filter((o) => o.market === "SPREADS" && o.spread !== undefined);
        const totalOdds = gameOdds.filter((o) => o.market === "TOTALS" && o.total !== undefined);
        const avgSpread =
          spreadOdds.length > 0
            ? spreadOdds.reduce((s, o) => s + (o.spread ?? 0), 0) / spreadOdds.length
            : null;
        const avgTotal =
          totalOdds.length > 0
            ? totalOdds.reduce((s, o) => s + (o.total ?? 0), 0) / totalOdds.length
            : null;

        // Run context enrichment (opening lines, rest days, data quality)
        try {
          await enrichGameContext({
            gameId: gameRecord.id,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            sport: sport.key,
            commenceTime: game.commenceTime,
            avgSpread,
            avgTotal,
            bookmakerCoverageMax,
            fetchedAt,
          });
        } catch (enrichErr) {
          // Non-fatal — picks still generated without context
          console.warn(`[data-refresh] Enrichment failed for ${game.externalId}: ${enrichErr instanceof Error ? enrichErr.message : enrichErr}`);
        }

        // Reload game record to get updated context fields
        const enrichedGame = await db.game.findUnique({ where: { id: gameRecord.id } });

        // Fetch ATS form for both teams
        const [homeAtsForm, awayAtsForm] = await Promise.all([
          getAtsForm(game.homeTeam, sport.key).catch(() => null),
          getAtsForm(game.awayTeam, sport.key).catch(() => null),
        ]);

        const freshnessMinutes = (Date.now() - fetchedAt.getTime()) / 60_000;

        const context: GameContextInput = {
          openingSpread: enrichedGame?.openingSpread ?? avgSpread,
          currentSpread: avgSpread,
          openingTotal: enrichedGame?.openingTotal ?? avgTotal,
          currentTotal: avgTotal,
          restDaysHome: enrichedGame?.restDaysHome ?? null,
          restDaysAway: enrichedGame?.restDaysAway ?? null,
          isBackToBackHome: enrichedGame?.isBackToBackHome ?? false,
          isBackToBackAway: enrichedGame?.isBackToBackAway ?? false,
          homeAtsForm: homeAtsForm ?? null,
          awayAtsForm: awayAtsForm ?? null,
          bookmakerCoverageMax,
          dataFreshnessMinutes: freshnessMinutes,
          hasSpreadMarket: spreadOdds.length > 0,
          hasTotalMarket: totalOdds.length > 0,
          hasH2HMarket: gameOdds.some((o) => o.market === "H2H"),
        };

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
          context,
        });
      }

      const scoredPicks = scoreGames(oddsInputs, fetchedAt);
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      let picksGenerated = 0;

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
              edgeScore: pick.edgeScore,
              consensusPct: pick.consensusPct,
              bookmakerCount: pick.bookmakerCount,
              tier: pick.tier,
              pickGrade: pick.pickGrade,
              riskLevel: pick.riskLevel,
              reasoning: pick.reasoning,
              reasoningShort: pick.reasoningShort,
              factorBreakdown: JSON.parse(JSON.stringify(pick.factorBreakdown)),
              modelVersion: pick.modelVersion,
              dataFreshnessAt: pick.dataFreshnessAt,
            },
          });
          picksGenerated++;
        }
      }

      await db.ingestionRun.update({
        where: { id: run.id },
        data: { status: "SUCCESS", gamesUpserted: Object.keys(gameRecords).length, oddsInserted, completedAt: new Date() },
      });

      console.log(`[data-refresh] ${sport.key}: ${Object.keys(gameRecords).length} games, ${oddsInserted} odds, ${picksGenerated} new picks`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[data-refresh] ${sport.key} failed: ${msg}`);
      await db.ingestionRun.update({
        where: { id: run.id },
        data: { status: "FAILED", errorMessage: msg, completedAt: new Date() },
      });
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`[data-refresh] Cycle complete ${new Date().toISOString()}`);
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
        if (!game) continue;

        await db.game.update({
          where: { id: game.id },
          data: { homeScore: score.homeScore, awayScore: score.awayScore, status: "FINAL" },
        });

        if (score.homeScore !== null && score.awayScore !== null) {
          // Settle pick results
          for (const pick of game.picks) {
            const result = calculatePickResult(
              pick.pickType as "SPREAD" | "MONEYLINE" | "TOTAL",
              pick.selection,
              pick.line,
              game.homeTeamName,
              score.homeScore,
              score.awayScore
            );
            await db.pick.update({
              where: { id: pick.id },
              data: { result, settledAt: new Date() },
            });
          }

          // Write TeamGameLog entries for ATS form tracking
          const openingSpreadOdds = await db.openingLine.findUnique({
            where: { gameId_market: { gameId: game.id, market: "SPREADS" } },
          });

          try {
            await settleGameLogs({
              gameId: game.id,
              homeTeam: game.homeTeamName,
              awayTeam: game.awayTeamName,
              sport: sport.key,
              gameDate: game.commenceTime,
              homeScore: score.homeScore,
              awayScore: score.awayScore,
              spread: openingSpreadOdds?.spread ?? null,
            });
          } catch (settleErr) {
            console.warn(`[settlement] GameLog failed for ${game.id}: ${settleErr instanceof Error ? settleErr.message : settleErr}`);
          }
        }
      }
    } catch (err) {
      console.error(`[settlement] ${sport.key}: ${err instanceof Error ? err.message : err}`);
    }
  }
}

function calculatePickResult(
  pickType: "SPREAD" | "MONEYLINE" | "TOTAL",
  selection: string,
  line: number,
  homeTeam: string,
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
    const adjusted = homeMargin + (pickedHome ? -line : line);
    if (adjusted === 0) return "PUSH";
    return adjusted > 0 ? "WIN" : "LOSS";
  }
  if (pickType === "TOTAL") {
    const total = homeScore + awayScore;
    const isOver = selection.startsWith("OVER");
    if (total === line) return "PUSH";
    return (isOver && total > line) || (!isOver && total < line) ? "WIN" : "LOSS";
  }
  return "PUSH";
}

async function main(): Promise<void> {
  console.log("[data-refresh] Worker v3 starting...");
  await runRefreshCycle();
  await settleResults();
  setInterval(async () => {
    try {
      await runRefreshCycle();
      await settleResults();
    } catch (err) {
      console.error("[data-refresh] Unhandled error:", err instanceof Error ? err.message : err);
    }
  }, REFRESH_INTERVAL_MS);
}

main().catch((err) => {
  console.error("[data-refresh] Fatal:", err);
  process.exit(1);
});
