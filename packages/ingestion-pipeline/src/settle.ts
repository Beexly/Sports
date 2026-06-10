/**
 * settleOnce — one settlement pass over all supported sports (D-011 Option A).
 *
 * EXTRACTED from workers/data-refresh/src/index.ts so the same settlement
 * core runs from BOTH hosts without drift:
 *
 *   - the long-running worker (workers/data-refresh) calls settleOnce once
 *     per 30-min cycle — its loop/timing/env handling stays in the worker;
 *   - the Vercel cron route (apps/web/app/api/cron/settle-picks) calls it
 *     inside the 300s scheduled-function envelope and maps the structured
 *     result onto the same job-truth HTTP contract as refresh-odds.
 *
 * What one pass does, per sport:
 *   1. Pull completed scores from The Odds API (failures classified via
 *      providerStatusFromError — a failed pull is counted, never masked).
 *   2. Grade every PENDING pick on a completed game via the R-01 boundary
 *      contract (D-010): Pick.line keeps chosen-side semantics; the
 *      chosen→home perspective conversion happens HERE
 *      (homePerspectiveLine → calculatePickResult).
 *   3. Mirror the outcome into PickSignalSnapshot — outcome-anchored
 *      learning; eligibleForLearning only for canonical decisive results.
 *   4. Write TeamGameLog entries (data-quality gated, non-fatal).
 *   5. Capture the closing line + compute per-pick CLV (R-04 bet-time lock:
 *      the immutable snapshot line, never the drifted pick.line; convert to
 *      home perspective with the SAME R-01 helper as settlement).
 *
 * Then once per pass:
 *   6. R-05 VOID sweep — abandoned games' PENDING picks settle as VOID
 *      (never counted toward W/L or learning).
 *   7. Calibration-report regen trigger (B-04) — best-effort, non-fatal;
 *      hosts without the script on disk (e.g. a bundled Vercel lambda)
 *      simply record calibrationRegenerated:false.
 *
 * CONTRACT: NEVER throws. Fail-closed and stub-safe — with no DATABASE_URL
 * the @sports/db stub returns []/null and the pass is an honest no-op; every
 * per-pick side write (snapshot, game log, CLV) is individually guarded so
 * one failure can never abort settlement. The caller receives a structured
 * result and owns how to report it (the cron route maps failed/errors onto
 * 200/207/502 — a failed pass is never reported ok).
 */

import { execFile } from "node:child_process";
import * as path from "node:path";
import { promisify } from "node:util";
import { db } from "@sports/db";
import {
  SUPPORTED_SPORTS,
  MARKETS,
  OddsApiClient,
  DataNormalizer,
  settleGameLogs,
  captureClosingLine,
  pickClosingValues,
  marketForPickType,
  DEFAULT_CLOSING_REF,
  providerStatusFromError,
} from "@sports/data-ingestion";
import type {
  ProviderJobStatus,
  SupportedSportKey,
} from "@sports/data-ingestion";
import type { OddsApiEvent } from "@sports/types";
import {
  getReadinessGates,
  calculatePickResult,
  homePerspectiveLine,
  computeClv,
  clvBetSideFor,
  isDecisiveSettlementResult,
  VOID_SWEEP_HOURS,
  picksToVoid,
} from "@sports/prediction-engine";
import type { ReadinessGates } from "@sports/prediction-engine";

/** Per-sport outcome of a settlement pass, in processing order. */
export interface SettleSportOutcome {
  sport: string;
  ok: boolean;
  /** Completed games whose scores were recorded this pass. */
  gamesSettled: number;
  /** Picks graded (WIN/LOSS/PUSH) via real final scores this pass. */
  picksSettled: number;
  error?: string;
  /** Classified job-truth reason when ok === false. */
  providerStatus?: ProviderJobStatus;
}

/** Structured result of one settlement pass. settleOnce NEVER throws. */
export interface SettleOnceResult {
  /** Picks graded via real final scores across all sports this pass. */
  settled: number;
  /** PENDING picks settled VOID by the R-05 sweep this pass. */
  voided: number;
  /** Sports whose settlement pass failed (provider error or unexpected throw). */
  failed: number;
  /** Sports attempted (the SUPPORTED_SPORTS roster size). */
  totalSports: number;
  /**
   * First classified provider failure reason (PROVIDER_AUTH_FAILED,
   * PROVIDER_QUOTA_EXHAUSTED, PROVIDER_RATE_LIMITED, PROVIDER_UNAVAILABLE, …)
   * when any sport failed. Internal/founder-only — never public copy.
   */
  providerStatus?: ProviderJobStatus;
  /** Human-readable failure messages (per failed sport + void-sweep failure). */
  errors: string[];
  /** Per-sport outcomes, in processing order. */
  sports: SettleSportOutcome[];
  /** Whether the post-settlement calibration regen trigger succeeded. */
  calibrationRegenerated: boolean;
}

export interface SettleOnceDeps {
  /** The Odds API key. Callers gate on its presence before calling. */
  apiKey: string;
  /** Log prefix for the host, e.g. "[data-refresh]" or "[cron:settle-picks]". */
  logPrefix?: string;
  /** Scores lookback window in days (The Odds API daysFrom). Default 2 — worker parity. */
  scoresDaysFrom?: number;
  /**
   * Post-settlement calibration-report regen trigger (B-04). Defaults to
   * spawning scripts/generate-calibration-report.mjs as an isolated child
   * process (worker parity — even a crash inside it cannot touch caller
   * state). Hosts where the script is not on disk simply record
   * calibrationRegenerated:false; the failure is warned, never thrown, and
   * never fails the pass.
   */
  regenerateCalibrationReport?: () => Promise<void>;
}

const execFileAsync = promisify(execFile);

// Resolved relative to this file — packages/ingestion-pipeline/src sits three
// levels below the repo root, same depth as the worker's previous copy. In a
// bundled deployment (Vercel lambda) the script is not traced into the
// bundle; the spawn fails ENOENT and is swallowed as calibrationRegenerated:false.
const CALIBRATION_REPORT_SCRIPT = path.resolve(
  __dirname,
  "../../../scripts/generate-calibration-report.mjs"
);

/**
 * Default B-04 trigger: regenerate _launch/CALIBRATION_REPORT.md after
 * settlement. Isolated child process; stub-safe (no DATABASE_URL → honest
 * empty report) and read-only against the DB.
 */
async function runCalibrationReportScript(): Promise<void> {
  await execFileAsync(process.execPath, [CALIBRATION_REPORT_SCRIPT], {
    timeout: 120_000,
    windowsHide: true,
  });
}

interface SettleSportArgs {
  sport: { key: SupportedSportKey };
  client: OddsApiClient;
  normalizer: DataNormalizer;
  gates: ReadinessGates;
  daysFrom: number;
  logPrefix: string;
}

/**
 * Settle one sport: scores pull → per-game grade + snapshot mirror + game
 * log + CLV. Throws on a scores-fetch (or unexpected DB) failure — the
 * caller classifies and records it. Side writes are individually guarded.
 */
async function settleSport(args: SettleSportArgs): Promise<{
  gamesSettled: number;
  picksSettled: number;
}> {
  const { sport, client, normalizer, gates, daysFrom, logPrefix } = args;
  const isBootstrap = !gates.canPersistCanonicalHistory;
  let gamesSettled = 0;
  let picksSettled = 0;

  const { data: scores } = await client.getScores(sport.key, daysFrom);
  const normalized = normalizer.normalizeScores(scores);

  // CLV closing-line capture (additive, fail-closed): one odds pull per
  // sport, used as the best-available near-kickoff "close" reference for
  // the games settling this cycle. A failure here must NEVER block
  // settlement, so it is fully isolated and degrades to an empty map
  // (CLV simply not computed → pick clv* columns stay NULL).
  const closingEventsByExternalId = new Map<string, OddsApiEvent>();
  try {
    const { data: closingEvents } = await client.getOdds(sport.key, [...MARKETS]);
    for (const ev of closingEvents) closingEventsByExternalId.set(ev.id, ev);
  } catch (oddsErr) {
    console.warn(
      `${logPrefix}[clv] closing-odds pull skipped for ${sport.key}: ` +
        `${oddsErr instanceof Error ? oddsErr.message : oddsErr}`
    );
  }

  for (const score of normalized) {
    if (!score.completed) continue;
    const game = await db.game.findUnique({
      where: { externalId: score.externalId },
      include: {
        picks: {
          where: { result: "PENDING" },
          // signalSnapshot carries the immutable bet-time line lock
          // (lineAtPrediction/selectionAtPrediction) used by CLV (R-04).
          include: { signalSnapshot: true },
        },
      },
    });
    if (!game) continue;

    await db.game.update({
      where: { id: game.id },
      data: { homeScore: score.homeScore, awayScore: score.awayScore, status: "FINAL" },
    });

    if (score.homeScore !== null && score.awayScore !== null) {
      gamesSettled += 1;

      // Settle pick results — always runs, regardless of bootstrap mode.
      // Real game outcomes are source truth and must be recorded.
      const settledAt = new Date();
      for (const pick of game.picks) {
        const pickType = pick.pickType as "SPREAD" | "MONEYLINE" | "TOTAL";
        // R-01 boundary contract (D-010): Pick.line is persisted from the
        // CHOSEN side's perspective; calculatePickResult expects the HOME
        // perspective. Convert at this boundary — feeding a chosen-side
        // away line directly inverts every away SPREAD grade.
        const result = calculatePickResult(
          pickType,
          pick.selection,
          homePerspectiveLine(pickType, pick.selection, pick.line, game.homeTeamName),
          game.homeTeamName,
          score.homeScore,
          score.awayScore,
          sport.key
        );
        await db.pick.update({
          where: { id: pick.id },
          data: { result, settledAt },
        });
        picksSettled += 1;

        // Record settlement outcome in the PickSignalSnapshot.
        // This is the outcome-anchored learning data: real result tied to the
        // signal conditions that were present at prediction time.
        // eligibleForLearning is set ONLY when:
        //   (1) canLearnFromOutcomes=true
        //   (2) pick was canonical (isBootstrap=false)
        //   (3) result is a decisive outcome (WIN/LOSS/PUSH — not VOID)
        const isDecisiveResult = isDecisiveSettlementResult(result);
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
              ...(isEligibleForLearning ? { learningEligibleAt: settledAt } : {}),
            },
          });
        } catch (snapErr) {
          // Non-fatal: snapshot update failure must never kill settlement
          console.warn(
            `${logPrefix} Snapshot outcome update failed for pick ${pick.id}: ` +
              `${snapErr instanceof Error ? snapErr.message : snapErr}`
          );
        }
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
            `${settleErr instanceof Error ? settleErr.message : settleErr}`
        );
      }

      // CLV capture + per-pick compute (additive shadow, fail-closed).
      // Snapshot the best-available pre-kickoff close for this game, then
      // compute Closing-Line Value for each pick settled this cycle and
      // write it to the NULLABLE pick.clv* columns. Nothing here changes
      // the published confidence/tier/grade/result or MODEL_VERSION.
      // The entire block is non-fatal: any failure leaves clv* NULL.
      try {
        const closingEvent = closingEventsByExternalId.get(score.externalId);
        if (closingEvent) {
          await captureClosingLine({
            gameId: game.id,
            event: closingEvent,
            fetchedAt: settledAt,
          });

          for (const pick of game.picks) {
            const pickType = pick.pickType as "SPREAD" | "MONEYLINE" | "TOTAL";

            // R-04 bet-time line lock: CLV compares the close to the
            // line/selection as PUBLISHED (immutable snapshot), never the
            // drifted last-refresh pick.line. No locked line → no CLV
            // (degrade-to-null, never a fabricated honesty metric).
            const lockedLine = pick.signalSnapshot?.lineAtPrediction ?? null;
            const lockedSelection =
              pick.signalSnapshot?.selectionAtPrediction ?? pick.selection;
            if (lockedLine === null) continue;

            const side = clvBetSideFor(pickType, lockedSelection, game.homeTeamName);
            const market = marketForPickType(pickType);

            const closingRow = await db.closingLine.findUnique({
              where: {
                gameId_market_closingRef: {
                  gameId: game.id,
                  market,
                  closingRef: DEFAULT_CLOSING_REF,
                },
              },
            });

            const { closingLine, closingPrice, isStale } = pickClosingValues(
              closingRow,
              pickType,
              side
            );

            // R-01 boundary contract (D-010): the locked line keeps
            // chosen-side semantics; computeClv expects HOME perspective
            // (the closing consensus spread is home-perspective). Convert
            // here — the SAME convention as settlement above.
            // For SPREAD/TOTAL the locked line is the bet line; price is
            // vig-assumed (not stored), so price CLV is left to moneyline.
            // For MONEYLINE the locked line IS the American price.
            const clv = computeClv({
              betSide: side,
              betLine:
                pickType === "MONEYLINE"
                  ? null
                  : homePerspectiveLine(pickType, lockedSelection, lockedLine, game.homeTeamName),
              closingLine,
              betPrice: pickType === "MONEYLINE" ? lockedLine : null,
              closingPrice,
              isStale,
            });

            // Only write when at least one axis produced a value — a fully
            // null result leaves the columns untouched (degrade-to-null).
            if (clv.clvPoints !== null || clv.clvCents !== null) {
              await db.pick.update({
                where: { id: pick.id },
                data: {
                  closingLine,
                  closingPrice,
                  clvPoints: clv.clvPoints,
                  clvCents: clv.clvCents,
                  clvPositive: clv.clvPositive,
                  clvComputedAt: settledAt,
                },
              });
            }
          }
        }
      } catch (clvErr) {
        console.warn(
          `${logPrefix}[clv] capture/compute failed for ${game.id}: ` +
            `${clvErr instanceof Error ? clvErr.message : clvErr}`
        );
      }
    }
  }

  return { gamesSettled, picksSettled };
}

/**
 * R-05 — settle abandoned games' PENDING picks as VOID. Returns the number
 * of picks voided.
 *
 * A game is void-eligible when it has no recorded final score pair AND is
 * either past commenceTime + VOID_SWEEP_HOURS (default 12h, env-overridable)
 * or carries an explicit POSTPONED/CANCELED status. The Odds API scores
 * payload has no cancelled/postponed flag (only `completed`), so the sweep is
 * time-threshold based today; the status check is defensive for any future
 * writer of those GameStatus values.
 *
 * VOID never counts toward W/L or learning: eligibleForLearning requires a
 * decisive WIN/LOSS/PUSH (same rule as the score-settlement path above), and
 * the calibration readers (apps/web/lib/calibration/report.ts:40,
 * scripts/generate-calibration-report.mjs:630) filter result IN
 * (WIN,LOSS,PUSH). Stub-safe: with no DATABASE_URL the stub client returns []
 * from findMany and the sweep is a no-op.
 */
async function voidStalePendingPicks(logPrefix: string): Promise<number> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - VOID_SWEEP_HOURS * 60 * 60 * 1000);
  let totalVoided = 0;

  // Narrow DB query; the pure predicate (picksToVoid → isVoidSweepEligible)
  // re-checks everything — including recorded scores — so a gradable game can
  // never be voided even if this query over-selects.
  const staleGames = await db.game.findMany({
    where: {
      picks: { some: { result: "PENDING" } },
      OR: [
        { commenceTime: { lte: cutoff } },
        { status: { in: ["POSTPONED", "CANCELED"] } },
      ],
    },
    include: {
      picks: {
        where: { result: "PENDING" },
        select: { id: true, result: true },
      },
    },
  });

  for (const game of staleGames) {
    const voidIds = picksToVoid(game, game.picks, now);
    if (voidIds.length === 0) continue;

    const settledAt = new Date();
    let voided = 0;
    for (const pickId of voidIds) {
      try {
        await db.pick.update({
          where: { id: pickId },
          data: { result: "VOID", settledAt },
        });
        voided += 1;

        // Mirror the score-settlement snapshot write: VOID is not a decisive
        // outcome, so eligibleForLearning stays false.
        await db.pickSignalSnapshot.updateMany({
          where: { pickId, settlementResult: null },
          data: { settlementResult: "VOID", settledAt, eligibleForLearning: false },
        });
      } catch (voidErr) {
        // Non-fatal: one failed write must never abort the rest of the sweep
        console.warn(
          `${logPrefix}[void-sweep] VOID write failed for pick ${pickId}: ` +
            `${voidErr instanceof Error ? voidErr.message : voidErr}`
        );
      }
    }

    if (voided > 0) {
      totalVoided += voided;
      console.log(
        `${logPrefix}[void-sweep] Voided ${voided} pick(s) for game ${game.id} ` +
          `(status=${game.status}, commenced ${game.commenceTime.toISOString()})`
      );
    }
  }

  return totalVoided;
}

/**
 * Run one full settlement pass. NEVER throws — every failure is classified,
 * counted, and reported in the structured result so the caller can apply the
 * job-truth contract (a failed pass is never reported ok).
 */
export async function settleOnce(deps: SettleOnceDeps): Promise<SettleOnceResult> {
  const logPrefix = deps.logPrefix ?? "[settlement]";
  const result: SettleOnceResult = {
    settled: 0,
    voided: 0,
    failed: 0,
    totalSports: SUPPORTED_SPORTS.length,
    errors: [],
    sports: [],
    calibrationRegenerated: false,
  };

  try {
    // Read readiness gates fresh every pass — env vars may change across deploys.
    const gates = getReadinessGates();
    const client = new OddsApiClient(deps.apiKey);
    const normalizer = new DataNormalizer();
    const daysFrom = deps.scoresDaysFrom ?? 2;

    for (const sport of SUPPORTED_SPORTS) {
      try {
        const outcome = await settleSport({
          sport,
          client,
          normalizer,
          gates,
          daysFrom,
          logPrefix,
        });
        result.settled += outcome.picksSettled;
        result.sports.push({ sport: sport.key, ok: true, ...outcome });
      } catch (err) {
        // Classified job-truth failure — recorded, never masked, never thrown.
        const message = err instanceof Error ? err.message : String(err);
        const providerStatus = providerStatusFromError(err);
        console.error(
          `${logPrefix} ${sport.key} settlement failed (${providerStatus}): ${message}`
        );
        result.failed += 1;
        result.errors.push(`${sport.key}: ${message}`);
        // First classified provider reason wins — what monitoring pages on.
        result.providerStatus ??= providerStatus;
        result.sports.push({
          sport: sport.key,
          ok: false,
          gamesSettled: 0,
          picksSettled: 0,
          error: message,
          providerStatus,
        });
      }
    }

    // R-05 VOID sweep (fail-closed, non-fatal): postponed/cancelled games
    // never produce a completed score from the feed, so their picks would rot
    // PENDING forever. Runs after score settlement each pass so a game that
    // settled normally this pass is already out of PENDING and untouched.
    // A sweep failure must never block the settlement pass — it is recorded
    // in errors[] so the route's truth contract still surfaces it honestly.
    try {
      result.voided = await voidStalePendingPicks(logPrefix);
    } catch (sweepErr) {
      const message = sweepErr instanceof Error ? sweepErr.message : String(sweepErr);
      console.warn(`${logPrefix}[void-sweep] sweep failed (non-fatal): ${message}`);
      result.errors.push(`void-sweep: ${message}`);
    }

    // Regenerate _launch/CALIBRATION_REPORT.md after settlement (B-04).
    // Strictly additive, fully non-fatal, and intentionally NOT recorded in
    // errors[]: on a bundled host the script is not on disk by design, and a
    // permanently-degraded HTTP status would train monitoring to ignore 207s.
    // calibrationRegenerated:false is the honest signal instead.
    const regenerate = deps.regenerateCalibrationReport ?? runCalibrationReportScript;
    try {
      await regenerate();
      result.calibrationRegenerated = true;
      console.log(`${logPrefix} calibration report regenerated after settlement.`);
    } catch (regenErr) {
      console.warn(
        `${logPrefix} calibration-report regeneration failed (non-fatal): ` +
          `${regenErr instanceof Error ? regenErr.message : regenErr}`
      );
    }
  } catch (err) {
    // Defensive outer guard — settleOnce must NEVER throw. Anything landing
    // here (e.g. gate read explosion) marks the unprocessed remainder failed.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${logPrefix} settlement pass failed unexpectedly: ${message}`);
    result.errors.push(message);
    result.failed = result.totalSports - result.sports.filter((s) => s.ok).length;
  }

  return result;
}
