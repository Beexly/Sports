/**
 * Q53 — QB Efficiency Split by Opponent Defensive Tier: Matchup Sensitivity (SHADOW).
 *
 * Computes per-QB (`passer_player_id`) own EPA/dropback (attached via `attachOwnEpa`)
 * split by point-in-time opponent defensive tier (`TOP-10` vs `REST`) plus the
 * matchup sensitivity differential (`sensitivityDelta = shrunk(TOP-10) - shrunk(REST)`).
 *
 * Point-in-Time Tier Definition:
 *   - A dropback in week `W` is classified by its `defteam`'s rank by defensive
 *     EPA/dropback ALLOWED entering week `W` — the mean own EPA allowed per ratable
 *     dropback over all valid dropbacks (`play_type === "pass"`, `qb_spike !== 1`)
 *     that defense faced in weeks strictly before `W` (`week < W`).
 *   - A defense is RANKED entering week `W` only with `>= 100` ratable dropbacks
 *     faced in weeks strictly before `W`.
 *   - Ranks are ordinal (`1..K`), ascending by mean EPA allowed (lowest allowed =
 *     rank 1 = best defense), ties broken deterministically by mean EPA allowed
 *     ascending then `defteam` ascending.
 *   - `TOP-10` = ordinal ranks 1–10 (at most 10 teams, no tie expansion).
 *   - `REST` = ordinal ranks 11+ among ranked defenses.
 *   - Unranked defenses (`< 100` prior ratable dropbacks faced, including all
 *     Week-1 dropbacks) are excluded from both arms and counted as unclassified —
 *     never backfilled from full-season ranks.
 *   - Tier classification depends ONLY on the play's own week `W` from all prior
 *     season weeks in the input, never restricted to the output window (`last-4`/`last-8`).
 *
 * V1 Scope & Exclusions:
 *   - EPA/dropback split + `sensitivityDelta` ONLY.
 *   - ANY/A is excluded (covered by Q27) and sacks/game is excluded (counting slice).
 *   - No team grain, no composite score.
 *   - Shrinkage: `shrunk = leagueTierMean + (n / (n + 20)) * (raw - leagueTierMean)`
 *     where `n` is the arm's ratable dropbacks and `leagueTierMean` is the
 *     dropback-weighted mean own EPA across all QBs' ratable dropbacks in that tier
 *     and window.
 *   - Floors: an arm is emitted only with `>= 30` ratable dropbacks in that tier;
 *     `sensitivityDelta` is emitted only when both arms are emitted.
 */

import { round as rawRound } from "./numeric.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";

function round(value: number, decimals = 4): number {
  const r = rawRound(value, decimals);
  return Object.is(r, -0) ? 0 : r;
}

export const QB_OPPONENT_TIER_EFFICIENCY_SPLIT_VERSION = "gse-qb-opp-tier-epa-v1";

export const QB_OPPONENT_TIER_FEATURE_KEYS = [
  "week",
  "passer_player_id",
  "defteam",
  "play_type",
  "qb_spike",
  "epa",
] as const;

export const MIN_PRIOR_DEFENSE_RATABLE_DROPBACKS_FOR_RANK = 100;
export const TOP_DEFENSE_TIER_MAX_RANK = 10;
export const MIN_QB_TIER_ARM_RATABLE_DROPBACKS_FLOOR = 30;
export const QB_OPPONENT_TIER_SHRINKAGE_K = 20;

export type QbOpponentTier = "TOP-10" | "REST";
export type QbOpponentTierWindowType = "season-to-date" | "last-4" | "last-8";

/** One play row mapped for Q53 QB opponent tier efficiency split. */
export interface QbOpponentTierDropbackPlay {
  readonly playId: string;
  readonly season?: number;
  readonly week: number;
  readonly passerPlayerId: string;
  readonly posteam?: string;
  readonly defteam: string;
  readonly playType: string;
  readonly qbSpike: 0 | 1 | null;
  /** Our own EPA for the play, attached via `attachOwnEpa`; `null` means unratable. */
  readonly epa: number | null;
}

/** Point-in-time defensive rank entry entering a given week `W`. */
export interface DefensePointInTimeRankEntry {
  readonly defteam: string;
  readonly week: number;
  readonly priorDropbacksFaced: number;
  readonly priorRatableDropbacksFaced: number;
  readonly priorMeanEpaAllowed: number;
  readonly ordinalRank: number;
  readonly tier: QbOpponentTier;
}

/** Metrics for one tier arm (`TOP-10` or `REST`) for a QB in a window. */
export interface QbOpponentTierArm {
  readonly tier: QbOpponentTier;
  /** All classified dropbacks in this tier arm (including null-own-EPA dropbacks). */
  readonly dropbacks: number;
  /** Classified dropbacks in this tier arm with non-null finite own EPA. */
  readonly ratableDropbacks: number;
  /** Unshrunk mean own EPA over `ratableDropbacks`. */
  readonly rawEpaPerDropback: number;
  /** Empirical Bayes shrunk EPA/dropback (`n / (n + 20)` toward `leagueTierMean`). */
  readonly shrunkEpaPerDropback: number;
  /** League dropback-weighted mean own EPA in this tier and window. */
  readonly leagueTierMean: number;
}

/** Per-QB result in a single point-in-time window. */
export interface QbOpponentTierWindowRow {
  readonly passerPlayerId: string;
  readonly posteam: string;
  readonly window: QbOpponentTierWindowType;
  readonly targetWeek: number;
  readonly totalClassifiedDropbacks: number;
  readonly totalClassifiedRatableDropbacks: number;
  readonly top10Arm: QbOpponentTierArm | null;
  readonly restArm: QbOpponentTierArm | null;
  /**
   * `top10Arm.shrunkEpaPerDropback - restArm.shrunkEpaPerDropback` when both arms
   * meet the `>= 30` ratable-dropback floor; `null` otherwise. Negative = worse vs TOP-10.
   */
  readonly sensitivityDelta: number | null;
  /** `top10Arm.rawEpaPerDropback - restArm.rawEpaPerDropback` when both arms emit. */
  readonly rawSensitivityDelta: number | null;
  readonly provenance: ExpectedMetricProvenance;
}

/** Window-level diagnostics and league tier means. */
export interface QbOpponentTierWindowDiagnostics {
  readonly excludedNonPassPlays: number;
  readonly excludedQbSpikePlays: number;
  readonly excludedEmptyDefteamPlays: number;
  readonly excludedEmptyPasserIdPlays: number;
  readonly excludedUnrankedOpponentDropbacks: number;
  readonly week1UnclassifiedDropbacks: number;
  readonly excludedNullEpaDropbacks: number;
  readonly belowFloorTop10ArmsCount: number;
  readonly belowFloorRestArmsCount: number;
}

/** Result for a single window (`season-to-date`, `last-4`, `last-8`). */
export interface QbOpponentTierWindowResult {
  readonly window: QbOpponentTierWindowType;
  readonly targetWeek: number;
  readonly includedWeeks: readonly number[];
  readonly leagueTop10MeanEpa: number;
  readonly leagueRestMeanEpa: number;
  readonly qbs: readonly QbOpponentTierWindowRow[];
  readonly diagnostics: QbOpponentTierWindowDiagnostics;
}

/** Full Q53 output across all windows plus the auditable PIT defense rankings by week. */
export interface QbOpponentTierEfficiencySplitOutput {
  readonly targetSeason: number | null;
  readonly targetWeek: number;
  /** Point-in-time ranked defenses entering each week `W < targetWeek`. */
  readonly defenseRanksByWeek: Readonly<Record<number, readonly DefensePointInTimeRankEntry[]>>;
  readonly windows: Readonly<Record<QbOpponentTierWindowType, QbOpponentTierWindowResult>>;
  readonly seasonToDate: QbOpponentTierWindowResult;
  readonly last4Weeks: QbOpponentTierWindowResult;
  readonly last8Weeks: QbOpponentTierWindowResult;
}

export interface ComputeQbOpponentTierOptions {
  readonly targetWeek: number;
  readonly targetSeason?: number;
}

function buildProvenance(sampleSize: number): ExpectedMetricProvenance {
  return {
    modelVersion: QB_OPPONENT_TIER_EFFICIENCY_SPLIT_VERSION,
    method: "deterministic-rule",
    featureKeys: [...QB_OPPONENT_TIER_FEATURE_KEYS],
    featureSchemaHash: computeFeatureSchemaHash(QB_OPPONENT_TIER_FEATURE_KEYS),
    sampleSize,
  };
}

interface ClassifiedDropback {
  readonly play: QbOpponentTierDropbackPlay;
  readonly tier: QbOpponentTier | null; // null = opponent unranked entering play.week
  readonly isRatable: boolean;
}

/**
 * Computes Q53 QB Opponent Tier Efficiency Split (`TOP-10` vs `REST`).
 * Accepts `(plays, targetWeek, targetSeason?)` or `(plays, { targetWeek, targetSeason? })`.
 */
export function computeQbOpponentTierEfficiencySplit(
  plays: readonly QbOpponentTierDropbackPlay[],
  targetWeekOrOptions: number | ComputeQbOpponentTierOptions,
  maybeTargetSeason?: number,
): QbOpponentTierEfficiencySplitOutput {
  const targetWeek =
    typeof targetWeekOrOptions === "number"
      ? targetWeekOrOptions
      : targetWeekOrOptions.targetWeek;
  const targetSeason =
    typeof targetWeekOrOptions === "number"
      ? (maybeTargetSeason ?? null)
      : (targetWeekOrOptions.targetSeason ?? null);

  // Filter strictly to week < targetWeek (and targetSeason if provided).
  const pitPlays = plays.filter((p) => {
    if (!Number.isFinite(p.week) || p.week >= targetWeek) return false;
    if (targetSeason !== null && p.season !== undefined && p.season !== targetSeason) {
      return false;
    }
    return true;
  });

  // Collect all distinct weeks present in the PIT input.
  const distinctWeeksAsc = Array.from(new Set(pitPlays.map((p) => p.week))).sort(
    (a, b) => a - b,
  );

  // Pre-filter valid pass dropbacks for defensive tier tracking (shared population:
  // playType === "pass", qbSpike !== 1, defteam !== ""). Note: rows with empty
  // passerPlayerId STILL count toward their defense's tier record.
  const validDefenseDropbacks = pitPlays.filter(
    (p) => p.playType === "pass" && p.qbSpike !== 1 && p.defteam.trim() !== "",
  );

  // Compute point-in-time defense ranks entering each week W present in pitPlays.
  const defenseRanksByWeek: Record<number, readonly DefensePointInTimeRankEntry[]> = {};
  const tierLookupByWeekAndDefteam = new Map<string, QbOpponentTier>();

  for (const weekW of distinctWeeksAsc) {
    const priorByDef = new Map<
      string,
      { dropbacks: number; ratableDropbacks: number; epaSum: number }
    >();

    for (const dp of validDefenseDropbacks) {
      if (dp.week >= weekW) continue;
      let d = priorByDef.get(dp.defteam);
      if (!d) {
        d = { dropbacks: 0, ratableDropbacks: 0, epaSum: 0 };
        priorByDef.set(dp.defteam, d);
      }
      d.dropbacks++;
      if (dp.epa !== null && Number.isFinite(dp.epa)) {
        d.ratableDropbacks++;
        d.epaSum += dp.epa;
      }
    }

    const qualifyingDefenses: {
      defteam: string;
      dropbacks: number;
      ratableDropbacks: number;
      meanEpaAllowed: number;
    }[] = [];

    for (const [defteam, stats] of priorByDef.entries()) {
      if (stats.ratableDropbacks >= MIN_PRIOR_DEFENSE_RATABLE_DROPBACKS_FOR_RANK) {
        qualifyingDefenses.push({
          defteam,
          dropbacks: stats.dropbacks,
          ratableDropbacks: stats.ratableDropbacks,
          meanEpaAllowed: stats.epaSum / stats.ratableDropbacks,
        });
      }
    }

    // Deterministic tie-break: meanEpaAllowed ascending, then defteam ascending.
    qualifyingDefenses.sort((a, b) => {
      if (a.meanEpaAllowed !== b.meanEpaAllowed) {
        return a.meanEpaAllowed - b.meanEpaAllowed;
      }
      return a.defteam < b.defteam ? -1 : a.defteam > b.defteam ? 1 : 0;
    });

    const weekEntries: DefensePointInTimeRankEntry[] = qualifyingDefenses.map((d, idx) => {
      const ordinalRank = idx + 1;
      const tier: QbOpponentTier =
        ordinalRank <= TOP_DEFENSE_TIER_MAX_RANK ? "TOP-10" : "REST";
      tierLookupByWeekAndDefteam.set(`${weekW}__${d.defteam}`, tier);
      return {
        defteam: d.defteam,
        week: weekW,
        priorDropbacksFaced: d.dropbacks,
        priorRatableDropbacksFaced: d.ratableDropbacks,
        priorMeanEpaAllowed: round(d.meanEpaAllowed, 4),
        ordinalRank,
        tier,
      };
    });

    defenseRanksByWeek[weekW] = weekEntries;
  }

  // Helper to evaluate one window ("season-to-date" | "last-4" | "last-8")
  const evaluateWindow = (window: QbOpponentTierWindowType): QbOpponentTierWindowResult => {
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
    let excludedEmptyDefteamPlays = 0;
    let excludedEmptyPasserIdPlays = 0;
    let excludedUnrankedOpponentDropbacks = 0;
    let week1UnclassifiedDropbacks = 0;
    let excludedNullEpaDropbacks = 0;

    // Classify every QB-attributed pass dropback in the window using the play's OWN week tier!
    const classifiedByQb = new Map<string, ClassifiedDropback[]>();
    const qbTeamMap = new Map<string, string>();

    let leagueTop10EpaSum = 0;
    let leagueTop10RatableCount = 0;
    let leagueRestEpaSum = 0;
    let leagueRestRatableCount = 0;

    for (const play of windowRawPlays) {
      if (play.playType !== "pass") {
        excludedNonPassPlays++;
        continue;
      }
      if (play.qbSpike === 1) {
        excludedQbSpikePlays++;
        continue;
      }
      if (play.defteam.trim() === "") {
        excludedEmptyDefteamPlays++;
        continue;
      }
      const passerId = play.passerPlayerId.trim();
      if (passerId === "") {
        excludedEmptyPasserIdPlays++;
        continue;
      }

      if (!qbTeamMap.has(passerId) && play.posteam && play.posteam.trim() !== "") {
        qbTeamMap.set(passerId, play.posteam.trim());
      }

      const tier = tierLookupByWeekAndDefteam.get(`${play.week}__${play.defteam}`) ?? null;
      if (tier === null) {
        excludedUnrankedOpponentDropbacks++;
        if (play.week === 1) {
          week1UnclassifiedDropbacks++;
        }
        // Ensure QB still has a bucket if they had plays in the window
        if (!classifiedByQb.has(passerId)) {
          classifiedByQb.set(passerId, []);
        }
        continue;
      }

      const isRatable = play.epa !== null && Number.isFinite(play.epa);
      if (!isRatable) {
        excludedNullEpaDropbacks++;
      } else {
        if (tier === "TOP-10") {
          leagueTop10EpaSum += play.epa!;
          leagueTop10RatableCount++;
        } else {
          leagueRestEpaSum += play.epa!;
          leagueRestRatableCount++;
        }
      }

      const bucket = classifiedByQb.get(passerId) ?? [];
      bucket.push({ play, tier, isRatable });
      classifiedByQb.set(passerId, bucket);
    }

    const leagueTop10Mean =
      leagueTop10RatableCount > 0 ? leagueTop10EpaSum / leagueTop10RatableCount : 0;
    const leagueRestMean =
      leagueRestRatableCount > 0 ? leagueRestEpaSum / leagueRestRatableCount : 0;

    let belowFloorTop10ArmsCount = 0;
    let belowFloorRestArmsCount = 0;
    const qbs: QbOpponentTierWindowRow[] = [];

    const sortedPasserIds = Array.from(classifiedByQb.keys()).sort((a, b) =>
      a < b ? -1 : a > b ? 1 : 0,
    );

    for (const passerId of sortedPasserIds) {
      const playsForQb = classifiedByQb.get(passerId)!;

      let top10Dropbacks = 0;
      let top10Ratable = 0;
      let top10EpaSum = 0;

      let restDropbacks = 0;
      let restRatable = 0;
      let restEpaSum = 0;

      for (const item of playsForQb) {
        if (item.tier === "TOP-10") {
          top10Dropbacks++;
          if (item.isRatable) {
            top10Ratable++;
            top10EpaSum += item.play.epa!;
          }
        } else if (item.tier === "REST") {
          restDropbacks++;
          if (item.isRatable) {
            restRatable++;
            restEpaSum += item.play.epa!;
          }
        }
      }

      let top10Arm: QbOpponentTierArm | null = null;
      if (top10Ratable >= MIN_QB_TIER_ARM_RATABLE_DROPBACKS_FLOOR) {
        const rawTop10 = top10EpaSum / top10Ratable;
        const w = top10Ratable / (top10Ratable + QB_OPPONENT_TIER_SHRINKAGE_K);
        const shrunkTop10 = leagueTop10Mean + w * (rawTop10 - leagueTop10Mean);
        top10Arm = {
          tier: "TOP-10",
          dropbacks: top10Dropbacks,
          ratableDropbacks: top10Ratable,
          rawEpaPerDropback: round(rawTop10, 4),
          shrunkEpaPerDropback: round(shrunkTop10, 4),
          leagueTierMean: round(leagueTop10Mean, 4),
        };
      } else {
        belowFloorTop10ArmsCount++;
      }

      let restArm: QbOpponentTierArm | null = null;
      if (restRatable >= MIN_QB_TIER_ARM_RATABLE_DROPBACKS_FLOOR) {
        const rawRest = restEpaSum / restRatable;
        const w = restRatable / (restRatable + QB_OPPONENT_TIER_SHRINKAGE_K);
        const shrunkRest = leagueRestMean + w * (rawRest - leagueRestMean);
        restArm = {
          tier: "REST",
          dropbacks: restDropbacks,
          ratableDropbacks: restRatable,
          rawEpaPerDropback: round(rawRest, 4),
          shrunkEpaPerDropback: round(shrunkRest, 4),
          leagueTierMean: round(leagueRestMean, 4),
        };
      } else {
        belowFloorRestArmsCount++;
      }

      // Emit QB row if at least one arm is emitted
      if (top10Arm === null && restArm === null) {
        continue;
      }

      const sensitivityDelta =
        top10Arm !== null && restArm !== null
          ? round(top10Arm.shrunkEpaPerDropback - restArm.shrunkEpaPerDropback, 4)
          : null;
      const rawSensitivityDelta =
        top10Arm !== null && restArm !== null
          ? round(top10Arm.rawEpaPerDropback - restArm.rawEpaPerDropback, 4)
          : null;

      const totalClassifiedDropbacks = top10Dropbacks + restDropbacks;
      const totalClassifiedRatableDropbacks = top10Ratable + restRatable;

      qbs.push({
        passerPlayerId: passerId,
        posteam: qbTeamMap.get(passerId) ?? "",
        window,
        targetWeek,
        totalClassifiedDropbacks,
        totalClassifiedRatableDropbacks,
        top10Arm,
        restArm,
        sensitivityDelta,
        rawSensitivityDelta,
        provenance: buildProvenance(totalClassifiedRatableDropbacks),
      });
    }

    return {
      window,
      targetWeek,
      includedWeeks,
      leagueTop10MeanEpa: round(leagueTop10Mean, 4),
      leagueRestMeanEpa: round(leagueRestMean, 4),
      qbs,
      diagnostics: {
        excludedNonPassPlays,
        excludedQbSpikePlays,
        excludedEmptyDefteamPlays,
        excludedEmptyPasserIdPlays,
        excludedUnrankedOpponentDropbacks,
        week1UnclassifiedDropbacks,
        excludedNullEpaDropbacks,
        belowFloorTop10ArmsCount,
        belowFloorRestArmsCount,
      },
    };
  };

  const seasonToDate = evaluateWindow("season-to-date");
  const last4Weeks = evaluateWindow("last-4");
  const last8Weeks = evaluateWindow("last-8");

  return {
    targetSeason,
    targetWeek,
    defenseRanksByWeek,
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
