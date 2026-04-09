import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import {
  OddsApiClient,
  DataNormalizer,
  SUPPORTED_SPORTS,
  MARKETS,
  enrichGameContext,
  getAtsForm,
  getHeadToHeadForm,
} from "@sports/data-ingestion";
import { scoreGames } from "@sports/prediction-engine";
import type { OddsInput, GameContextInput } from "@sports/types";

export async function POST(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apiKey = process.env["THE_ODDS_API_KEY"];
  if (!apiKey) {
    return NextResponse.json({ error: "THE_ODDS_API_KEY not configured" }, { status: 503 });
  }

  const results: Array<{ sport: string; status: string; games: number; picks: number }> = [];

  for (const sport of SUPPORTED_SPORTS) {
    const run = await db.ingestionRun.create({
      data: { sport: sport.key, status: "RUNNING" },
    });

    try {
      const client = new OddsApiClient(apiKey);
      const normalizer = new DataNormalizer();

      const { data: events } = await client.getOdds(sport.key, [...MARKETS]);
      const fetchedAt = new Date();

      if (!normalizer.validateFreshness(fetchedAt)) {
        throw new Error("Data failed freshness validation");
      }

      const normalizedGames = normalizer.normalizeGames(events);
      const normalizedOdds = normalizer.normalizeOdds(events, fetchedAt);

      const sportRecord = await db.sport.upsert({
        where: { key: sport.key },
        create: { key: sport.key, name: sport.name, displayName: sport.displayName },
        update: {},
      });

      // Upsert game records
      const gameRecords: Record<string, { id: string }> = {};
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

      // Build OddsInputs with full context enrichment (matches data-refresh worker)
      const oddsInputs: OddsInput[] = [];
      for (const game of normalizedGames) {
        const gameRecord = gameRecords[game.externalId];
        if (!gameRecord) continue;

        const gameOdds = normalizedOdds.filter((o) => o.gameExternalId === game.externalId);
        const bookmakerCoverageMax = new Set(gameOdds.map((o) => o.bookmaker)).size;

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

        // Run opening line tracking, rest day computation, and data quality scoring
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
          console.warn(
            `[trigger-refresh] Enrichment failed for ${game.externalId}: ${enrichErr instanceof Error ? enrichErr.message : enrichErr}`
          );
        }

        const enrichedGame = await db.game.findUnique({ where: { id: gameRecord.id } });

        const [homeAtsForm, awayAtsForm, homeAtsFormAtHome, awayAtsFormAway, homeH2HForm] =
          await Promise.all([
            getAtsForm(game.homeTeam, sport.key).catch(() => null),
            getAtsForm(game.awayTeam, sport.key).catch(() => null),
            getAtsForm(game.homeTeam, sport.key, 15, "HOME").catch(() => null),
            getAtsForm(game.awayTeam, sport.key, 15, "AWAY").catch(() => null),
            getHeadToHeadForm(game.homeTeam, game.awayTeam, sport.key).catch(() => null),
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
          homeAtsFormAtHome: homeAtsFormAtHome ?? null,
          awayAtsFormAway: awayAtsFormAway ?? null,
          headToHeadForm: homeH2HForm ?? null,
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
      let picksGenerated = 0;

      for (const pick of scoredPicks) {
        const pickData = {
          ingestionRunId: run.id,
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
          isFeatured:
            pick.pickGrade === "ELITE_PLAY" ||
            (pick.pickGrade === "STRONG_PLAY" && pick.confidence >= 80),
        };

        await db.pick.upsert({
          where: { gameId_pickType: { gameId: pick.gameId, pickType: pick.pickType } },
          create: { gameId: pick.gameId, pickType: pick.pickType, ...pickData },
          update: pickData,
        });
        picksGenerated++;
      }

      await db.ingestionRun.update({
        where: { id: run.id },
        data: { status: "SUCCESS", gamesUpserted: normalizedGames.length, oddsInserted, completedAt: new Date() },
      });

      results.push({ sport: sport.key, status: "success", games: normalizedGames.length, picks: picksGenerated });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await db.ingestionRun.update({
        where: { id: run.id },
        data: { status: "FAILED", errorMessage: message, completedAt: new Date() },
      });
      results.push({ sport: sport.key, status: `failed: ${message}`, games: 0, picks: 0 });
    }
  }

  return NextResponse.json({ success: true, results });
}
