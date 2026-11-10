/**
 * Q54 — QB Efficiency Split Before vs After First Interception: In-Game Tilt Response (SHADOW).
 *
 * Computes per-QB (`passer_player_id`) own EPA/dropback (attached via `attachOwnEpa`)
 * split over dropbacks strictly before (`beforeFirstInt`) vs strictly after
 * (`afterFirstInt`) the QB's own first interception within each game, aggregated
 * across games in each point-in-time window (`season-to-date`, `last-4`, `last-8`
 * distinct weeks strictly below `targetWeek`).
 *
 * Pinned Methodology & Boundary Rules (AM run 69 tightening):
 *   - Dropback population mirrors Q42/Q53: `play_type === "pass"` rows; `qb_spike === 1`
 *     rows excluded from both arms and counted; sacks stay IN (`play_type === "pass"`);
 *     scrambles (`play_type === "run"`) never enter.
 *   - Boundary grain: per `(game_id, passer_player_id)` ordered by ascending `play_id`.
 *     Each QB's boundary is his OWN first interception dropback (`interception === 1`)
 *     in that game (a relief QB's pre-INT dropbacks are evaluated relative to his own
 *     first INT, independent of whether a teammate threw an INT earlier).
 *   - The first INT dropback itself is EXCLUDED from both arms and counted.
 *   - Subsequent interception dropbacks (2nd+ INT in the same game by that QB) STAY
 *     in the `afterFirstInt` arm.
 *   - Games in which the QB throws zero interceptions (`interception === 1` never occurs
 *     for that `(game_id, passer_player_id)`) are EXCLUDED from both arms and counted.
 *   - Aggregate floors: an arm is emitted in a window only with `>= 25` ratable
 *     dropbacks across games in that window; `postIntTiltDelta = shrunk(after) - shrunk(before)`
 *     is emitted only when BOTH arms meet the `>= 25` floor.
 *   - Empirical Bayes shrinkage: `shrunk = leagueArmMean + (n / (n + 20)) * (raw - leagueArmMean)`
 *     where `n` is the arm's ratable dropbacks and `leagueArmMean` is the dropback-weighted
 *     mean own EPA across all QBs' ratable dropbacks in that arm and window.
 */

import { round as rawRound } from "./numeric.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";

function round(value: number, decimals = 4): number {
  const r = rawRound(value, decimals);
  return Object.is(r, -0) ? 0 : r;
}

export const QB_POST_FIRST_INT_EFFICIENCY_SPLIT_VERSION = "gse-qb-post-first-int-epa-v1";

export const QB_POST_FIRST_INT_FEATURE_KEYS = [
  "game_id",
  "play_id",
  "week",
  "passer_player_id",
  "play_type",
  "qb_spike",
  "interception",
  "epa",
] as const;

export const MIN_POST_FIRST_INT_ARM_RATABLE_DROPBACKS_FLOOR = 25;
export const QB_POST_FIRST_INT_SHRINKAGE_K = 20;

export type QbPostFirstIntArmName = "before-first-int" | "after-first-int";
export type QbPostFirstIntWindowType = "season-to-date" | "last-4" | "last-8";

/** One play row mapped for Q54 QB before/after first interception efficiency split. */
export interface QbPostFirstIntDropbackPlay {
  readonly playId: string;
  readonly gameId: string;
  /** Numeric `play_id` for within-game ordering (parsed from `playId` if omitted). */
  readonly numericPlayId?: number;
  readonly season?: number;
  readonly week: number;
  readonly passerPlayerId: string;
  readonly posteam?: string;
  readonly playType: string;
  readonly qbSpike: 0 | 1 | null;
  readonly interception: 0 | 1;
  /** Our own EPA for the play, attached via `attachOwnEpa`; `null` means unratable. */
  readonly epa: number | null;
}

/** Metrics for one arm (`before-first-int` or `after-first-int`) for a QB in a window. */
export interface QbPostFirstIntArm {
  readonly arm: QbPostFirstIntArmName;
  /** Total classified dropbacks in this arm (including null-own-EPA dropbacks). */
  readonly dropbacks: number;
  /** Classified dropbacks in this arm with non-null finite own EPA. */
  readonly ratableDropbacks: number;
  /** Number of subsequent interceptions in this arm (0 for `before-first-int`, `>= 0` for `after-first-int`). */
  readonly subsequentInterceptions: number;
  /** Unshrunk mean own EPA over `ratableDropbacks`. */
  readonly rawEpaPerDropback: number;
  /** Empirical Bayes shrunk EPA/dropback (`n / (n + 20)` toward `leagueArmMean`). */
  readonly shrunkEpaPerDropback: number;
  /** League dropback-weighted mean own EPA in this arm and window. */
  readonly leagueArmMean: number;
}

/** Per-QB row in a single point-in-time window for Q54. */
export interface QbPostFirstIntWindowRow {
  readonly passerPlayerId: string;
  readonly posteam: string;
  readonly window: QbPostFirstIntWindowType;
  readonly targetWeek: number;
  /** Number of games in the window where this QB threw at least one interception. */
  readonly intGamesCount: number;
  /** Number of games in the window where this QB had dropbacks but threw zero interceptions (excluded). */
  readonly intLessGamesExcludedCount: number;
  readonly totalClassifiedDropbacks: number;
  readonly totalClassifiedRatableDropbacks: number;
  readonly beforeFirstIntArm: QbPostFirstIntArm | null;
  readonly afterFirstIntArm: QbPostFirstIntArm | null;
  /**
   * `afterFirstIntArm.shrunkEpaPerDropback - beforeFirstIntArm.shrunkEpaPerDropback`
   * when both arms meet the `>= 25` ratable-dropback floor; `null` otherwise.
   * Positive = bounce-back quadrant; Negative = post-INT downward spiral (tilt).
   */
  readonly postIntTiltDelta: number | null;
  /** `afterFirstIntArm.rawEpaPerDropback - beforeFirstIntArm.rawEpaPerDropback` when both arms emit. */
  readonly rawPostIntTiltDelta: number | null;
  readonly quadrant: "bounce-back" | "downward-spiral" | "neutral" | null;
  readonly provenance: ExpectedMetricProvenance;
}

/** Diagnostics for a single window in Q54. */
export interface QbPostFirstIntWindowDiagnostics {
  readonly excludedNonPassPlays: number;
  readonly excludedQbSpikePlays: number;
  readonly excludedEmptyGameIdPlays: number;
  readonly excludedEmptyPasserIdPlays: number;
  readonly excludedIntLessQbGames: number;
  readonly excludedIntLessGameDropbacks: number;
  readonly excludedFirstIntBoundaryPlays: number;
  readonly excludedNullEpaDropbacks: number;
  readonly belowFloorBeforeArmsCount: number;
  readonly belowFloorAfterArmsCount: number;
}

/** Result for a single window (`season-to-date`, `last-4`, `last-8`). */
export interface QbPostFirstIntWindowResult {
  readonly window: QbPostFirstIntWindowType;
  readonly targetWeek: number;
  readonly includedWeeks: readonly number[];
  readonly leagueBeforeFirstIntMeanEpa: number;
  readonly leagueAfterFirstIntMeanEpa: number;
  readonly qbs: readonly QbPostFirstIntWindowRow[];
  readonly diagnostics: QbPostFirstIntWindowDiagnostics;
}

/** Full Q54 output across all three point-in-time windows. */
export interface QbPostFirstIntEfficiencySplitOutput {
  readonly targetSeason: number | null;
  readonly targetWeek: number;
  readonly windows: Readonly<Record<QbPostFirstIntWindowType, QbPostFirstIntWindowResult>>;
  readonly seasonToDate: QbPostFirstIntWindowResult;
  readonly last4Weeks: QbPostFirstIntWindowResult;
  readonly last8Weeks: QbPostFirstIntWindowResult;
}

export interface ComputeQbPostFirstIntOptions {
  readonly targetWeek: number;
  readonly targetSeason?: number;
}

function buildProvenance(sampleSize: number): ExpectedMetricProvenance {
  return {
    modelVersion: QB_POST_FIRST_INT_EFFICIENCY_SPLIT_VERSION,
    method: "deterministic-rule",
    featureKeys: [...QB_POST_FIRST_INT_FEATURE_KEYS],
    featureSchemaHash: computeFeatureSchemaHash(QB_POST_FIRST_INT_FEATURE_KEYS),
    sampleSize,
  };
}

function resolveNumericPlayId(play: QbPostFirstIntDropbackPlay, fallbackIndex: number): number {
  if (play.numericPlayId !== undefined && Number.isFinite(play.numericPlayId)) {
    return play.numericPlayId;
  }
  const dashIdx = play.playId.lastIndexOf("-");
  const tail = dashIdx >= 0 ? play.playId.slice(dashIdx + 1) : play.playId;
  const parsed = Number(tail);
  return Number.isFinite(parsed) ? parsed : fallbackIndex;
}

/**
 * Computes Q54 QB Post-First-Interception Efficiency Split.
 * Accepts `(plays, targetWeek, targetSeason?)` or `(plays, { targetWeek, targetSeason? })`.
 */
export function computeQbPostFirstIntEfficiencySplit(
  plays: readonly QbPostFirstIntDropbackPlay[],
  targetWeekOrOptions: number | ComputeQbPostFirstIntOptions,
  maybeTargetSeason?: number,
): QbPostFirstIntEfficiencySplitOutput {
  const targetWeek =
    typeof targetWeekOrOptions === "number"
      ? targetWeekOrOptions
      : targetWeekOrOptions.targetWeek;
  const targetSeason =
    typeof targetWeekOrOptions === "number"
      ? (maybeTargetSeason ?? null)
      : (targetWeekOrOptions.targetSeason ?? null);

  // Filter strictly to week < targetWeek (and targetSeason when specified).
  const pitPlays = plays.filter((p) => {
    if (!Number.isFinite(p.week) || p.week >= targetWeek) return false;
    if (targetSeason !== null && p.season !== undefined && p.season !== targetSeason) {
      return false;
    }
    return true;
  });

  const distinctWeeksAsc = Array.from(new Set(pitPlays.map((p) => p.week))).sort(
    (a, b) => a - b,
  );

  const evaluateWindow = (window: QbPostFirstIntWindowType): QbPostFirstIntWindowResult => {
    const distinctDesc = [...distinctWeeksAsc].sort((a, b) => b - a);
    const includedWeeks =
      window === "season-to-date"
        ? [...distinctWeeksAsc]
        : distinctDesc.slice(0, window === "last-4" ? 4 : 8).sort((a, b) => a - b);
    const includedSet = new Set(includedWeeks);

    const windowRawPlays =
      window === "season-to-date"
        ? pitPlays
        : pitPlays.filter((p) => includedSet.has(p.week));

    let excludedNonPassPlays = 0;
    let excludedQbSpikePlays = 0;
    let excludedEmptyGameIdPlays = 0;
    let excludedEmptyPasserIdPlays = 0;
    let excludedIntLessQbGames = 0;
    let excludedIntLessGameDropbacks = 0;
    let excludedFirstIntBoundaryPlays = 0;
    let excludedNullEpaDropbacks = 0;

    // Group valid dropbacks by (gameId, passerPlayerId)
    const byQbGame = new Map<
      string,
      {
        gameId: string;
        passerId: string;
        entries: { play: QbPostFirstIntDropbackPlay; orderKey: number; idx: number }[];
      }
    >();
    const qbTeamMap = new Map<string, string>();
    const allSeenPassers = new Set<string>();

    for (let i = 0; i < windowRawPlays.length; i++) {
      const play = windowRawPlays[i]!;
      if (play.playType !== "pass") {
        excludedNonPassPlays++;
        continue;
      }
      if (play.qbSpike === 1) {
        excludedQbSpikePlays++;
        continue;
      }
      const gameId = play.gameId.trim();
      if (gameId === "") {
        excludedEmptyGameIdPlays++;
        continue;
      }
      const passerId = play.passerPlayerId.trim();
      if (passerId === "") {
        excludedEmptyPasserIdPlays++;
        continue;
      }

      allSeenPassers.add(passerId);
      if (!qbTeamMap.has(passerId) && play.posteam && play.posteam.trim() !== "") {
        qbTeamMap.set(passerId, play.posteam.trim());
      }

      const key = `${gameId}__${passerId}`;
      let group = byQbGame.get(key);
      if (!group) {
        group = { gameId, passerId, entries: [] };
        byQbGame.set(key, group);
      }
      group.entries.push({
        play,
        orderKey: resolveNumericPlayId(play, i),
        idx: i,
      });
    }

    interface QbAccumulator {
      intGamesCount: number;
      intLessGamesExcludedCount: number;
      beforeDropbacks: number;
      beforeRatable: number;
      beforeEpaSum: number;
      afterDropbacks: number;
      afterRatable: number;
      afterEpaSum: number;
      afterSubsequentInts: number;
    }

    const qbStats = new Map<string, QbAccumulator>();
    for (const passerId of allSeenPassers) {
      qbStats.set(passerId, {
        intGamesCount: 0,
        intLessGamesExcludedCount: 0,
        beforeDropbacks: 0,
        beforeRatable: 0,
        beforeEpaSum: 0,
        afterDropbacks: 0,
        afterRatable: 0,
        afterEpaSum: 0,
        afterSubsequentInts: 0,
      });
    }

    let leagueBeforeEpaSum = 0;
    let leagueBeforeRatable = 0;
    let leagueAfterEpaSum = 0;
    let leagueAfterRatable = 0;

    // Partition each (gameId, passerId) by its first interception in play_id order
    const sortedGroupKeys = Array.from(byQbGame.keys()).sort((a, b) =>
      a < b ? -1 : a > b ? 1 : 0,
    );

    for (const key of sortedGroupKeys) {
      const group = byQbGame.get(key)!;
      const ordered = [...group.entries].sort(
        (a, b) => a.orderKey - b.orderKey || a.idx - b.idx,
      );

      const firstIntIdx = ordered.findIndex((e) => e.play.interception === 1);
      const acc = qbStats.get(group.passerId)!;

      if (firstIntIdx === -1) {
        // INT-less game for this QB: excluded from both arms and counted
        excludedIntLessQbGames++;
        excludedIntLessGameDropbacks += ordered.length;
        acc.intLessGamesExcludedCount++;
        continue;
      }

      acc.intGamesCount++;
      // The first INT play itself is excluded from both arms and counted
      excludedFirstIntBoundaryPlays++;

      for (let j = 0; j < ordered.length; j++) {
        if (j === firstIntIdx) continue; // boundary INT play excluded
        const play = ordered[j]!.play;
        const isBefore = j < firstIntIdx;
        const isRatable = play.epa !== null && Number.isFinite(play.epa);

        if (!isRatable) {
          excludedNullEpaDropbacks++;
        }

        if (isBefore) {
          acc.beforeDropbacks++;
          if (isRatable) {
            acc.beforeRatable++;
            acc.beforeEpaSum += play.epa!;
            leagueBeforeEpaSum += play.epa!;
            leagueBeforeRatable++;
          }
        } else {
          acc.afterDropbacks++;
          if (play.interception === 1) {
            acc.afterSubsequentInts++;
          }
          if (isRatable) {
            acc.afterRatable++;
            acc.afterEpaSum += play.epa!;
            leagueAfterEpaSum += play.epa!;
            leagueAfterRatable++;
          }
        }
      }
    }

    const leagueBeforeMean =
      leagueBeforeRatable > 0 ? leagueBeforeEpaSum / leagueBeforeRatable : 0;
    const leagueAfterMean =
      leagueAfterRatable > 0 ? leagueAfterEpaSum / leagueAfterRatable : 0;

    let belowFloorBeforeArmsCount = 0;
    let belowFloorAfterArmsCount = 0;
    const qbs: QbPostFirstIntWindowRow[] = [];

    const sortedPasserIds = Array.from(qbStats.keys()).sort((a, b) =>
      a < b ? -1 : a > b ? 1 : 0,
    );

    for (const passerId of sortedPasserIds) {
      const acc = qbStats.get(passerId)!;

      let beforeArm: QbPostFirstIntArm | null = null;
      if (acc.beforeRatable >= MIN_POST_FIRST_INT_ARM_RATABLE_DROPBACKS_FLOOR) {
        const rawBefore = acc.beforeEpaSum / acc.beforeRatable;
        const w = acc.beforeRatable / (acc.beforeRatable + QB_POST_FIRST_INT_SHRINKAGE_K);
        const shrunkBefore = leagueBeforeMean + w * (rawBefore - leagueBeforeMean);
        beforeArm = {
          arm: "before-first-int",
          dropbacks: acc.beforeDropbacks,
          ratableDropbacks: acc.beforeRatable,
          subsequentInterceptions: 0,
          rawEpaPerDropback: round(rawBefore, 4),
          shrunkEpaPerDropback: round(shrunkBefore, 4),
          leagueArmMean: round(leagueBeforeMean, 4),
        };
      } else {
        belowFloorBeforeArmsCount++;
      }

      let afterArm: QbPostFirstIntArm | null = null;
      if (acc.afterRatable >= MIN_POST_FIRST_INT_ARM_RATABLE_DROPBACKS_FLOOR) {
        const rawAfter = acc.afterEpaSum / acc.afterRatable;
        const w = acc.afterRatable / (acc.afterRatable + QB_POST_FIRST_INT_SHRINKAGE_K);
        const shrunkAfter = leagueAfterMean + w * (rawAfter - leagueAfterMean);
        afterArm = {
          arm: "after-first-int",
          dropbacks: acc.afterDropbacks,
          ratableDropbacks: acc.afterRatable,
          subsequentInterceptions: acc.afterSubsequentInts,
          rawEpaPerDropback: round(rawAfter, 4),
          shrunkEpaPerDropback: round(shrunkAfter, 4),
          leagueArmMean: round(leagueAfterMean, 4),
        };
      } else {
        belowFloorAfterArmsCount++;
      }

      if (beforeArm === null && afterArm === null) {
        continue;
      }

      const postIntTiltDelta =
        beforeArm !== null && afterArm !== null
          ? round(afterArm.shrunkEpaPerDropback - beforeArm.shrunkEpaPerDropback, 4)
          : null;
      const rawPostIntTiltDelta =
        beforeArm !== null && afterArm !== null
          ? round(afterArm.rawEpaPerDropback - beforeArm.rawEpaPerDropback, 4)
          : null;

      let quadrant: QbPostFirstIntWindowRow["quadrant"] = null;
      if (postIntTiltDelta !== null) {
        if (postIntTiltDelta > 0) quadrant = "bounce-back";
        else if (postIntTiltDelta < 0) quadrant = "downward-spiral";
        else quadrant = "neutral";
      }

      const totalClassifiedDropbacks = acc.beforeDropbacks + acc.afterDropbacks;
      const totalClassifiedRatableDropbacks = acc.beforeRatable + acc.afterRatable;

      qbs.push({
        passerPlayerId: passerId,
        posteam: qbTeamMap.get(passerId) ?? "",
        window,
        targetWeek,
        intGamesCount: acc.intGamesCount,
        intLessGamesExcludedCount: acc.intLessGamesExcludedCount,
        totalClassifiedDropbacks,
        totalClassifiedRatableDropbacks,
        beforeFirstIntArm: beforeArm,
        afterFirstIntArm: afterArm,
        postIntTiltDelta,
        rawPostIntTiltDelta,
        quadrant,
        provenance: buildProvenance(totalClassifiedRatableDropbacks),
      });
    }

    return {
      window,
      targetWeek,
      includedWeeks,
      leagueBeforeFirstIntMeanEpa: round(leagueBeforeMean, 4),
      leagueAfterFirstIntMeanEpa: round(leagueAfterMean, 4),
      qbs,
      diagnostics: {
        excludedNonPassPlays,
        excludedQbSpikePlays,
        excludedEmptyGameIdPlays,
        excludedEmptyPasserIdPlays,
        excludedIntLessQbGames,
        excludedIntLessGameDropbacks,
        excludedFirstIntBoundaryPlays,
        excludedNullEpaDropbacks,
        belowFloorBeforeArmsCount,
        belowFloorAfterArmsCount,
      },
    };
  };

  const seasonToDate = evaluateWindow("season-to-date");
  const last4Weeks = evaluateWindow("last-4");
  const last8Weeks = evaluateWindow("last-8");

  return {
    targetSeason,
    targetWeek,
    windows: {
      "season-to-date": seasonToDate,
      "last-4": last4Weeks,
      "last-8": last8Weeks,
    },
    seasonToDate,
    last4Weeks,
    last8Weeks,
  };
}
