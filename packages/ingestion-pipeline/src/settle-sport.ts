/**
 * settleSport — Single source of truth for per-sport pick settlement.
 *
 * Mirror of `processSport`: the canonical settlement implementation that BOTH
 * the long-running data-refresh worker AND the Vercel `settle-picks` cron call,
 * so the two execution paths can never drift. Previously this logic lived inline
 * in `workers/data-refresh/src/index.ts` and the cron was a no-op stub — meaning
 * settlement only happened if a separate worker box was alive. Extracting it here
 * lets the cron grade games on Vercel's schedule with identical behavior.
 *
 * Settlement ALWAYS runs regardless of bootstrap mode — real game outcomes are
 * source truth and must be recorded. The `isBootstrap`/learning-eligibility flags
 * only govern whether a settled pick feeds canonical calibration, never whether
 * it settles.
 *
 * Steps (per sport):
 *   1. Fetch recent scores from The Odds API (daysFrom=2)
 *   2. For each COMPLETED game with PENDING picks: mark FINAL + record scores
 *   3. Settle each pending pick via calculatePickResult() (pure, unit-tested)
 *   4. Record the outcome into the immutable PickSignalSnapshot (idempotent)
 *   5. Write TeamGameLog entries for ATS form (data-quality gated)
 *
 * Errors are caught and returned as status:"failed" — never thrown — so one bad
 * sport cannot abort the remaining sports in the caller's loop.
 */

import { db } from "@sports/db";
import {
  OddsApiClient,
  DataNormalizer,
  settleGameLogs,
} from "@sports/data-ingestion";
import type { SupportedSportKey } from "@sports/data-ingestion";
import {
  calculatePickResult,
  deriveClosingSnapshotFromOdds,
  gradePickClv,
  selectGradingLine,
} from "@sports/prediction-engine";
import type { ReadinessGates, PickKind } from "@sports/prediction-engine";
import { recordPickSettlementSnapshot } from "./settlement-snapshots.js";

export interface SettleSportConfig {
  key: SupportedSportKey;
  name: string;
  displayName: string;
}

export interface SettleSportResult {
  sport: string;
  status: "success" | "failed";
  gamesSettled: number;
  picksSettled: number;
  picksVoided: number;
  error?: string;
}

type NormalizedScore = {
  externalId: string;
  homeScore: number | null;
  awayScore: number | null;
  completed: boolean;
};

const SCORES_DAYS_FROM = 3;
const VOID_STALE_HOURS = 72;

/**
 * Settle all completed games for one sport.
 *
 * @param sport     - Sport configuration (key, name, displayName)
 * @param apiKey    - The Odds API key
 * @param gates     - Readiness gates (read once per cycle by the caller)
 * @param logPrefix - Log prefix for distinguishing caller context, e.g. "[settlement]"
 */
export async function settleSport(
  sport: SettleSportConfig,
  apiKey: string,
  gates: ReadinessGates,
  logPrefix: string = "[settlement]",
): Promise<SettleSportResult> {
  // Bootstrap provenance for any TeamGameLog written during settlement.
  const isBootstrap = !gates.canPersistCanonicalHistory;
  const client = new OddsApiClient(apiKey);
  const normalizer = new DataNormalizer();

  let gamesSettled = 0;
  let picksSettled = 0;
  let picksVoided = 0;
  let feedError: string | null = null;

  try {
    const normalized: NormalizedScore[] = [];
    try {
      const { data: scores } = await client.getScores(sport.key, SCORES_DAYS_FROM);
      normalized.push(...normalizer.normalizeScores(scores));
    } catch (error) {
      feedError = error instanceof Error ? error.message : String(error);
      console.error(`${logPrefix} ${sport.key} failed: ${feedError}`);
    }

    try {
      const recordedFinals = await db.game.findMany({
        where: {
          sport: { key: sport.key },
          status: "FINAL",
          homeScore: { not: null },
          awayScore: { not: null },
          picks: {
            some: {
              OR: [
                { result: "PENDING" },
                { result: { in: ["WIN", "LOSS", "PUSH"] }, clvGradedAt: null },
              ],
            },
          },
        },
        select: {
          externalId: true,
          homeScore: true,
          awayScore: true,
        },
      });
      const seen = new Set(normalized.map((score) => score.externalId));
      for (const game of recordedFinals) {
        if (
          seen.has(game.externalId) ||
          game.homeScore === null ||
          game.awayScore === null
        ) {
          continue;
        }
        normalized.push({
          externalId: game.externalId,
          homeScore: game.homeScore,
          awayScore: game.awayScore,
          completed: true,
        });
      }
    } catch (error) {
      console.warn(
        `${logPrefix} Recorded-final catch-up failed for ${sport.key}: ` +
          `${error instanceof Error ? error.message : error}`
      );
    }

    for (const score of normalized) {
      if (!score.completed) continue;

      const game = await db.game.findUnique({
        where: { externalId: score.externalId },
        include: {
          picks: {
            where: {
              OR: [
                { result: "PENDING" },
                { result: { in: ["WIN", "LOSS", "PUSH"] }, clvGradedAt: null },
              ],
            },
            include: { proofReceipt: { select: { payload: true } } },
          },
        },
      });
      if (!game) continue;

      const bothScores = score.homeScore !== null && score.awayScore !== null;

      // Never write scores unless BOTH are present. A completed-but-scoreless
      // feed row (Odds API drops the scores array for an older completed game,
      // a PPD/cancelled game flagged completed=true, or a team-name lookup miss)
      // must NOT overwrite a previously-recorded FINAL score with null — that
      // would erase a published outcome and leave an inconsistent FINAL-with-null
      // state that score-verification / settlement / backtest consumers read as
      // the result. Gate the whole data object: an empty update is a harmless
      // no-op that preserves the existing recorded score and status.
      await db.game.update({
        where: { id: game.id },
        data: bothScores
          ? {
              homeScore: score.homeScore,
              awayScore: score.awayScore,
              status: "FINAL" as const,
            }
          : {},
      });

      // The inline null-check (not the bothScores boolean) is what narrows the
      // score types to `number` for the settlement math below.
      if (score.homeScore !== null && score.awayScore !== null) {
        // Settle pick results — always runs, regardless of bootstrap mode.
        // Real game outcomes are source truth and must be recorded.
        const settledAt = new Date();

        // Closing-line snapshot for CLV grading — the last odds batch before
        // kickoff, derived from the timestamped Odds history. Fetched once per
        // game and guarded: a CLV failure must never block settlement.
        let closingSnapshot: ReturnType<typeof deriveClosingSnapshotFromOdds> | null = null;
        try {
          const closingOdds = await db.odds.findMany({
            where: { gameId: game.id, fetchedAt: { lte: game.commenceTime } },
            orderBy: { fetchedAt: "desc" },
            take: 80,
            select: {
              market: true,
              fetchedAt: true,
              spread: true,
              total: true,
              homePrice: true,
              awayPrice: true,
            },
          });
          closingSnapshot = deriveClosingSnapshotFromOdds(
            closingOdds,
            game.commenceTime,
            sport.key,
          );
        } catch (clvErr) {
          console.warn(
            `${logPrefix} Closing-line fetch failed for game ${game.id}: ` +
            `${clvErr instanceof Error ? clvErr.message : clvErr}`,
          );
        }

        for (const pick of game.picks) {
          // Grade against the LOCKED line (the number we published, receipted, and
          // CLV-graded the pick at) — NOT pick.line, which can drift on every refresh
          // cycle while the pick is PENDING. Grading SPREAD/TOTAL against a drifted line
          // would settle a published WIN as a LOSS and contradict the CLV verdict (which
          // already uses clvLockLine below). Fall back to pick.line only for legacy rows
          // with no lock. (MONEYLINE ignores the line entirely.)
          const alreadySettled =
            pick.result === "WIN" || pick.result === "LOSS" || pick.result === "PUSH";
          let result: ReturnType<typeof calculatePickResult>;
          if (alreadySettled) {
            result = pick.result as ReturnType<typeof calculatePickResult>;
          } else {
            const gradingLine = selectGradingLine(pick);
            result = calculatePickResult(
              pick.pickType as "SPREAD" | "MONEYLINE" | "TOTAL",
              pick.selection,
              gradingLine,
              game.homeTeamName,
              score.homeScore,
              score.awayScore,
              sport.key,
            );
          // Idempotent settle. game.picks was read with result:"PENDING", but
          // the worker and the Vercel settle-picks cron can both reach this game
          // between that read and this write. updateMany scoped to
          // result:"PENDING" makes the write a no-op for the loser of the race
          // (count===0) — so the first settlement and its settledAt stay
          // immutable and CLV is never re-graded against a second close.
            const settled = await db.pick.updateMany({
              where: { id: pick.id, result: "PENDING" },
              data: { result, settledAt },
            });
            if (settled.count === 0) continue;
          }

          // Grade Closing-Line Value against the immutable lock snapshot
          // (clvLockLine/clvLockPrice, captured at publish). Additive and
          // guarded — never blocks settlement. Returns null (and we skip) when
          // there is no close or no lock to compare.
          if (
            closingSnapshot?.capturedAt &&
            hasObservedMarketContract(pick.proofReceipt?.payload)
          ) {
            try {
              const grade = gradePickClv({
                pickType: pick.pickType as PickKind,
                selection: pick.selection,
                homeTeamName: game.homeTeamName,
                lockLine: pick.clvLockLine,
                lockPrice: pick.clvLockPrice,
                close: closingSnapshot,
              });
              if (grade) {
                await db.pick.updateMany({
                  where: { id: pick.id, clvGradedAt: null },
                  data: {
                    clvCloseLine: grade.closeLine,
                    clvClosePrice: grade.closePrice,
                    clvKind: grade.kind,
                    clvValue: grade.value,
                    clvVerdict: grade.verdict,
                    clvCapturedAt: closingSnapshot.capturedAt,
                    clvGradedAt: settledAt,
                  },
                });
              }
            } catch (clvErr) {
              console.warn(
                `${logPrefix} CLV grading failed for pick ${pick.id}: ` +
                `${clvErr instanceof Error ? clvErr.message : clvErr}`,
              );
            }
          }

          // Record settlement outcome in the PickSignalSnapshot — real result tied
          // to the signal conditions present at prediction time. eligibleForLearning
          // is set ONLY when: (1) canLearnFromOutcomes, (2) pick was canonical
          // (isBootstrap=false), (3) result is decisive (WIN/LOSS/PUSH — not VOID).
          const isDecisiveResult = result === "WIN" || result === "LOSS" || result === "PUSH";
          const isEligibleForLearning =
            gates.canLearnFromOutcomes && !pick.isBootstrap && isDecisiveResult;

          try {
            const snapshotStatus = await recordPickSettlementSnapshot({
              db,
              pick,
              result,
              settledAt,
              isEligibleForLearning,
              gameDataQualityScore: game.dataQualityScore,
            });
            if (snapshotStatus === "created-fallback") {
              console.warn(
                `${logPrefix} Created fallback PickSignalSnapshot for pick ${pick.id}; ` +
                "prediction-time snapshot was missing.",
              );
            }
          } catch (snapErr) {
            // Non-fatal: snapshot update failure must never kill settlement.
            console.warn(
              `${logPrefix} Snapshot outcome update failed for pick ${pick.id}: ` +
              `${snapErr instanceof Error ? snapErr.message : snapErr}`,
            );
          }
          if (!alreadySettled) picksSettled++;
        }

        // Write TeamGameLog entries for ATS form tracking.
        // isBootstrap propagated from current mode — marks creation era.
        // Data quality gate prevents corrupt ATS data from thin-coverage games.
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
            isBootstrap,
            gameDataQualityScore: game.dataQualityScore,
            minDataQualityThreshold: gates.minDataQualityForGameLog,
          });
        } catch (settleErr) {
          console.warn(
            `${logPrefix} GameLog failed for ${game.id}: ` +
            `${settleErr instanceof Error ? settleErr.message : settleErr}`,
          );
        }

        gamesSettled++;
      }
    }

    try {
      const cutoff = new Date(Date.now() - VOID_STALE_HOURS * 60 * 60 * 1000);
      const staleGames = await db.game.findMany({
        where: {
          sport: { key: sport.key },
          commenceTime: { lt: cutoff },
          picks: { some: { result: "PENDING" } },
          NOT: {
            status: "FINAL",
            homeScore: { not: null },
            awayScore: { not: null },
          },
        },
        include: { picks: { where: { result: "PENDING" } } },
      });

      for (const game of staleGames) {
        const settledAt = new Date();
        for (const pick of game.picks) {
          const voided = await db.pick.updateMany({
            where: { id: pick.id, result: "PENDING" },
            data: { result: "VOID", settledAt },
          });
          if (voided.count === 0) continue;
          try {
            await recordPickSettlementSnapshot({
              db,
              pick,
              result: "VOID",
              settledAt,
              isEligibleForLearning: false,
              gameDataQualityScore: game.dataQualityScore,
            });
          } catch (error) {
            console.warn(
              `${logPrefix} Snapshot VOID update failed for pick ${pick.id}: ` +
                `${error instanceof Error ? error.message : error}`
            );
          }
          picksVoided++;
        }
      }
    } catch (error) {
      console.warn(
        `${logPrefix} Stale-pick VOID sweep failed for ${sport.key}: ` +
          `${error instanceof Error ? error.message : error}`
      );
    }

    if (feedError) {
      return {
        sport: sport.key,
        status: "failed",
        gamesSettled,
        picksSettled,
        picksVoided,
        error: feedError,
      };
    }

    return {
      sport: sport.key,
      status: "success",
      gamesSettled,
      picksSettled,
      picksVoided,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${logPrefix} ${sport.key} failed: ${message}`);
    return {
      sport: sport.key,
      status: "failed",
      gamesSettled,
      picksSettled,
      picksVoided,
      error: message,
    };
  }
}

function hasObservedMarketContract(payload: string | null | undefined): boolean {
  return typeof payload === "string" && /(?:^|\|)sport=/.test(payload);
}
