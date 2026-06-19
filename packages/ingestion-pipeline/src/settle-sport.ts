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
  fetchScoresWithPool,
  resolveFreeSettlementScores,
} from "@sports/data-ingestion";
import type {
  SupportedSportKey,
  CheckClearanceFn,
  PendingGameForMatch,
} from "@sports/data-ingestion";
import {
  calculatePickResult,
  deriveClosingSnapshotFromOdds,
  gradePickClv,
} from "@sports/prediction-engine";
import type { ReadinessGates, PickKind } from "@sports/prediction-engine";
import { recordPickSettlementSnapshot } from "./settlement-snapshots.js";

export interface SettleSportConfig {
  key: SupportedSportKey;
  name: string;
  displayName: string;
}

/**
 * One normalized final-score record consumed by the settle loop. Both the paid
 * `DataNormalizer.normalizeScores` output and the free resolver's re-keyed output
 * conform to this shape — so the per-game loop is identical for either source.
 */
interface SettleScore {
  readonly externalId: string;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
  readonly completed: boolean;
}

/**
 * Optional injected dependencies enabling the FREE, keyless settlement fallback.
 *
 * INERT BY DEFAULT. When this argument is omitted, OR `FREE_DATA_PROVIDER_ENABLED`
 * is not exactly "true", OR either dep is absent, the free path is a NO-OP and
 * settleSport behaves byte-identically to the paid-only path. The free path also
 * only ever runs as a FALLBACK — when the paid getScores threw or produced no
 * completed scores covering the still-PENDING games.
 *
 * Wiring these requires the caller to supply both `fetchFn` (e.g. global fetch)
 * and `checkClearance` (the real Scraping Clearance Engine). The free providers
 * fail closed without an injected clearance fn, so a partial wiring extracts
 * nothing rather than weakening rights posture.
 */
export interface SettleSportFreeDeps {
  /** Injected fetch threaded to the free score providers (e.g. globalThis.fetch). */
  readonly fetchFn?: typeof fetch;
  /** The real `checkClearance` — REQUIRED for the free path; absent ⇒ fail-closed. */
  readonly checkClearance?: CheckClearanceFn;
}

export interface SettleSportResult {
  sport: string;
  status: "success" | "failed";
  gamesSettled: number;
  picksSettled: number;
  error?: string;
}

/**
 * Settle all completed games for one sport.
 *
 * @param sport     - Sport configuration (key, name, displayName)
 * @param apiKey    - The Odds API key
 * @param gates     - Readiness gates (read once per cycle by the caller)
 * @param logPrefix - Log prefix for distinguishing caller context, e.g. "[settlement]"
 * @param freeDeps  - OPTIONAL injected deps for the free keyless fallback. Omit (or
 *                    leave `FREE_DATA_PROVIDER_ENABLED` unset) for byte-identical
 *                    paid-only behavior.
 */
export async function settleSport(
  sport: SettleSportConfig,
  apiKey: string,
  gates: ReadinessGates,
  logPrefix: string = "[settlement]",
  freeDeps?: SettleSportFreeDeps,
): Promise<SettleSportResult> {
  // Bootstrap provenance for any TeamGameLog written during settlement.
  const isBootstrap = !gates.canPersistCanonicalHistory;
  const client = new OddsApiClient(apiKey);
  const normalizer = new DataNormalizer();

  let gamesSettled = 0;
  let picksSettled = 0;

  try {
    // ── Paid path (UNCHANGED) ────────────────────────────────────────────────
    // A paid getScores failure must NOT abort settlement when the free fallback
    // is enabled — it is the exact condition the fallback exists for. When the
    // free path is inert, `paidScoresError` is rethrown below so behavior is
    // byte-identical to before.
    let normalized: SettleScore[] = [];
    let paidScoresError: unknown = null;
    try {
      const { data: scores } = await client.getScores(sport.key, 2);
      normalized = normalizer.normalizeScores(scores);
    } catch (err) {
      paidScoresError = err;
    }

    // ── Free keyless fallback (INERT by default) ─────────────────────────────
    // Runs ONLY when: the flag is exactly "true", both deps are injected, AND the
    // paid path either threw or produced no completed score covering a PENDING
    // game. Re-keys free pool scores onto real DB externalIds via the strict,
    // fail-closed resolver, then APPENDS them so the existing loop settles them
    // with zero forked logic. When inert, none of this executes and any paid
    // error is rethrown to preserve the original status:"failed" contract.
    const freeEnabled = process.env["FREE_DATA_PROVIDER_ENABLED"] === "true";
    const freeUsable =
      freeEnabled && freeDeps !== undefined && freeDeps.checkClearance !== undefined;

    if (freeUsable) {
      const resolvedFree = await resolveFreeFallbackScores(
        sport.key,
        normalized,
        paidScoresError !== null,
        freeDeps,
        logPrefix,
      );
      // Append only games the paid path did not already cover (resolver keys to
      // PENDING games, so paid-settled games are excluded by construction).
      normalized = [...normalized, ...resolvedFree];
    } else if (paidScoresError !== null) {
      // Inert free path: preserve the exact original behavior — surface the paid
      // error as status:"failed" via the outer catch.
      throw paidScoresError;
    }

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
          const result = calculatePickResult(
            pick.pickType as "SPREAD" | "MONEYLINE" | "TOTAL",
            pick.selection,
            pick.line,
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

    return { sport: sport.key, status: "success", gamesSettled, picksSettled };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${logPrefix} ${sport.key} failed: ${message}`);
    return { sport: sport.key, status: "failed", gamesSettled, picksSettled, error: message };
  }
}

/**
 * Free keyless settlement fallback — resolve still-PENDING games via the free
 * score pool when the paid path can't cover them. Returns scores re-keyed to real
 * DB externalIds, ready to APPEND to the paid `normalized` list. Returns [] (a
 * no-op) whenever the fallback is not needed or cannot run, and NEVER throws — a
 * fallback failure must never break the paid settlement that already happened.
 *
 * The free path only fires when there is a still-PENDING game the paid path did
 * NOT supply a completed score for (or the paid fetch threw outright). Matching is
 * delegated to the strict, fail-closed `resolveFreeSettlementScores`.
 */
async function resolveFreeFallbackScores(
  sportKey: SupportedSportKey,
  paidScores: readonly SettleScore[],
  paidThrew: boolean,
  freeDeps: SettleSportFreeDeps,
  logPrefix: string,
): Promise<SettleScore[]> {
  try {
    // The externalIds the paid path already provides a COMPLETED score for.
    const paidCovered = new Set(
      paidScores.filter((s) => s.completed).map((s) => s.externalId),
    );

    // Still-PENDING games for this sport — the only settlement targets. Scoped to
    // the sport (via the Sport relation `key`) so we never match a name collision
    // across sports, and bounded to a recent window so the resolver only ever sees
    // plausible settlement candidates.
    const windowStart = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    const pendingGameRows = await db.game.findMany({
      where: {
        sport: { key: sportKey },
        commenceTime: { gte: windowStart },
        picks: { some: { result: "PENDING" } },
      },
      select: {
        externalId: true,
        homeTeamName: true,
        awayTeamName: true,
        commenceTime: true,
      },
    });

    // Only games the paid path did NOT already cover are candidates for the free
    // fallback. If the paid fetch threw, nothing is covered, so all are candidates.
    const pendingGames: PendingGameForMatch[] = pendingGameRows
      .filter((g) => paidThrew || !paidCovered.has(g.externalId))
      .map((g) => ({
        externalId: g.externalId,
        homeTeamName: g.homeTeamName,
        awayTeamName: g.awayTeamName,
        commenceTime: g.commenceTime,
      }));

    // Nothing the paid path missed → the free fallback is unnecessary; no-op.
    if (pendingGames.length === 0) return [];

    // Fetch free settlement scores. The clearance fn is injected (fail-closed);
    // the pool returns an honest empty result and never throws.
    const pooled = await fetchScoresWithPool(sportKey, 2, {
      ...(freeDeps.fetchFn ? { fetchFn: freeDeps.fetchFn } : {}),
      ...(freeDeps.checkClearance ? { checkClearance: freeDeps.checkClearance } : {}),
    });
    if (!pooled.healthy || pooled.result.scores.length === 0) return [];

    const resolved = resolveFreeSettlementScores(pooled.result.scores, pendingGames);
    if (resolved.length > 0) {
      console.log(
        `${logPrefix} Free fallback resolved ${resolved.length} ` +
        `settlement score(s) for ${sportKey} via ${pooled.servedBy ?? "score-pool"}.`,
      );
    }
    // Resolved scores already conform to SettleScore (completed:true literal).
    return resolved.map((r) => ({
      externalId: r.externalId,
      homeScore: r.homeScore,
      awayScore: r.awayScore,
      completed: r.completed,
    }));
  } catch (err) {
    console.warn(
      `${logPrefix} Free settlement fallback failed for ${sportKey}: ` +
      `${err instanceof Error ? err.message : err}`,
    );
    return [];
  }
}
