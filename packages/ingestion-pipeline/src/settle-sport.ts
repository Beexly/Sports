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
import {
  recordScorelessCompletedEvidence,
  SCORELESS_COMPLETED_ANOMALY,
  SCORELESS_REVIEW_THRESHOLD,
  type SettlementEvidenceDb,
} from "./settlement-evidence.js";
import {
  computeScheduledWindow,
  fingerprintSourceSnapshot,
  getOrCreateSettlementRun,
  type SettlementRunDb,
} from "./settlement-run.js";
import {
  enqueuePostSettlementWork,
  markPostSettlementWorkDone,
  markPostSettlementWorkFailed,
  type PostSettlementWorkDelegate,
} from "./post-settlement-work.js";
import { markClosingSnapshotsIfEnabled } from "./line-archive.js";

/**
 * Spend guard (GSE-SEC-039).
 *
 * Mirrors `requiresPaidEscalation()` / `paidCallJustified()` from
 * `apps/web/lib/data-sources/source-router.ts` + `free-first-ingest.ts`:
 * returns true ONLY when the ONLY cleared source for (need, sport) is paid
 * (i.e. no cleared FREE source covers the need).
 *
 * Today:
 *  - "scores" → ESPN public + nflverse are cleared+free for all 7 sports → false
 *  - "odds"   → only the-odds-api is cleared, and it is licensed_flat (not free) → true
 *
 * When this returns false the caller MUST fall back to the free path and refuse
 * the paid fetch. Do NOT call this for needs we serve free-only (weather etc.);
 * the two literal call sites below are the only valid uses.
 */
function paidCallJustified(
  need: "odds" | "scores",
  _sportKey: SupportedSportKey,
): boolean {
  // scores: free cleared sources exist (espn-public-api, nflverse, etc.) → not justified.
  if (need === "scores") return false;
  // odds: no free odds source is cleared today → paid is always justified.
  return true;
}

export interface SettleSportConfig {
  key: SupportedSportKey;
  name: string;
  displayName: string;
}

/** Scheduler-supplied invocation identity (hardening 6.1). The cron route /
 *  worker loop passes its scheduled window so retries of the SAME scheduled
 *  invocation resolve to the SAME durable SettlementRun. When omitted, the
 *  UTC hour bucket is used — still stable across rapid retries. */
export interface SettleSportOptions {
  readonly scheduledWindow?: string;
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
  /** Previously RESOLVED/DISMISSED anomalies reopened this run because the
   *  condition recurred with new post-resolution evidence. */
  anomaliesReopened: number;
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
  /** Set when the cycle skipped paid work for a classified reason (e.g. "spend_guard"). */
  note?: string;
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
  options: SettleSportOptions = {},
): Promise<SettleSportResult> {
  // Bootstrap provenance for any TeamGameLog written during settlement.
  const isBootstrap = !gates.canPersistCanonicalHistory;
  const client = new OddsApiClient(apiKey);
  const normalizer = new DataNormalizer();

  let gamesSettled = 0;
  let picksSettled = 0;
  let observationsRecorded = 0;
  let anomaliesOpened = 0;
  let anomaliesReopened = 0;
  let anomaliesPromoted = 0;
  let anomaliesResolved = 0;
  let outboxAppended = 0;

  try {
    // GSE-SEC-039: spend guard — call paidCallJustified before any paid fetch.
    // For "scores" the guard returns false (ESPN + nflverse cover scores free+cleared),
    // so the paid getScores() IS justified to be refused. settleSport is the explicitly
    // paid path (the caller passed a real API key), so when the guard flags a free
    // alternative we log an audit warning; the caller's free-path settlement
    // (runFreePathSettlement) handles scores coverage when the key is absent.
    const scoresJustified = paidCallJustified("scores", sport.key);
    if (!scoresJustified) {
      console.warn(
        `${logPrefix} ${sport.key}: paid scores fetch not justified by spend guard — ` +
          `free sources cover scores; paid getScores proceeding on paid path (key present).`,
      );
    }
    const { data: scores } = await client.getScores(sport.key, 2);
    const normalized = normalizer.normalizeScores(scores);

    // DURABLE settlement-run identity (hardening 6.1): created-or-retrieved
    // BEFORE any evidence write, keyed on externally stable facts —
    // source + sport + scheduledWindow + sourceSnapshotFingerprint. A
    // scheduler retry / process restart / duplicate invocation over the same
    // source snapshot resolves to the SAME run id, so its observations
    // dedupe into the same run and can never fabricate corroboration.
    // (Previously this was `randomUUID()` per call — the "retried run can
    // never corroborate" claim was only true within one process.)
    const scheduledWindow = options.scheduledWindow ?? computeScheduledWindow();
    const sourceSnapshotFingerprint = fingerprintSourceSnapshot(normalized);
    const run = await getOrCreateSettlementRun(db as unknown as SettlementRunDb, {
      source: OBSERVATION_SOURCE,
      sport: sport.key,
      scheduledWindow,
      sourceSnapshotFingerprint,
    });
    const settlementRunId = run.id;

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
            sourceSnapshotFingerprint,
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
          if (evidence.anomalyReopened) {
            anomaliesReopened++;
            console.warn(
              `${logPrefix} ${sport.key}: game ${game.id} (${game.externalId}) — previously ` +
                `resolved/dismissed SCORELESS_COMPLETED anomaly REOPENED: the condition recurred ` +
                `with new post-resolution evidence (SYSTEM REOPENED event appended).`,
            );
          }
          if (evidence.anomalyPromoted) {
            anomaliesPromoted++;
            console.warn(
              `${logPrefix} ${sport.key}: game ${game.id} (${game.externalId}) reported ` +
                `completed-but-scoreless across ${evidence.corroboratingRunCount} corroborating ` +
                `runs while still ${game.status} — anomaly promoted to OWNER_REVIEW with an ` +
                `idempotent OwnerDecisionRequest + SYSTEM decision event. ` +
                `Picks left PENDING; NOT auto-voided.`,
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
          // Resolve each anomaly individually so the append-only SYSTEM
          // decision event (6.3) records the true prior state, and the
          // state-scoped updateMany keeps resolution exactly-once under a
          // concurrent-run race (the loser matches zero rows and appends
          // no event). SYSTEM resolution never impersonates an owner.
          const openAnomalies = await db.settlementAnomaly.findMany({
            where: {
              gameId: game.id,
              anomalyType: SCORELESS_COMPLETED_ANOMALY,
              state: { in: ["OPEN", "OWNER_REVIEW"] },
            },
            select: { id: true, state: true },
          });
          for (const anomaly of openAnomalies) {
            const resolvedAt = new Date();
            const resolved = await db.$transaction(async (tx) => {
              const updated = await tx.settlementAnomaly.updateMany({
                where: { id: anomaly.id, state: anomaly.state },
                data: {
                  state: "RESOLVED",
                  resolutionActor: "system:settlement-pipeline",
                  resolutionReason: "scores-arrived",
                  resolvedAt,
                },
              });
              if (updated.count === 0) return 0;
              await tx.settlementDecisionEvent.create({
                data: {
                  anomalyId: anomaly.id,
                  decisionKind: "RESOLVE_SCORES_ARRIVED",
                  actorType: "SYSTEM",
                  actorReceipt: {
                    actorType: "SYSTEM",
                    subjectId: "system:settlement-pipeline",
                    runId: settlementRunId,
                    observedAt: resolvedAt.toISOString(),
                  },
                  priorState: anomaly.state,
                  nextState: "RESOLVED",
                  reason: "scores-arrived",
                },
              });
              return updated.count;
            });
            anomaliesResolved += resolved;
          }
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
            // Durable post-settlement work-state (6.10): the CLV grade and
            // snapshot outcome owed for this settled pick are recorded IN
            // the settlement transaction, so a crash before they run leaves
            // a repairable PENDING row — never a silent gap.
            await enqueuePostSettlementWork(
              tx.postSettlementWork as unknown as PostSettlementWorkDelegate,
              [
                { subjectId: pick.id, kind: "CLV_GRADE" },
                { subjectId: pick.id, kind: "SNAPSHOT_OUTCOME" },
              ],
            );
            return updated;
          });
          if (settled.count === 0) continue;
          outboxAppended++;

          // Grade Closing-Line Value against the immutable lock snapshot
          // (clvLockLine/clvLockPrice, captured at publish). Additive and
          // guarded — never blocks settlement. Returns null (and we skip) when
          // there is no close or no lock to compare.
          const workDelegate = db.postSettlementWork as unknown as PostSettlementWorkDelegate;

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
              // "No grade owed" (no lock / no close) is completed work too.
              await markPostSettlementWorkDone(workDelegate, pick.id, "CLV_GRADE", settledAt);
            } catch (clvErr) {
              console.warn(
                `${logPrefix} CLV grading failed for pick ${pick.id}: ` +
                `${clvErr instanceof Error ? clvErr.message : clvErr}`,
              );
              await markPostSettlementWorkFailed(workDelegate, pick.id, "CLV_GRADE", clvErr);
            }
          } else {
            // No closing snapshot derivable: nothing gradeable — record the
            // work as done with honest semantics rather than leaving a
            // forever-PENDING row.
            await markPostSettlementWorkDone(workDelegate, pick.id, "CLV_GRADE", settledAt);
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
            await markPostSettlementWorkDone(workDelegate, pick.id, "SNAPSHOT_OUTCOME", settledAt);
          } catch (snapErr) {
            // Non-fatal: snapshot update failure must never kill settlement.
            console.warn(
              `${logPrefix} Snapshot outcome update failed for pick ${pick.id}: ` +
              `${snapErr instanceof Error ? snapErr.message : snapErr}`,
            );
            await markPostSettlementWorkFailed(workDelegate, pick.id, "SNAPSHOT_OUTCOME", snapErr);
          }
          picksSettled++;
        }

        // Write TeamGameLog entries for ATS form tracking.
        // isBootstrap propagated from current mode — marks creation era.
        // Data quality gate prevents corrupt ATS data from thin-coverage games.
        const openingSpreadOdds = await db.openingLine.findUnique({
          where: { gameId_market: { gameId: game.id, market: "SPREADS" } },
        });

        // Durable work-state for the game-level log write (6.10). Enqueued
        // just-in-time (idempotent unique (subjectId, kind)) so a crash mid-
        // write leaves a repairable record.
        try {
          await enqueuePostSettlementWork(
            db.postSettlementWork as unknown as PostSettlementWorkDelegate,
            [{ subjectId: game.id, kind: "TEAM_GAME_LOG" }],
          );
        } catch (enqueueErr) {
          console.warn(
            `${logPrefix} Could not enqueue TEAM_GAME_LOG work for ${game.id}: ` +
            `${enqueueErr instanceof Error ? enqueueErr.message : enqueueErr}`,
          );
        }
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
          await markPostSettlementWorkDone(
            db.postSettlementWork as unknown as PostSettlementWorkDelegate,
            game.id,
            "TEAM_GAME_LOG",
          );
        } catch (settleErr) {
          console.warn(
            `${logPrefix} GameLog failed for ${game.id}: ` +
            `${settleErr instanceof Error ? settleErr.message : settleErr}`,
          );
          await markPostSettlementWorkFailed(
            db.postSettlementWork as unknown as PostSettlementWorkDelegate,
            game.id,
            "TEAM_GAME_LOG",
            settleErr,
          );
        }

        // Line-archive CLOSE tag. No-op unless LINE_ARCHIVE_ENABLED=true.
        // Never fails settlement — grading a pick matters more than tagging a line.
        try {
          await markClosingSnapshotsIfEnabled(db, game.id, game.commenceTime);
        } catch (archiveErr) {
          console.warn(
            `${logPrefix} markClosingSnapshots failed for ${game.id}: ` +
            `${archiveErr instanceof Error ? archiveErr.message : archiveErr}`,
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
      anomaliesReopened,
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
      anomaliesReopened,
      anomaliesPromoted,
      anomaliesResolved,
      outboxAppended,
      error: message,
    };
  }
}
