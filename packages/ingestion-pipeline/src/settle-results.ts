/**
 * settleResults — the canonical settlement routine.
 *
 * Shared between the scheduled data-refresh worker and the admin trigger-sync
 * button so both code paths settle picks identically. Given a configured Odds
 * API client and readiness gates, this function:
 *
 *   1. Fetches the latest scores for each supported sport.
 *   2. For each completed game, marks the Game FINAL with final scores.
 *   3. For each pending pick on that game, computes the result
 *      (WIN/LOSS/PUSH) and flips it via `updateMany where: { result: PENDING }`
 *      so concurrent cycles can't double-settle.
 *   4. Writes settlement outcome into the immutable PickSignalSnapshot so
 *      outcome-anchored learning data accumulates.
 *   5. Writes TeamGameLog entries for ATS form tracking (data-quality gated).
 *
 * All errors inside a sport's loop are swallowed — settlement for one sport
 * must never block settlement for another.
 */

import { db } from "@sports/db";
import {
  OddsApiClient,
  DataNormalizer,
  settleGameLogs,
  type SupportedSportKey,
} from "@sports/data-ingestion";
import {
  calculatePickResult,
  type ReadinessGates,
} from "@sports/prediction-engine";

export interface SettleSportConfig {
  key: SupportedSportKey;
}

export interface SettleResultsOptions {
  sports: readonly SettleSportConfig[];
  apiKey: string;
  gates: ReadinessGates;
  logPrefix?: string;
  /** How many days of scores to fetch per sport. Default 2. */
  daysFrom?: number;
}

export interface SettleResultsSummary {
  sport: string;
  gamesCompleted: number;
  picksSettled: number;
  error?: string;
}

export async function settleResults(
  opts: SettleResultsOptions
): Promise<SettleResultsSummary[]> {
  const {
    sports,
    apiKey,
    gates,
    logPrefix = "[settlement]",
    daysFrom = 2,
  } = opts;

  const isBootstrap = !gates.canPersistCanonicalHistory;
  const client = new OddsApiClient(apiKey);
  const normalizer = new DataNormalizer();

  const summaries: SettleResultsSummary[] = [];

  for (const sport of sports) {
    let gamesCompleted = 0;
    let picksSettled = 0;
    try {
      const { data: scores } = await client.getScores(sport.key, daysFrom);
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
          data: {
            homeScore: score.homeScore,
            awayScore: score.awayScore,
            status: "FINAL",
            // Flip the schema-level flag so downstream queries can find
            // already-settled games without re-parsing status.
            resultFetched: true,
          },
        });
        gamesCompleted++;

        if (score.homeScore === null || score.awayScore === null) continue;

        const settledAt = new Date();
        for (const pick of game.picks) {
          const result = calculatePickResult(
            pick.pickType as "SPREAD" | "MONEYLINE" | "TOTAL",
            pick.selection,
            pick.line,
            game.homeTeamName,
            score.homeScore,
            score.awayScore,
            sport.key
          );

          // Double-settle guard.
          const { count: settledCount } = await db.pick.updateMany({
            where: { id: pick.id, result: "PENDING" },
            data: { result, settledAt },
          });
          if (settledCount === 0) continue;
          picksSettled++;

          const isDecisiveResult =
            result === "WIN" || result === "LOSS" || result === "PUSH";
          const isEligibleForLearning =
            gates.canLearnFromOutcomes &&
            !pick.isBootstrap &&
            isDecisiveResult;

          try {
            await db.pickSignalSnapshot.updateMany({
              where: { pickId: pick.id, settlementResult: null },
              data: {
                settlementResult: result,
                settledAt,
                eligibleForLearning: isEligibleForLearning,
                ...(isEligibleForLearning
                  ? { learningEligibleAt: settledAt }
                  : {}),
              },
            });
          } catch (snapErr) {
            console.warn(
              `${logPrefix} Snapshot outcome update failed for pick ${pick.id}: ` +
                (snapErr instanceof Error ? snapErr.message : snapErr)
            );
          }
        }

        // TeamGameLog for ATS form. Data-quality gate prevents thin-coverage
        // games from corrupting history.
        const openingSpreadOdds = await db.openingLine.findUnique({
          where: {
            gameId_market: { gameId: game.id, market: "SPREADS" },
          },
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
            isBootstrap,
            gameDataQualityScore: game.dataQualityScore,
            minDataQualityThreshold: gates.minDataQualityForGameLog,
          });
        } catch (settleErr) {
          console.warn(
            `${logPrefix} GameLog failed for ${game.id}: ` +
              (settleErr instanceof Error ? settleErr.message : settleErr)
          );
        }
      }

      summaries.push({
        sport: sport.key,
        gamesCompleted,
        picksSettled,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${logPrefix} ${sport.key}: ${message}`);
      summaries.push({
        sport: sport.key,
        gamesCompleted,
        picksSettled,
        error: message,
      });
    }
  }

  return summaries;
}
