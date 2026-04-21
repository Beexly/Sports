/**
 * settlePicks — on-demand settlement orchestration.
 *
 * Fetches final scores from The Odds API for the last `daysFrom` days,
 * then settles all PENDING picks for completed games.
 *
 * This is the same logic as settleResults() in the data-refresh worker,
 * extracted into a shared function so the admin UI can trigger it directly
 * without going through an HTTP route (which would lose the session cookie).
 *
 * Additionally supplements settlement with TheSportsDB data for games that
 * may have slipped past The Odds API's coverage window.
 */

import { db } from "@sports/db";
import {
  SUPPORTED_SPORTS,
  OddsApiClient,
  DataNormalizer,
  settleGameLogs,
  getEventsByDate,
} from "@sports/data-ingestion";
import { getReadinessGates, calculatePickResult } from "@sports/prediction-engine";

export interface SettlePicksResult {
  sport: string;
  gamesChecked: number;
  gamesSettled: number;
  picksSettled: number;
  errors: string[];
}

export interface SettlePicksSummary {
  results: SettlePicksResult[];
  totalGamesSettled: number;
  totalPicksSettled: number;
  settledAt: Date;
}

async function settlePicksForSport(
  sportKey: string,
  sportName: string,
  apiKey: string,
  daysFrom: number,
  logPrefix: string
): Promise<SettlePicksResult> {
  const result: SettlePicksResult = {
    sport: sportKey,
    gamesChecked: 0,
    gamesSettled: 0,
    picksSettled: 0,
    errors: [],
  };

  const gates = getReadinessGates();
  const isBootstrap = !gates.canPersistCanonicalHistory;
  const client = new OddsApiClient(apiKey);
  const normalizer = new DataNormalizer();

  // ── Phase 1: The Odds API scores (last N days) ──────────────────────────
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: scores } = await client.getScores(sportKey as any, daysFrom);
    const normalized = normalizer.normalizeScores(scores);
    result.gamesChecked += normalized.length;

    for (const score of normalized) {
      if (!score.completed) continue;
      if (score.homeScore === null || score.awayScore === null) continue;

      const game = await db.game.findUnique({
        where: { externalId: score.externalId },
        include: { picks: { where: { result: "PENDING" } } },
      });
      if (!game) continue;

      await db.game.update({
        where: { id: game.id },
        data: {
          homeScore: score.homeScore,
          awayScore: score.awayScore,
          status: "FINAL",
        },
      });

      const settledAt = new Date();
      let gamePicksSettled = 0;

      for (const pick of game.picks) {
        const pickResult = calculatePickResult(
          pick.pickType as "SPREAD" | "MONEYLINE" | "TOTAL",
          pick.selection,
          pick.line,
          game.homeTeamName,
          score.homeScore,
          score.awayScore,
          sportKey
        );
        await db.pick.update({
          where: { id: pick.id },
          data: { result: pickResult, settledAt },
        });

        const isDecisiveResult =
          pickResult === "WIN" || pickResult === "LOSS" || pickResult === "PUSH";
        const isEligibleForLearning =
          gates.canLearnFromOutcomes && !pick.isBootstrap && isDecisiveResult;

        try {
          await db.pickSignalSnapshot.updateMany({
            where: { pickId: pick.id, settlementResult: null },
            data: {
              settlementResult: pickResult,
              settledAt,
              eligibleForLearning: isEligibleForLearning,
              ...(isEligibleForLearning ? { learningEligibleAt: settledAt } : {}),
            },
          });
        } catch (snapErr) {
          console.warn(
            `${logPrefix} Snapshot update failed for pick ${pick.id}: ` +
            `${snapErr instanceof Error ? snapErr.message : snapErr}`
          );
        }

        gamePicksSettled++;
      }

      if (score.homeScore !== null) {
        const openingLine = await db.openingLine.findUnique({
          where: { gameId_market: { gameId: game.id, market: "SPREADS" } },
        });
        try {
          await settleGameLogs({
            gameId: game.id,
            homeTeam: game.homeTeamName,
            awayTeam: game.awayTeamName,
            sport: sportKey,
            gameDate: game.commenceTime,
            homeScore: score.homeScore,
            awayScore: score.awayScore,
            spread: openingLine?.spread ?? null,
            isBootstrap,
            gameDataQualityScore: game.dataQualityScore,
            minDataQualityThreshold: gates.minDataQualityForGameLog,
          });
        } catch (settleErr) {
          console.warn(
            `${logPrefix} GameLog failed for ${game.id}: ` +
            `${settleErr instanceof Error ? settleErr.message : settleErr}`
          );
        }
      }

      result.gamesSettled++;
      result.picksSettled += gamePicksSettled;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Odds API: ${msg}`);
    console.error(`${logPrefix} ${sportKey} Odds API error: ${msg}`);
  }

  // ── Phase 2: TheSportsDB supplement for older games ────────────────────
  // Catches games that slipped past The Odds API's 3-day daysFrom window.
  // Only attempts to settle games that are still PENDING in our DB.
  try {
    const pendingGames = await db.game.findMany({
      where: {
        sport: { key: sportKey },
        status: { not: "FINAL" },
        commenceTime: {
          // Games that should have finished by now but weren't settled by Odds API
          lt: new Date(Date.now() - 3 * 60 * 60 * 1000), // at least 3 hours ago
          gte: new Date(Date.now() - (daysFrom + 4) * 24 * 60 * 60 * 1000),
        },
        picks: { some: { result: "PENDING" } },
      },
      select: {
        id: true,
        externalId: true,
        homeTeamName: true,
        awayTeamName: true,
        commenceTime: true,
        dataQualityScore: true,
        picks: { where: { result: "PENDING" } },
      },
    });

    if (pendingGames.length > 0) {
      // Collect unique game dates to query
      const datesToCheck = new Set<string>();
      for (const g of pendingGames) {
        datesToCheck.add(g.commenceTime.toISOString().split("T")[0]!);
      }

      for (const dateStr of datesToCheck) {
        const sportsDbEvents = await getEventsByDate(sportKey, new Date(dateStr));
        for (const event of sportsDbEvents) {
          if (!event.isCompleted || event.homeScore === null || event.awayScore === null) continue;

          // Match by team names (case-insensitive partial match)
          const matchedGame = pendingGames.find((g) => {
            const homeMatch =
              g.homeTeamName.toLowerCase().includes(event.homeTeam.toLowerCase()) ||
              event.homeTeam.toLowerCase().includes(g.homeTeamName.toLowerCase());
            const awayMatch =
              g.awayTeamName.toLowerCase().includes(event.awayTeam.toLowerCase()) ||
              event.awayTeam.toLowerCase().includes(g.awayTeamName.toLowerCase());
            return homeMatch && awayMatch;
          });

          if (!matchedGame) continue;
          if (matchedGame.picks.length === 0) continue;

          await db.game.update({
            where: { id: matchedGame.id },
            data: {
              homeScore: event.homeScore,
              awayScore: event.awayScore,
              status: "FINAL",
            },
          });

          const settledAt = new Date();
          const gates = getReadinessGates();
          const isBootstrapNow = !gates.canPersistCanonicalHistory;

          for (const pick of matchedGame.picks) {
            const pickResult = calculatePickResult(
              pick.pickType as "SPREAD" | "MONEYLINE" | "TOTAL",
              pick.selection,
              pick.line,
              matchedGame.homeTeamName,
              event.homeScore,
              event.awayScore,
              sportKey
            );
            await db.pick.update({
              where: { id: pick.id },
              data: { result: pickResult, settledAt },
            });

            const isDecisive =
              pickResult === "WIN" || pickResult === "LOSS" || pickResult === "PUSH";
            const eligible = gates.canLearnFromOutcomes && !pick.isBootstrap && isDecisive;
            try {
              await db.pickSignalSnapshot.updateMany({
                where: { pickId: pick.id, settlementResult: null },
                data: {
                  settlementResult: pickResult,
                  settledAt,
                  eligibleForLearning: eligible,
                  ...(eligible ? { learningEligibleAt: settledAt } : {}),
                },
              });
            } catch {}

            result.picksSettled++;
          }

          const openingLine = await db.openingLine.findUnique({
            where: { gameId_market: { gameId: matchedGame.id, market: "SPREADS" } },
          });
          try {
            await settleGameLogs({
              gameId: matchedGame.id,
              homeTeam: matchedGame.homeTeamName,
              awayTeam: matchedGame.awayTeamName,
              sport: sportKey,
              gameDate: matchedGame.commenceTime,
              homeScore: event.homeScore,
              awayScore: event.awayScore,
              spread: openingLine?.spread ?? null,
              isBootstrap: isBootstrapNow,
              gameDataQualityScore: matchedGame.dataQualityScore,
              minDataQualityThreshold: gates.minDataQualityForGameLog,
            });
          } catch {}

          result.gamesSettled++;
          console.log(
            `${logPrefix} ${sportKey} settled via TheSportsDB: ` +
            `${matchedGame.homeTeamName} vs ${matchedGame.awayTeamName} ` +
            `(${event.homeScore}-${event.awayScore})`
          );
        }
      }
    }
  } catch (sdbErr) {
    const msg = sdbErr instanceof Error ? sdbErr.message : String(sdbErr);
    result.errors.push(`TheSportsDB: ${msg}`);
    console.warn(`${logPrefix} ${sportKey} TheSportsDB supplement error: ${msg}`);
  }

  console.log(
    `${logPrefix} ${sportKey}: checked=${result.gamesChecked}, ` +
    `settled=${result.gamesSettled}, picks=${result.picksSettled}`
  );

  void sportName; // used for logging context only
  return result;
}

/**
 * Run settlement across all supported sports.
 *
 * @param apiKey   - The Odds API key
 * @param daysFrom - How many days back to check (default 3)
 * @param logPrefix - Log prefix for identifying caller context
 */
export async function settlePicks(
  apiKey: string,
  daysFrom: number = 3,
  logPrefix: string = "[settle]"
): Promise<SettlePicksSummary> {
  const settledAt = new Date();
  const results: SettlePicksResult[] = [];

  for (const sport of SUPPORTED_SPORTS) {
    const result = await settlePicksForSport(
      sport.key,
      sport.name,
      apiKey,
      daysFrom,
      logPrefix
    );
    results.push(result);
    // Brief pause between sports
    await new Promise((r) => setTimeout(r, 500));
  }

  const totalGamesSettled = results.reduce((s, r) => s + r.gamesSettled, 0);
  const totalPicksSettled = results.reduce((s, r) => s + r.picksSettled, 0);

  console.log(
    `${logPrefix} Complete — ${totalGamesSettled} games settled, ` +
    `${totalPicksSettled} picks settled`
  );

  return { results, totalGamesSettled, totalPicksSettled, settledAt };
}
