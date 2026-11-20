/**
 * QB efficiency split by opponent defensive tier (Q53 — SHADOW).
 *
 * V1 SCOPE (pinned): EPA/dropback split + sensitivity delta ONLY.
 * EXPLICIT EXCLUSIONS:
 *   - ANY/A is Q27's fired surface (PR #1186) — excluded here.
 *   - Sacks/game and completion-rate slices — excluded here.
 *
 * Pinned rules (2026-11-08 AM run 67):
 *   1. POINT-IN-TIME (PIT) TIER BASIS:
 *      A dropback's opponent tier is the DEFTEAM's rank by defensive own-EPA/dropback
 *      ALLOWED entering THAT PLAY'S OWN week (`prior.week < play.week`), ranked ascending
 *      (lowest EPA allowed = rank 1 = best defense) across defenses with >= 100 ratable
 *      dropbacks faced entering that play's week.
 *      - TOP_10 = ordinal ranks 1..10 with deterministic tie-break (meanEpaAllowed asc,
 *        then defteam asc) — at most 10 teams, no tie expansion.
 *      - Defenses below the 100-dropback prior floor are UNRANKED that week; dropbacks
 *        against an unranked defense (including ALL Week-1 dropbacks) are excluded from
 *        both arms and counted in diagnostics (`unrankedOpponentDropbacksExcluded`).
 *        Never backfill early weeks from full-season/targetWeek defensive ranks.
 *   2. DROPBACK POPULATION (mirrors Q42):
 *      `playType === "pass"` rows; `qbSpike === 1` excluded from both arms and counted
 *      (`spikesExcluded`); sacks stay IN (`playType === "pass"`); scrambles never enter
 *      (`playType === "run"`). Own EPA `null` is excluded from the arm's mean + counted
 *      (`nullEpaExcluded`), while still counting in the arm's `dropbacks` total.
 *      Defensive tier ranking and QB arms share this exact dropback population.
 *   3. WINDOWS, SHRINKAGE & FLOORS:
 *      Per QB (`passerPlayerId` non-empty; empty excluded + counted), per window
 *      (`"season-to-date" | "last-4" | "last-8"` distinct weeks `< targetWeek`), per tier arm:
 *        `shrunkEpaPerDropback = leagueTierMean + (n / (n + 20)) * (raw - leagueTierMean)`
 *      where `n = ratableDropbacks` and `leagueTierMean` is the dropback-weighted mean own EPA
 *      over ALL QBs' ratable dropbacks in that tier + window.
 *      An arm is emitted only when `ratableDropbacks >= 30`; `sensitivityDelta` is emitted
 *      only when BOTH arms meet the floor.
 */

import { round } from "./numeric.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";

export const QB_OPPONENT_TIER_SPLIT_MODEL_VERSION = "gse-qb-opponent-tier-split-v1";

export const QB_OPPONENT_TIER_FEATURE_KEYS = [
  "play_id",
  "week",
  "posteam",
  "defteam",
  "passer_player_id",
  "play_type",
  "qb_spike",
  "epa",
] as const;

export type QbOpponentTierWindow = "season-to-date" | "last-4" | "last-8";

export interface QbOpponentTierDropbackPlay {
  readonly playId: string;
  readonly week: number;
  readonly posteam: string;
  readonly defteam: string;
  readonly passerPlayerId: string;
  readonly passerPlayerName?: string;
  readonly playType: "pass" | "run" | string;
  readonly qbSpike?: 0 | 1;
  /** Our own EPA attached via attachOwnEpa; null means unratable. */
  readonly epa: number | null;
}

export interface DefensivePassTierRank {
  readonly defteam: string;
  readonly rank: number; // 1 = lowest EPA/dropback allowed
  readonly ratableDropbacksFaced: number;
  readonly meanEpaAllowedPerDropback: number;
  readonly tier: "TOP_10" | "REST_OF_LEAGUE";
}

export interface QbTierSliceMetrics {
  readonly dropbacks: number;
  readonly ratableDropbacks: number;
  readonly rawEpaPerDropback: number;
  readonly shrunkEpaPerDropback: number;
}

export interface QbOpponentTierSplitResult {
  readonly passerPlayerId: string;
  readonly passerPlayerName: string;
  readonly posteam: string;
  readonly window: QbOpponentTierWindow;
  readonly top10DefenseSlice: QbTierSliceMetrics | null;
  readonly restOfLeagueSlice: QbTierSliceMetrics | null;
  /** top10.rawEpaPerDropback - rest.rawEpaPerDropback when both arms qualify, else null. */
  readonly rawSensitivityDelta: number | null;
  /** top10.shrunkEpaPerDropback - rest.shrunkEpaPerDropback when both arms qualify, else null. */
  readonly sensitivityDelta: number | null;
  /** Alias for sensitivityDelta for downstream callers. */
  readonly tierDropoffDelta: number | null;
  readonly provenance: ExpectedMetricProvenance;
}

export interface QbOpponentTierSplitDiagnostics {
  readonly nonPassExcluded: number;
  readonly spikesExcluded: number;
  readonly missingPasserExcluded: number;
  readonly unrankedOpponentDropbacksExcluded: number;
  readonly nullEpaExcluded: number;
  readonly belowFloorTop10Arms: number;
  readonly belowFloorRestArms: number;
  readonly qbsWithBothArms: number;
  readonly qbsExcludedBothArmsBelowFloor: number;
}

export interface QbOpponentTierSplitOutput {
  readonly results: readonly QbOpponentTierSplitResult[];
  /** Snapshot of defensive ranks entering targetWeek (for inspection/audit). */
  readonly defensiveRanks: readonly DefensivePassTierRank[];
  readonly leagueTierMeans: {
    readonly top10MeanEpa: number;
    readonly restMeanEpa: number;
  };
  readonly diagnostics: QbOpponentTierSplitDiagnostics;
}

export interface QbOpponentTierOptions {
  readonly window?: QbOpponentTierWindow;
  /** Default 100 per Q53 pinned spec. */
  readonly minPriorDefDropbacks?: number;
  /** Default 30 per Q53 pinned spec. */
  readonly minArmDropbacks?: number;
  /** Default 20 per Q53 pinned spec. */
  readonly shrinkageK?: number;
  /** Default 10 per Q53 pinned spec. */
  readonly topTierCount?: number;
}

function buildProvenance(sampleSize: number): ExpectedMetricProvenance {
  return {
    modelVersion: QB_OPPONENT_TIER_SPLIT_MODEL_VERSION,
    method: "empirical-bayes-shrinkage",
    featureKeys: [...QB_OPPONENT_TIER_FEATURE_KEYS],
    featureSchemaHash: computeFeatureSchemaHash(QB_OPPONENT_TIER_FEATURE_KEYS),
    sampleSize,
  };
}

/**
 * Ranks defenses entering `enteringWeek` using strictly prior pass dropbacks
 * (`play.week < enteringWeek`, `playType === "pass"`, `qbSpike !== 1`, `epa !== null`)
 * across defenses that have faced `>= minPriorDefDropbacks` ratable dropbacks.
 */
export function rankDefensesEnteringWeek(
  allPriorPassPlays: readonly QbOpponentTierDropbackPlay[],
  enteringWeek: number,
  minPriorDefDropbacks = 100,
  topTierCount = 10,
): Map<string, DefensivePassTierRank> {
  const byDef = new Map<string, { count: number; epaSum: number }>();

  for (const p of allPriorPassPlays) {
    if (p.week >= enteringWeek) continue;
    if (p.playType !== "pass") continue;
    if (p.qbSpike === 1) continue;
    const def = p.defteam?.trim();
    if (!def) continue;
    if (p.epa === null || !Number.isFinite(p.epa)) continue;

    let acc = byDef.get(def);
    if (!acc) {
      acc = { count: 0, epaSum: 0 };
      byDef.set(def, acc);
    }
    acc.count += 1;
    acc.epaSum += p.epa;
  }

  const eligible = [...byDef.entries()]
    .filter(([, v]) => v.count >= minPriorDefDropbacks)
    .map(([defteam, v]) => ({
      defteam,
      ratableDropbacksFaced: v.count,
      meanEpaAllowedPerDropback: v.epaSum / v.count,
    }))
    .sort(
      (a, b) =>
        a.meanEpaAllowedPerDropback - b.meanEpaAllowedPerDropback ||
        a.defteam.localeCompare(b.defteam),
    );

  const ranked = new Map<string, DefensivePassTierRank>();
  for (let i = 0; i < eligible.length; i++) {
    const item = eligible[i]!;
    const rank = i + 1;
    ranked.set(item.defteam, {
      defteam: item.defteam,
      rank,
      ratableDropbacksFaced: item.ratableDropbacksFaced,
      meanEpaAllowedPerDropback: round(item.meanEpaAllowedPerDropback, 4),
      tier: rank <= topTierCount ? "TOP_10" : "REST_OF_LEAGUE",
    });
  }
  return ranked;
}

export function computeQbOpponentTierSplit(
  plays: readonly QbOpponentTierDropbackPlay[],
  targetWeek: number,
  options: QbOpponentTierOptions = {},
): QbOpponentTierSplitOutput {
  const window: QbOpponentTierWindow = options.window ?? "season-to-date";
  const minPriorDefDropbacks = options.minPriorDefDropbacks ?? 100;
  const minArmDropbacks = options.minArmDropbacks ?? 30;
  const shrinkageK = options.shrinkageK ?? 20;
  const topTierCount = options.topTierCount ?? 10;

  // Step 1: Strictly prior plays (< targetWeek)
  const pastPlays = plays.filter((p) => Number.isFinite(p.week) && p.week < targetWeek);

  // Determine which weeks belong to the QB evaluation window (season-to-date / last-4 / last-8).
  // Note: PIT defensive rankings entering week W always use all season-to-date weeks < W.
  let windowWeeks: Set<number> | null = null;
  if (window !== "season-to-date") {
    const distinctWeeks = Array.from(new Set(pastPlays.map((p) => p.week))).sort((a, b) => b - a);
    const limit = window === "last-4" ? 4 : 8;
    windowWeeks = new Set(distinctWeeks.slice(0, limit));
  }

  // Precompute PIT defensive rankings entering each distinct week present in the window
  const distinctEvalWeeks = Array.from(
    new Set(
      pastPlays
        .filter((p) => (windowWeeks === null ? true : windowWeeks.has(p.week)))
        .map((p) => p.week),
    ),
  ).sort((a, b) => a - b);

  const pitRankByWeek = new Map<number, Map<string, DefensivePassTierRank>>();
  for (const w of distinctEvalWeeks) {
    pitRankByWeek.set(
      w,
      rankDefensesEnteringWeek(pastPlays, w, minPriorDefDropbacks, topTierCount),
    );
  }

  let nonPassExcluded = 0;
  let spikesExcluded = 0;
  let missingPasserExcluded = 0;
  let unrankedOpponentDropbacksExcluded = 0;
  let nullEpaExcluded = 0;

  interface ArmAccumulator {
    dropbacks: number;
    ratableDropbacks: number;
    epaSum: number;
  }

  interface QbAccumulator {
    passerPlayerId: string;
    passerPlayerName: string;
    posteam: string;
    top10: ArmAccumulator;
    rest: ArmAccumulator;
  }

  const byQb = new Map<string, QbAccumulator>();
  let lgTop10Ratable = 0;
  let lgTop10EpaSum = 0;
  let lgRestRatable = 0;
  let lgRestEpaSum = 0;

  for (const p of pastPlays) {
    if (windowWeeks !== null && !windowWeeks.has(p.week)) continue;

    if (p.playType !== "pass") {
      nonPassExcluded += 1;
      continue;
    }
    if (p.qbSpike === 1) {
      spikesExcluded += 1;
      continue;
    }
    const qbId = p.passerPlayerId?.trim();
    if (!qbId) {
      missingPasserExcluded += 1;
      continue;
    }
    const def = p.defteam?.trim();
    const weekRanks = pitRankByWeek.get(p.week);
    const defRank = def && weekRanks ? weekRanks.get(def) : undefined;
    if (!defRank) {
      unrankedOpponentDropbacksExcluded += 1;
      continue;
    }

    let qb = byQb.get(qbId);
    if (!qb) {
      qb = {
        passerPlayerId: qbId,
        passerPlayerName: p.passerPlayerName?.trim() || qbId,
        posteam: p.posteam?.trim() || "",
        top10: { dropbacks: 0, ratableDropbacks: 0, epaSum: 0 },
        rest: { dropbacks: 0, ratableDropbacks: 0, epaSum: 0 },
      };
      byQb.set(qbId, qb);
    } else if (p.passerPlayerName && qb.passerPlayerName === qb.passerPlayerId) {
      qb.passerPlayerName = p.passerPlayerName.trim();
    }

    const arm = defRank.tier === "TOP_10" ? qb.top10 : qb.rest;
    arm.dropbacks += 1;

    if (p.epa === null || !Number.isFinite(p.epa)) {
      nullEpaExcluded += 1;
      continue;
    }

    arm.ratableDropbacks += 1;
    arm.epaSum += p.epa;

    if (defRank.tier === "TOP_10") {
      lgTop10Ratable += 1;
      lgTop10EpaSum += p.epa;
    } else {
      lgRestRatable += 1;
      lgRestEpaSum += p.epa;
    }
  }

  const top10MeanEpa = lgTop10Ratable > 0 ? lgTop10EpaSum / lgTop10Ratable : 0;
  const restMeanEpa = lgRestRatable > 0 ? lgRestEpaSum / lgRestRatable : 0;

  let belowFloorTop10Arms = 0;
  let belowFloorRestArms = 0;
  let qbsWithBothArms = 0;
  let qbsExcludedBothArmsBelowFloor = 0;

  const results: QbOpponentTierSplitResult[] = [];
  const sortedQbIds = Array.from(byQb.keys()).sort();

  for (const qbId of sortedQbIds) {
    const qb = byQb.get(qbId)!;

    const buildArm = (acc: ArmAccumulator, leagueMean: number): QbTierSliceMetrics | null => {
      if (acc.ratableDropbacks < minArmDropbacks) return null;
      const rawEpa = acc.epaSum / acc.ratableDropbacks;
      const weight = acc.ratableDropbacks / (acc.ratableDropbacks + shrinkageK);
      const shrunkEpa = leagueMean + weight * (rawEpa - leagueMean);
      return {
        dropbacks: acc.dropbacks,
        ratableDropbacks: acc.ratableDropbacks,
        rawEpaPerDropback: round(rawEpa, 4),
        shrunkEpaPerDropback: round(shrunkEpa, 4),
      };
    };

    const top10Slice = buildArm(qb.top10, top10MeanEpa);
    const restSlice = buildArm(qb.rest, restMeanEpa);

    if (top10Slice === null) belowFloorTop10Arms += 1;
    if (restSlice === null) belowFloorRestArms += 1;

    if (top10Slice === null && restSlice === null) {
      qbsExcludedBothArmsBelowFloor += 1;
      continue;
    }

    const bothPresent = top10Slice !== null && restSlice !== null;
    if (bothPresent) qbsWithBothArms += 1;

    const rawDelta = bothPresent
      ? round(top10Slice.rawEpaPerDropback - restSlice.rawEpaPerDropback, 4)
      : null;
    const shrunkDelta = bothPresent
      ? round(top10Slice.shrunkEpaPerDropback - restSlice.shrunkEpaPerDropback, 4)
      : null;

    const sampleSize = qb.top10.ratableDropbacks + qb.rest.ratableDropbacks;

    results.push({
      passerPlayerId: qb.passerPlayerId,
      passerPlayerName: qb.passerPlayerName,
      posteam: qb.posteam,
      window,
      top10DefenseSlice: top10Slice,
      restOfLeagueSlice: restSlice,
      rawSensitivityDelta: rawDelta,
      sensitivityDelta: shrunkDelta,
      tierDropoffDelta: shrunkDelta,
      provenance: buildProvenance(sampleSize),
    });
  }

  // Snapshot of defensive ranks entering targetWeek
  const enteringTargetWeekRanks = Array.from(
    rankDefensesEnteringWeek(pastPlays, targetWeek, minPriorDefDropbacks, topTierCount).values(),
  );

  return {
    results,
    defensiveRanks: enteringTargetWeekRanks,
    leagueTierMeans: {
      top10MeanEpa: round(top10MeanEpa, 4),
      restMeanEpa: round(restMeanEpa, 4),
    },
    diagnostics: {
      nonPassExcluded,
      spikesExcluded,
      missingPasserExcluded,
      unrankedOpponentDropbacksExcluded,
      nullEpaExcluded,
      belowFloorTop10Arms,
      belowFloorRestArms,
      qbsWithBothArms,
      qbsExcludedBothArmsBelowFloor,
    },
  };
}
