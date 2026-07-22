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

import { randomUUID } from "node:crypto";
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
import {
  recordScorelessCompletedEvidence,
  SCORELESS_COMPLETED_ANOMALY,
  SCORELESS_REVIEW_THRESHOLD,
  type SettlementEvidenceDb,
} from "./settlement-evidence.js";

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
  /** New deduplicated completed-but-scoreless sightings recorded this run
   *  (retries of the same run/payload insert nothing and count nothing). */
  observationsRecorded: number;
  /** SCORELESS_COMPLETED anomalies newly opened this run. */
  anomaliesOpened: number;
  /** Anomalies promoted OPEN→OWNER_REVIEW this run (each promotion also
   *  created its exactly-once SettlementDecision receipt). */
  anomaliesPromoted: number;
  /** Anomalies resolved this run because real scores arrived. Evidence and
   *  decision receipts are preserved — resolution never deletes anything. */
  anomaliesResolved: number;
  /** PickSettlementEvent outbox rows appended this run — always in the same
   *  transaction as the pick's PENDING→result update. */
  outboxAppended: number;
  error?: string;
}

/** Upstream feed identifier stamped on every settlement observation. */
const OBSERVATION_SOURCE = "the-odds-api";

// Re-export the evidence constants so callers/tests can reference the
// threshold and anomaly type through the settlement entry point.
export { SCORELESS_COMPLETED_ANOMALY, SCORELESS_REVIEW_THRESHOLD };

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
  let observationsRecorded = 0;
  let anomaliesOpened = 0;
  let anomaliesPromoted = 0;
  let anomaliesResolved = 0;
  let outboxAppended = 0;

  // One settlement run id per settleSport() call. Every observation this
  // run records carries it, so corroboration (COUNT DISTINCT settlementRunId)
  // counts RUNS, not sightings — and a retried run can never corroborate.
  const settlementRunId = randomUUID();

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

      // ── Settlement evidence (Phase 1E) ─────────────────────────────────
      // A completed-but-scoreless sighting on a still-open game is recorded
      // as append-only, deduplicated EVIDENCE — never acted on. One db
      // transaction: insert-or-noop the observation, derive corroboration
      // by counting DISTINCT run ids, race-safely upsert the single
      // SCORELESS_COMPLETED anomaly, and (at >= SCORELESS_REVIEW_THRESHOLD
      // distinct runs) promote it to OWNER_REVIEW exactly once with a
      // durable SettlementDecision receipt. Picks stay PENDING, status is
      // never inferred, terminal games never enter this path (the empty
      // update above remains their whole story — unchanged from before).
      // Failure-isolated: a broken evidence write must never abort
      // settlement of the remaining games.
      if (!bothScores && (game.status === "SCHEDULED" || game.status === "LIVE")) {
        try {
          const evidence = await recordScorelessCompletedEvidence({
            db: db as unknown as SettlementEvidenceDb,
            gameId: game.id,
            externalId: game.externalId,
            gameStatus: game.status,
            settlementRunId,
            source: OBSERVATION_SOURCE,
            payload: {
              externalId: score.externalId,
              completed: score.completed,
              homeScore: score.homeScore,
              awayScore: score.awayScore,
            },
            observedAt: new Date(),
          });
          if (evidence.observationRecorded) observationsRecorded++;
          if (evidence.anomalyOpened) anomaliesOpened++;
          if (evidence.anomalyPromoted) {
            anomaliesPromoted++;
            console.warn(
              `${logPrefix} ${sport.key}: game ${game.id} (${game.externalId}) reported ` +
                `completed-but-scoreless across ${evidence.distinctRunCount} distinct runs ` +
                `while still ${game.status} — anomaly promoted to OWNER_REVIEW with a ` +
                `durable SettlementDecision receipt. Picks left PENDING; NOT auto-voided.`,
            );
          }
        } catch (evidenceErr) {
          console.warn(
            `${logPrefix} Settlement evidence write failed for game ${game.id}: ` +
              `${evidenceErr instanceof Error ? evidenceErr.message : evidenceErr}`,
          );
        }
      }

      // The inline null-check (not the bothScores boolean) is what narrows the
      // score types to `number` for the settlement math below.
      if (score.homeScore !== null && score.awayScore !== null) {
        // Real scores arrived: RESOLVE any open SCORELESS_COMPLETED anomaly
        // for this game (it was feed lag after all, or the owner review is
        // now moot). Resolution marks state/reason/timestamp only —
        // observations and the decision receipt are NEVER deleted, so the
        // anomaly history survives (the rejected #157 reset-and-clear
        // behavior destroyed it). Idempotent (updateMany) and non-fatal.
        try {
          const resolved = await db.settlementAnomaly.updateMany({
            where: {
              gameId: game.id,
              anomalyType: SCORELESS_COMPLETED_ANOMALY,
              state: { in: ["OPEN", "OWNER_REVIEW"] },
            },
            data: {
              state: "RESOLVED",
              resolutionActor: "settlement-pipeline",
              resolutionReason: "scores-arrived",
              resolvedAt: new Date(),
            },
          });
          anomaliesResolved += resolved.count;
        } catch (resolveErr) {
          console.warn(
            `${logPrefix} Anomaly resolution failed for game ${game.id}: ` +
              `${resolveErr instanceof Error ? resolveErr.message : resolveErr}`,
          );
        }

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
          closingSnapshot = deriveClosingSnapshotFromOdds(closingOdds, game.commenceTime);
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
          const gradingLine = selectGradingLine(pick);
          const result = calculatePickResult(
            pick.pickType as "SPREAD" | "MONEYLINE" | "TOTAL",
            pick.selection,
            gradingLine,
            game.homeTeamName,
            score.homeScore,
            score.awayScore,
            sport.key,
            game.awayTeamName,
          );
          // Idempotent settle. game.picks was read with result:"PENDING", but
          // the worker and the Vercel settle-picks cron can both reach this game
          // between that read and this write. updateMany scoped to
          // result:"PENDING" makes the write a no-op for the loser of the race
          // (count===0) — so the first settlement and its settledAt stay
          // immutable and CLV is never re-graded against a second close.
          //
          // TRANSACTIONAL OUTBOX: the PickSettlementEvent append rides in
          // the SAME transaction as the pick-result update, so a settlement
          // can never commit without its notification event and an event can
          // never exist for a settlement that rolled back. (The rejected
          // #144 fired its notification hook in-loop after the commit —
          // fail-isolated but not durable: a crash lost the notification, a
          // blind retry risked duplicates.) The unique pickId on the outbox
          // means one settlement = one event, backed by the same PENDING-
          // scoped idempotency: the race loser's count===0 skips the append.
          // Delivery happens elsewhere (the outbox worker), never here.
          const settled = await db.$transaction(async (tx) => {
            const updated = await tx.pick.updateMany({
              where: { id: pick.id, result: "PENDING" },
              data: { result, settledAt },
            });
            if (updated.count === 0) return updated;
            await tx.pickSettlementEvent.create({
              data: {
                pickId: pick.id,
                gameId: game.id,
                result,
                settledAt,
                status: "PENDING",
              },
            });
            return updated;
          });
          if (settled.count === 0) continue;
          outboxAppended++;

          // Grade Closing-Line Value against the immutable lock snapshot
          // (clvLockLine/clvLockPrice, captured at publish). Additive and
          // guarded — never blocks settlement. Returns null (and we skip) when
          // there is no close or no lock to compare.
          if (closingSnapshot?.capturedAt) {
            try {
              const grade = gradePickClv({
                pickType: pick.pickType as PickKind,
                selection: pick.selection,
                homeTeamName: game.homeTeamName,
                awayTeamName: game.awayTeamName,
                lockLine: pick.clvLockLine,
                lockPrice: pick.clvLockPrice,
                close: closingSnapshot,
              });
              if (grade) {
                await db.pick.update({
                  where: { id: pick.id },
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
          picksSettled++;
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

    return {
      sport: sport.key,
      status: "success",
      gamesSettled,
      picksSettled,
      observationsRecorded,
      anomaliesOpened,
      anomaliesPromoted,
      anomaliesResolved,
      outboxAppended,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${logPrefix} ${sport.key} failed: ${message}`);
    return {
      sport: sport.key,
      status: "failed",
      gamesSettled,
      picksSettled,
      observationsRecorded,
      anomaliesOpened,
      anomaliesPromoted,
      anomaliesResolved,
      outboxAppended,
      error: message,
    };
  }
}
