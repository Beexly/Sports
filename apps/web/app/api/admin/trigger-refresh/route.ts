import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { OddsApiClient, DataNormalizer, SUPPORTED_SPORTS, MARKETS } from "@sports/data-ingestion";
import { scoreGames } from "@sports/prediction-engine";
import type { OddsInput } from "@sports/types";

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
        const game = await db.game.findUnique({ where: { externalId: odds.gameExternalId } });
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

      // Build scoring inputs
      const oddsInputs: OddsInput[] = [];
      for (const game of normalizedGames) {
        const gameRecord = await db.game.findUnique({ where: { externalId: game.externalId } });
        if (!gameRecord) continue;

        const gameOdds = normalizedOdds.filter((o) => o.gameExternalId === game.externalId);
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
        data: { status: "SUCCESS", gamesUpserted, oddsInserted, completedAt: new Date() },
      });

      results.push({ sport: sport.key, status: "success", games: gamesUpserted, picks: picksGenerated });
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
