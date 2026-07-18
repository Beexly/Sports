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
 *   1. Fetch recent scores from The Odds API (daysFrom=3, the API's max lookback)
 *   2. For each COMPLETED game with PENDING picks: mark FINAL + record scores
 *   3. Settle each pending pick via calculatePickResult() (pure, unit-tested)
 *   4. Record the outcome into the immutable PickSignalSnapshot (idempotent)
 *   5. Write TeamGameLog entries for ATS form (data-quality gated)
 *   6. Catch-up sweep (M-F9): heal FINAL games whose recorded scores never
 *      reached their picks, then VOID picks whose game has no gradeable outcome
 *      after the stale horizon — no pick may stay PENDING forever.
 *   7. CLV heal (M-F4): heal any already-settled pick whose CLV grade never
 *      got written (a crash between the settle write and the CLV write) — no
 *      settled pick's grade may be lost forever just because its game aged
 *      out of the scores feed's lookback window.
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
import type { SettlementSnapshotPick } from "./settlement-snapshots.js";

/**
 * Scores lookback in days. 3 is The Odds API's documented maximum — anything
 * older than this can never arrive via the scores feed again, which is exactly
 * why the catch-up sweep below exists. Was 2, which let a single pair of
 * missed cron days orphan a whole day of games (M-F9).
 */
const SCORES_DAYS_FROM = 3;

/**
 * VOID horizon (M-F9): a pick still PENDING this many hours after its game's
 * scheduled start, on a game with no gradeable outcome recorded, is VOIDed.
 *
 * Why 72h: it matches the scores feed's maximum lookback (daysFrom=3) — past
 * this point our licensed source can no longer deliver the score, so an honest
 * terminal state must be written instead of an immortal PENDING row that reads
 * as a live pick on every surface. VOID mirrors sportsbook grading convention
 * for postponed/cancelled events (no action), is never learning-eligible, and
 * is excluded from every published record (records filter result WIN/LOSS/PUSH).
 *
 * Postponed-and-rescheduled games self-correct: when the book relists the same
 * event, refresh moves `commenceTime` forward and the sweep leaves it alone
 * until 72h past the NEW start. We never guess the game's status (no fabricated
 * CANCELED writes) — only the pick's disposition changes.
 */
const VOID_STALE_HOURS = 72;

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
  /** Picks terminally VOIDed by the stale sweep (no gradeable outcome). */
  picksVoided: number;
  /** Already-settled picks whose orphaned CLV grade was healed (M-F4). */
  clvGradesHealed: number;
  error?: string;
}

/** The pick fields settlement + CLV + snapshot recording actually consume. */
type SettleablePick = SettlementSnapshotPick & {
  readonly pickType: string;
  readonly selection: string;
  readonly line: number;
  readonly clvLockLine: number | null;
  readonly clvLockPrice: number | null;
};

/** The game fields the shared settlement body actually consumes. */
interface SettleableGame {
  readonly id: string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly commenceTime: Date;
  readonly dataQualityScore: number;
  readonly picks: SettleablePick[];
}

interface SettleContext {
  readonly sport: SettleSportConfig;
  readonly gates: ReadinessGates;
  readonly isBootstrap: boolean;
  readonly logPrefix: string;
}

/**
 * Fetch the closing-line snapshot for CLV grading — the last odds batch
 * before kickoff, derived from the timestamped odds history. Guarded: a
 * fetch failure must never block settlement or a CLV heal; callers treat a
 * null return as "no close available" (CLV stays ungraded, never an error).
 */
async function fetchClosingSnapshot(
  game: { readonly id: string; readonly commenceTime: Date },
  logPrefix: string,
): Promise<ReturnType<typeof deriveClosingSnapshotFromOdds> | null> {
  try {
    const closingOdds = await db.odds.findMany({
      where: { gameId: game.id, fetchedAt: { lte: game.commenceTime } },
      orderBy: { fetchedAt: "desc" },
      // Must cover the ENTIRE closing batch (all rows sharing the max
      // fetchedAt): rows are bookmaker x market, and wide coverage can
      // exceed 80 rows in ONE batch (27+ books x 3 markets), which the old
      // take:80 truncated arbitrarily mid-batch — a consensus close missing
      // whichever books fell past the cap (M-F7). 240 covers 80 books x 3
      // markets while keeping the read bounded; older batches beyond the
      // cap are irrelevant (only the latest batch is the close).
      take: 240,
      select: {
        market: true,
        fetchedAt: true,
        spread: true,
        total: true,
        homePrice: true,
        awayPrice: true,
      },
    });
    return deriveClosingSnapshotFromOdds(closingOdds, game.commenceTime);
  } catch (clvErr) {
    console.warn(
      `${logPrefix} Closing-line fetch failed for game ${game.id}: ` +
      `${clvErr instanceof Error ? clvErr.message : clvErr}`,
    );
    return null;
  }
}

/**
 * Grade Closing-Line Value against the immutable lock snapshot
 * (clvLockLine/clvLockPrice, captured at publish) and write it.
 *
 * Grade-once (M-F4): the write is a conditional `updateMany` keyed on
 * `clvGradedAt` still null, mirroring settle-once's PENDING-scoped write —
 * so a concurrent grader (the live path, the FINAL heal arm, or a later
 * orphan re-run all racing the same pick) can never overwrite an existing
 * verdict with a grade against a second, different close.
 *
 * Additive and guarded — never throws. Returns true only when a grade was
 * actually written (false for no close, no grade, or the losing side of a
 * grade-once race).
 */
async function gradeAndRecordClv(
  game: { readonly homeTeamName: string; readonly awayTeamName: string },
  pick: SettleablePick,
  closingSnapshot: ReturnType<typeof deriveClosingSnapshotFromOdds> | null,
  gradedAt: Date,
  logPrefix: string,
): Promise<boolean> {
  if (!closingSnapshot?.capturedAt) return false;
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
    if (!grade) return false;
    const graded = await db.pick.updateMany({
      where: { id: pick.id, clvGradedAt: null },
      data: {
        clvCloseLine: grade.closeLine,
        clvClosePrice: grade.closePrice,
        clvKind: grade.kind,
        clvValue: grade.value,
        clvVerdict: grade.verdict,
        clvCapturedAt: closingSnapshot.capturedAt,
        clvGradedAt: gradedAt,
      },
    });
    return graded.count > 0;
  } catch (clvErr) {
    console.warn(
      `${logPrefix} CLV grading failed for pick ${pick.id}: ` +
      `${clvErr instanceof Error ? clvErr.message : clvErr}`,
    );
    return false;
  }
}

/**
 * Settle every pending pick on ONE completed game from its final scores, grade
 * CLV, record signal snapshots, and write the TeamGameLog entries.
 *
 * This is the single settlement body shared by the live scores-feed loop and
 * the catch-up sweep — extracted so the two paths cannot drift (the same
 * no-drift rule this module exists to enforce between worker and cron).
 *
 * Returns the number of picks settled by THIS call (idempotent losers of the
 * worker/cron race count zero).
 */
async function settleCompletedGame(
  ctx: SettleContext,
  game: SettleableGame,
  homeScore: number,
  awayScore: number,
): Promise<number> {
  const { sport, gates, isBootstrap, logPrefix } = ctx;
  let picksSettled = 0;

  // Settle pick results — always runs, regardless of bootstrap mode.
  // Real game outcomes are source truth and must be recorded.
  const settledAt = new Date();

  // Closing-line snapshot for CLV grading — the last odds batch before
  // kickoff, derived from the timestamped Odds history. Fetched once per
  // game and guarded: a CLV failure must never block settlement.
  const closingSnapshot = await fetchClosingSnapshot(game, logPrefix);

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
      homeScore,
      awayScore,
      sport.key,
      game.awayTeamName,
    );
    // Idempotent settle. Picks were read with result:"PENDING", but the worker
    // and the Vercel settle-picks cron can both reach this game between that
    // read and this write. updateMany scoped to result:"PENDING" makes the
    // write a no-op for the loser of the race (count===0) — so the first
    // settlement and its settledAt stay immutable and CLV is never re-graded
    // against a second close.
    const settled = await db.pick.updateMany({
      where: { id: pick.id, result: "PENDING" },
      data: { result, settledAt },
    });
    if (settled.count === 0) continue;

    // Grade Closing-Line Value against the immutable lock snapshot
    // (clvLockLine/clvLockPrice, captured at publish). Additive and
    // guarded — never blocks settlement. A missed grade here (no close, a
    // transient failure, or a race lost to a concurrent grader) is not
    // fatal: the CLV-heal sweep arm below re-attempts it on every future
    // cycle until it succeeds (M-F4).
    await gradeAndRecordClv(game, pick, closingSnapshot, settledAt, logPrefix);

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
  // Data quality gate prevents corrupt ATS data from thin-coverage games.
  //
  // Bootstrap provenance: the current run mode alone is NOT sufficient — the
  // catch-up heal can process a game long after settlement should have run,
  // including ACROSS the bootstrap→canonical flip. A game whose picks were
  // created during bootstrap must never write a canonical-tagged log just
  // because the heal happened to run later (that would let bootstrap-era data
  // into derived ATS/H2H history). Tag bootstrap when the current mode is
  // bootstrap OR any pick on the game carries bootstrap provenance —
  // over-tagging merely excludes a log from derived history (conservative);
  // under-tagging corrupts it. Games with no pending picks fall back to the
  // current mode, exactly the pre-existing behavior.
  const logIsBootstrap = isBootstrap || game.picks.some((p) => p.isBootstrap);
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
      homeScore,
      awayScore,
      spread: openingSpreadOdds?.spread ?? null,
      isBootstrap: logIsBootstrap,
      gameDataQualityScore: game.dataQualityScore,
      minDataQualityThreshold: gates.minDataQualityForGameLog,
    });
  } catch (settleErr) {
    console.warn(
      `${logPrefix} GameLog failed for ${game.id}: ` +
      `${settleErr instanceof Error ? settleErr.message : settleErr}`,
    );
  }

  return picksSettled;
}

/** The pick + parent-game fields an orphaned CLV heal actually consumes. */
interface OrphanedClvPick extends SettleablePick {
  readonly result: "WIN" | "LOSS" | "PUSH";
  readonly settledAt: Date | null;
  readonly game: {
    readonly id: string;
    readonly homeTeamName: string;
    readonly awayTeamName: string;
    readonly commenceTime: Date;
    readonly dataQualityScore: number;
  };
}

/**
 * CLV heal (M-F4) — a settled pick whose CLV grade was orphaned.
 *
 * Settlement writes the result, then grades CLV, then records the signal
 * snapshot. A crash (or a race loss where the *winner* then crashed) between
 * the settle write and the CLV write leaves a pick with `result != PENDING`
 * and `clvGradedAt: null`. No query anywhere in this module ever re-reads a
 * non-PENDING pick, so that grade — the input to the public beat-close rate
 * and the ESTABLISHED pricing-phase gate — would otherwise be lost forever
 * the moment the pick's game ages out of the scores feed's lookback window.
 *
 * The recorded RESULT is immutable truth and is never re-derived here
 * (re-running settlement against a possibly-different feed could contradict
 * an already-published grade) — only the missing CLV grade, and defensively
 * the settlement snapshot (via the same idempotent write used at first
 * settlement, in case that write was orphaned too), are healed. Grouped by
 * game so a shared closing-odds fetch is not repeated per pick. Feed-
 * independent, DB-only, no age cutoff — symmetric with the HEAL arm above:
 * an orphan is an anomaly whenever it exists.
 *
 * Returns the number of picks whose CLV grade was actually written this
 * call (a close that still can't be derived is not a failure — it is
 * retried on the next sweep, exactly like a normal settle with no close).
 */
async function healOrphanedClvGrades(ctx: SettleContext): Promise<number> {
  const { sport, gates, logPrefix } = ctx;
  let picksHealed = 0;

  const orphans = (await db.pick.findMany({
    where: {
      result: { in: ["WIN", "LOSS", "PUSH"] },
      clvGradedAt: null,
      game: { sport: { key: sport.key } },
    },
    include: { game: true },
  })) as unknown as readonly OrphanedClvPick[];

  const byGame = new Map<string, OrphanedClvPick[]>();
  for (const pick of orphans) {
    const list = byGame.get(pick.gameId) ?? [];
    list.push(pick);
    byGame.set(pick.gameId, list);
  }

  for (const [gameId, picks] of byGame) {
    // Every list here was built by at least one push above; never empty.
    const [firstPick] = picks;
    if (!firstPick) continue;
    const game = firstPick.game;
    const closingSnapshot = await fetchClosingSnapshot(game, logPrefix);
    const healedAt = new Date();

    for (const pick of picks) {
      const graded = await gradeAndRecordClv(game, pick, closingSnapshot, healedAt, logPrefix);
      if (graded) {
        picksHealed++;
        console.warn(
          `${logPrefix} Healed orphaned CLV grade for pick ${pick.id} on game ${gameId} ` +
          `(the settled result was never lost — only its CLV grade had gone missing).`,
        );
      }

      // Defensive: the same crash that orphaned the CLV write could also have
      // orphaned the PickSignalSnapshot outcome write. recordPickSettlementSnapshot
      // writes only where settlementResult is still null, so re-invoking it for
      // an already-recorded snapshot is a safe, idempotent no-op.
      try {
        await recordPickSettlementSnapshot({
          db,
          pick,
          result: pick.result,
          settledAt: pick.settledAt ?? healedAt,
          // The query scopes to WIN/LOSS/PUSH only — always a decisive result.
          isEligibleForLearning: gates.canLearnFromOutcomes && !pick.isBootstrap,
          gameDataQualityScore: game.dataQualityScore,
        });
      } catch (snapErr) {
        console.warn(
          `${logPrefix} Snapshot heal failed for orphaned pick ${pick.id}: ` +
          `${snapErr instanceof Error ? snapErr.message : snapErr}`,
        );
      }
    }
  }

  return picksHealed;
}

/**
 * Catch-up sweep (M-F9 + M-F4) — the feed-independent half of settlement.
 *
 * The scores feed only reaches back SCORES_DAYS_FROM days, so any game that
 * slips past that window can never settle — or be CLV-healed — from the live
 * loop above. Three honest paths, in order:
 *
 *   (a) HEAL: a FINAL game with both scores recorded but picks still PENDING
 *       (a crash between the score write and pick settlement, or a settle run
 *       that died mid-game) settles NOW from the recorded scores — the outcome
 *       is known, so VOIDing it would erase truth. No age cutoff: this state
 *       is an anomaly whenever it exists.
 *
 *   (b) VOID: a game past the stale horizon with NO gradeable outcome
 *       (never went FINAL, or FINAL with missing scores — postponed,
 *       cancelled, or feed-missed beyond recovery) gets its pending picks
 *       VOIDed. Never learning-eligible, excluded from all records; the
 *       game's status is left untouched (we don't fabricate CANCELED).
 *
 *   (c) CLV-HEAL: an already-settled pick whose CLV grade was orphaned by a
 *       crash between the settle write and the CLV write gets its grade
 *       (re-)attempted now. Settlement result is never re-derived.
 *
 * Guarded: a sweep failure logs and returns partial counts — it must never
 * take down the feed settlement that already succeeded.
 */
async function catchUpSweep(
  ctx: SettleContext,
): Promise<{
  gamesHealed: number;
  picksSettled: number;
  picksVoided: number;
  clvGradesHealed: number;
}> {
  const { sport, logPrefix } = ctx;
  let gamesHealed = 0;
  let picksSettled = 0;
  let picksVoided = 0;
  let clvGradesHealed = 0;

  try {
    // (a) HEAL — recorded outcome that never reached the picks.
    const orphanedFinals = await db.game.findMany({
      where: {
        sport: { key: sport.key },
        status: "FINAL",
        homeScore: { not: null },
        awayScore: { not: null },
        picks: { some: { result: "PENDING" } },
      },
      include: { picks: { where: { result: "PENDING" } } },
    });

    for (const game of orphanedFinals) {
      // The query guarantees both scores; the explicit check narrows the types.
      if (game.homeScore === null || game.awayScore === null) continue;
      console.warn(
        `${logPrefix} Catch-up heal: game ${game.id} is FINAL with recorded ` +
        `scores but ${game.picks.length} pick(s) still PENDING — settling now.`,
      );
      picksSettled += await settleCompletedGame(ctx, game, game.homeScore, game.awayScore);
      gamesHealed++;
    }

    // (b) VOID — no gradeable outcome and past the horizon our source covers.
    const staleCutoff = new Date(Date.now() - VOID_STALE_HOURS * 60 * 60 * 1000);
    const staleGames = await db.game.findMany({
      where: {
        sport: { key: sport.key },
        commenceTime: { lt: staleCutoff },
        picks: { some: { result: "PENDING" } },
        // NOT(FINAL with both scores) — those are the heal arm above.
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
        // Same idempotent PENDING-scoped write as settlement: the loser of a
        // race with a concurrent settle/void run is a harmless no-op.
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
            // A VOID is never a learning outcome — there is no outcome.
            isEligibleForLearning: false,
            gameDataQualityScore: game.dataQualityScore,
          });
        } catch (snapErr) {
          console.warn(
            `${logPrefix} Snapshot VOID update failed for pick ${pick.id}: ` +
            `${snapErr instanceof Error ? snapErr.message : snapErr}`,
          );
        }
        picksVoided++;
      }
      console.warn(
        `${logPrefix} Voided ${game.picks.length} stale pick(s) on game ${game.id} ` +
        `(${game.awayTeamName} @ ${game.homeTeamName}, commenced ` +
        `${game.commenceTime.toISOString()}, status ${game.status}) — no gradeable ` +
        `outcome within ${VOID_STALE_HOURS}h.`,
      );
    }

    // (c) CLV-HEAL — a settled pick whose CLV grade never got written.
    clvGradesHealed = await healOrphanedClvGrades(ctx);
  } catch (sweepErr) {
    console.warn(
      `${logPrefix} Catch-up sweep failed for ${sport.key} (feed settlement unaffected): ` +
      `${sweepErr instanceof Error ? sweepErr.message : sweepErr}`,
    );
  }

  return { gamesHealed, picksSettled, picksVoided, clvGradesHealed };
}

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
  const ctx: SettleContext = { sport, gates, isBootstrap, logPrefix };

  let gamesSettled = 0;
  let picksSettled = 0;
  let picksVoided = 0;
  let clvGradesHealed = 0;
  let feedError: string | null = null;

  // The feed pass and the catch-up sweep are INDEPENDENT halves. The feed pass
  // needs The Odds API; the sweep is DB-only. An upstream outage/quota error on
  // the feed must not skip the sweep — that would recreate M-F9 (immortal
  // PENDING picks) for exactly as long as the upstream is down, when healing
  // recorded FINALs and VOIDing stale games needs no fresh feed data at all.
  try {
    const { data: scores } = await client.getScores(sport.key, SCORES_DAYS_FROM);
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

      // The inline null-check (not the bothScores boolean) is what narrows the
      // score types to `number` for the settlement math below.
      if (score.homeScore !== null && score.awayScore !== null) {
        picksSettled += await settleCompletedGame(ctx, game, score.homeScore, score.awayScore);
        gamesSettled++;
      }
    }
  } catch (err) {
    feedError = err instanceof Error ? err.message : String(err);
    console.error(`${logPrefix} ${sport.key} failed: ${feedError}`);
  }

  // Feed-independent healing + VOID of games the feed can no longer reach.
  // Runs even when the feed pass failed (see above); internally guarded so its
  // own failure can never throw.
  const sweep = await catchUpSweep(ctx);
  gamesSettled += sweep.gamesHealed;
  picksSettled += sweep.picksSettled;
  picksVoided += sweep.picksVoided;
  clvGradesHealed += sweep.clvGradesHealed;

  // A feed failure still reports status:"failed" (the caller's error contract
  // is unchanged) — but with whatever the sweep accomplished counted honestly.
  if (feedError) {
    return {
      sport: sport.key,
      status: "failed",
      gamesSettled,
      picksSettled,
      picksVoided,
      clvGradesHealed,
      error: feedError,
    };
  }

  return {
    sport: sport.key,
    status: "success",
    gamesSettled,
    picksSettled,
    picksVoided,
    clvGradesHealed,
  };
}
