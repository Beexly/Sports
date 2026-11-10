/**
 * Q52 — Defensive Field-Zone Split: Red-Zone vs Open-Field Efficiency Allowed (SHADOW).
 *
 * Computes per-defense (`defteam`) own EPA/play allowed (attached via `attachOwnEpa`)
 * and success rate allowed (reusing `isSuccessfulPlay` from `./success-rate.js`
 * without re-implementation) split by field zone:
 *   - RED ZONE: `yardline_100 <= 20` (distance from the defended end zone in the
 *     possessing team's frame in nflverse play-by-play).
 *   - OPEN FIELD: `yardline_100 > 20`.
 *   - Plays with a non-finite `yardline_100` are excluded from both zones and
 *     counted in diagnostics.
 *
 * Also emits `redZoneTdRateAllowed`, a per-play rate equal to offensive touchdowns
 * allowed on red-zone scrimmage plays (`touchdown === 1 && turnover === 0`, so
 * defensive pick-sixes / fumble-sixes are excluded) divided by red-zone scrimmage
 * plays. Never a per-trip rate (drive joins are out of scope).
 *
 * V1 Scope & Exclusions:
 *   - EPA + success rate + per-play red-zone TD rate only.
 *   - NO DVOA (FTN proprietary), NO shrinkage in v1, NO composite score.
 *   - Point-in-time (`week < targetWeek`) across `season-to-date`, `last-4`, and
 *     `last-8` distinct-week windows.
 *   - Floors: a defense is emitted in a window only if `redZone.plays >= 30`,
 *     `openField.plays >= 100`, and `redZone.epaPlays >= 30`.
 */

import { round as rawRound } from "./numeric.js";
import { isSuccessfulPlay, type SuccessPlay } from "./success-rate.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";

function round(value: number, decimals = 4): number {
  const r = rawRound(value, decimals);
  return Object.is(r, -0) ? 0 : r;
}

export const DEFENSIVE_FIELD_ZONE_SPLIT_VERSION = "gse-def-field-zone-split-v1";

export const DEFENSIVE_FIELD_ZONE_SPLIT_FEATURE_KEYS = [
  "week",
  "defteam",
  "posteam",
  "play_type",
  "yardline_100",
  "down",
  "ydstogo",
  "yards_gained",
  "touchdown",
  "turnover",
  "epa",
] as const;

export const RED_ZONE_MAX_YARDLINE_100 = 20;
export const MIN_RED_ZONE_PLAYS_FLOOR = 30;
export const MIN_OPEN_FIELD_PLAYS_FLOOR = 100;
export const MIN_RED_ZONE_EPA_PLAYS_FLOOR = 30;
export const DEFAULT_OPEN_FIELD_WEIGHT = 0.55;
export const DEFAULT_RED_ZONE_WEIGHT = 0.45;

export type FieldZoneWindowType = "season-to-date" | "last-4" | "last-8";

/** One scrimmage play mapped for the Q52 defensive field-zone split. */
export interface DefensiveFieldZonePlay {
  readonly playId: string;
  readonly season?: number;
  readonly week: number;
  readonly defteam: string;
  readonly posteam: string;
  /** `"pass"` or `"run"` for scrimmage plays; other play types are excluded. */
  readonly playType: string;
  /** Optional QB kneel indicator (`1` = kneel, excluded even if playType is `"run"`). */
  readonly qbKneel?: 0 | 1 | null;
  /** Optional QB spike indicator (`1` = spike, excluded even if playType is `"pass"`). */
  readonly qbSpike?: 0 | 1 | null;
  /** Distance from the defended end zone (`<= 20` red zone, `> 20` open field). */
  readonly yardline100: number;
  readonly down: number;
  readonly ydstogo: number;
  readonly yardsGained: number;
  readonly touchdown: 0 | 1;
  readonly turnover: 0 | 1;
  /** Our own EPA for the play, attached via `attachOwnEpa`; `null` means unratable. */
  readonly epa: number | null;
}

/** Metrics emitted for a single field zone (red zone or open field). */
export interface DefensiveFieldZoneMetrics {
  readonly plays: number;
  readonly epaPlays: number;
  readonly meanEpaAllowed: number;
  readonly successPlays: number;
  readonly successesAllowed: number;
  readonly successRateAllowed: number;
}

/** Red-zone metrics including per-play offensive TD rate allowed. */
export interface DefensiveRedZoneMetrics extends DefensiveFieldZoneMetrics {
  readonly touchdownsAllowed: number;
  readonly redZoneTdRateAllowed: number;
}

/** Per-defense field-zone split row for a point-in-time window. */
export interface DefenseFieldZoneSplitRow {
  readonly defteam: string;
  readonly window: FieldZoneWindowType;
  readonly targetWeek: number;
  readonly redZone: DefensiveRedZoneMetrics;
  readonly openField: DefensiveFieldZoneMetrics;
  /** `redZone.meanEpaAllowed - openField.meanEpaAllowed` (positive = worse in red zone). */
  readonly epaSplit: number;
  /** `redZone.successRateAllowed - openField.successRateAllowed` (positive = worse in red zone). */
  readonly successSplit: number;
  /**Per-play offensive TD rate on red-zone scrimmage plays (`touchdown === 1 && turnover === 0`). */
  readonly redZoneTdRateAllowed: number;
  readonly provenance: ExpectedMetricProvenance;
}

/** Plain league zone means over floor-qualifying defenses in the window. */
export interface FieldZoneLeagueContext {
  readonly qualifyingDefenses: number;
  readonly redZoneMeanEpaAllowed: number | null;
  readonly openFieldMeanEpaAllowed: number | null;
  readonly redZoneMeanSuccessRateAllowed: number | null;
  readonly openFieldMeanSuccessRateAllowed: number | null;
  readonly meanRedZoneTdRateAllowed: number | null;
  readonly meanEpaSplit: number | null;
  readonly meanSuccessSplit: number | null;
}

/** Reason a defense was excluded from emission in a window. */
export interface BelowFloorDefenseDiagnostic {
  readonly defteam: string;
  readonly redZonePlays: number;
  readonly openFieldPlays: number;
  readonly redZoneEpaPlays: number;
  readonly reasons: readonly (
    | "red_zone_plays_below_30"
    | "open_field_plays_below_100"
    | "red_zone_epa_plays_below_30"
    | "open_field_epa_plays_zero"
    | "red_zone_success_plays_zero"
    | "open_field_success_plays_zero"
  )[];
}

/** Exclusion and floor diagnostics for a window. */
export interface DefensiveFieldZoneDiagnostics {
  readonly excludedNonScrimmagePlays: number;
  readonly excludedKneelOrSpikePlays: number;
  readonly excludedEmptyTeamPlays: number;
  readonly excludedNonFiniteYardlinePlays: number;
  readonly excludedNullEpaPlays: number;
  readonly redZoneExcludedNullEpaPlays: number;
  readonly openFieldExcludedNullEpaPlays: number;
  readonly excludedUnratableSuccessPlays: number;
  readonly redZoneExcludedUnratableSuccessPlays: number;
  readonly openFieldExcludedUnratableSuccessPlays: number;
  readonly belowFloorDefensesCount: number;
  readonly belowFloorDefenses: readonly BelowFloorDefenseDiagnostic[];
}

/** Window result for Q52. */
export interface DefensiveFieldZoneWindowResult {
  readonly window: FieldZoneWindowType;
  readonly targetWeek: number;
  readonly includedWeeks: readonly number[];
  readonly defenses: readonly DefenseFieldZoneSplitRow[];
  readonly leagueContext: FieldZoneLeagueContext;
  readonly diagnostics: DefensiveFieldZoneDiagnostics;
}

/** Full Q52 result across all three point-in-time windows. */
export interface DefensiveFieldZoneSplitOutput {
  readonly targetSeason: number | null;
  readonly targetWeek: number;
  readonly windows: Readonly<Record<FieldZoneWindowType, DefensiveFieldZoneWindowResult>>;
  readonly seasonToDate: DefensiveFieldZoneWindowResult;
  readonly last4Weeks: DefensiveFieldZoneWindowResult;
  readonly last8Weeks: DefensiveFieldZoneWindowResult;
}

export interface ComputeDefensiveFieldZoneOptions {
  readonly targetWeek: number;
  readonly targetSeason?: number;
}

function buildProvenance(sampleSize: number): ExpectedMetricProvenance {
  return {
    modelVersion: DEFENSIVE_FIELD_ZONE_SPLIT_VERSION,
    method: "deterministic-rule",
    featureKeys: [...DEFENSIVE_FIELD_ZONE_SPLIT_FEATURE_KEYS],
    featureSchemaHash: computeFeatureSchemaHash(DEFENSIVE_FIELD_ZONE_SPLIT_FEATURE_KEYS),
    sampleSize,
  };
}

interface ZoneAccumulator {
  plays: number;
  epaPlays: number;
  epaSum: number;
  successPlays: number;
  successesAllowed: number;
  touchdownsAllowed: number;
}

function emptyZoneAccumulator(): ZoneAccumulator {
  return {
    plays: 0,
    epaPlays: 0,
    epaSum: 0,
    successPlays: 0,
    successesAllowed: 0,
    touchdownsAllowed: 0,
  };
}

function computeWindowResult(
  pitPlays: readonly DefensiveFieldZonePlay[],
  targetWeek: number,
  window: FieldZoneWindowType,
): DefensiveFieldZoneWindowResult {
  const allDistinctWeeks = Array.from(new Set(pitPlays.map((p) => p.week))).sort((a, b) => b - a);
  const includedWeeksList =
    window === "season-to-date"
      ? [...allDistinctWeeks].sort((a, b) => a - b)
      : allDistinctWeeks.slice(0, window === "last-4" ? 4 : 8).sort((a, b) => a - b);
  const includedWeeksSet = new Set(includedWeeksList);

  const windowPlays =
    window === "season-to-date"
      ? pitPlays
      : pitPlays.filter((p) => includedWeeksSet.has(p.week));

  let excludedNonScrimmagePlays = 0;
  let excludedKneelOrSpikePlays = 0;
  let excludedEmptyTeamPlays = 0;
  let excludedNonFiniteYardlinePlays = 0;
  let excludedNullEpaPlays = 0;
  let redZoneExcludedNullEpaPlays = 0;
  let openFieldExcludedNullEpaPlays = 0;
  let excludedUnratableSuccessPlays = 0;
  let redZoneExcludedUnratableSuccessPlays = 0;
  let openFieldExcludedUnratableSuccessPlays = 0;

  const byDefense = new Map<
    string,
    { redZone: ZoneAccumulator; openField: ZoneAccumulator }
  >();

  for (const play of windowPlays) {
    if (play.qbKneel === 1 || play.qbSpike === 1) {
      excludedKneelOrSpikePlays++;
      continue;
    }
    if (play.playType !== "pass" && play.playType !== "run") {
      excludedNonScrimmagePlays++;
      continue;
    }
    if (play.defteam.trim() === "" || play.posteam.trim() === "") {
      excludedEmptyTeamPlays++;
      continue;
    }
    if (!Number.isFinite(play.yardline100)) {
      excludedNonFiniteYardlinePlays++;
      continue;
    }

    let entry = byDefense.get(play.defteam);
    if (!entry) {
      entry = {
        redZone: emptyZoneAccumulator(),
        openField: emptyZoneAccumulator(),
      };
      byDefense.set(play.defteam, entry);
    }

    const isRedZone = play.yardline100 <= RED_ZONE_MAX_YARDLINE_100;
    const zoneAcc = isRedZone ? entry.redZone : entry.openField;

    zoneAcc.plays++;

    // Red-zone offensive TD allowed: touchdown === 1 && turnover === 0 (pick-six excluded).
    if (isRedZone && play.touchdown === 1 && play.turnover === 0) {
      zoneAcc.touchdownsAllowed++;
    }

    // Own EPA check
    if (play.epa !== null && Number.isFinite(play.epa)) {
      zoneAcc.epaPlays++;
      zoneAcc.epaSum += play.epa;
    } else {
      excludedNullEpaPlays++;
      if (isRedZone) redZoneExcludedNullEpaPlays++;
      else openFieldExcludedNullEpaPlays++;
    }

    // Success rate check via isSuccessfulPlay from success-rate.ts
    const successInput: SuccessPlay = {
      playId: play.playId,
      teamId: play.posteam,
      playerId: "",
      down: play.down,
      ydstogo: play.ydstogo,
      yardsGained: play.yardsGained,
      touchdown: play.touchdown,
      turnover: play.turnover,
    };
    const isSucc = isSuccessfulPlay(successInput);
    if (isSucc !== null) {
      zoneAcc.successPlays++;
      if (isSucc) {
        zoneAcc.successesAllowed++;
      }
    } else {
      excludedUnratableSuccessPlays++;
      if (isRedZone) redZoneExcludedUnratableSuccessPlays++;
      else openFieldExcludedUnratableSuccessPlays++;
    }
  }

  const defenses: DefenseFieldZoneSplitRow[] = [];
  const belowFloorDefenses: BelowFloorDefenseDiagnostic[] = [];

  const sortedDefteams = Array.from(byDefense.keys()).sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0,
  );

  for (const defteam of sortedDefteams) {
    const { redZone, openField } = byDefense.get(defteam)!;
    const reasons: BelowFloorDefenseDiagnostic["reasons"][number][] = [];

    if (redZone.plays < MIN_RED_ZONE_PLAYS_FLOOR) {
      reasons.push("red_zone_plays_below_30");
    }
    if (openField.plays < MIN_OPEN_FIELD_PLAYS_FLOOR) {
      reasons.push("open_field_plays_below_100");
    }
    if (redZone.epaPlays < MIN_RED_ZONE_EPA_PLAYS_FLOOR) {
      reasons.push("red_zone_epa_plays_below_30");
    }
    if (openField.epaPlays === 0) {
      reasons.push("open_field_epa_plays_zero");
    }
    if (redZone.successPlays === 0) {
      reasons.push("red_zone_success_plays_zero");
    }
    if (openField.successPlays === 0) {
      reasons.push("open_field_success_plays_zero");
    }

    if (reasons.length > 0) {
      belowFloorDefenses.push({
        defteam,
        redZonePlays: redZone.plays,
        openFieldPlays: openField.plays,
        redZoneEpaPlays: redZone.epaPlays,
        reasons,
      });
      continue;
    }

    const rzMeanEpa = round(redZone.epaSum / redZone.epaPlays, 4);
    const ofMeanEpa = round(openField.epaSum / openField.epaPlays, 4);
    const rzSuccessRate = round(redZone.successesAllowed / redZone.successPlays, 4);
    const ofSuccessRate = round(openField.successesAllowed / openField.successPlays, 4);
    const rzTdRate = round(redZone.touchdownsAllowed / redZone.plays, 4);

    // Differentials: red-zone minus open-field (positive = defense gets worse inside the 20)
    const epaSplit = round(rzMeanEpa - ofMeanEpa, 4);
    const successSplit = round(rzSuccessRate - ofSuccessRate, 4);

    const totalScrimmagePlays = redZone.plays + openField.plays;

    defenses.push({
      defteam,
      window,
      targetWeek,
      redZone: {
        plays: redZone.plays,
        epaPlays: redZone.epaPlays,
        meanEpaAllowed: rzMeanEpa,
        successPlays: redZone.successPlays,
        successesAllowed: redZone.successesAllowed,
        successRateAllowed: rzSuccessRate,
        touchdownsAllowed: redZone.touchdownsAllowed,
        redZoneTdRateAllowed: rzTdRate,
      },
      openField: {
        plays: openField.plays,
        epaPlays: openField.epaPlays,
        meanEpaAllowed: ofMeanEpa,
        successPlays: openField.successPlays,
        successesAllowed: openField.successesAllowed,
        successRateAllowed: ofSuccessRate,
      },
      epaSplit,
      successSplit,
      redZoneTdRateAllowed: rzTdRate,
      provenance: buildProvenance(totalScrimmagePlays),
    });
  }

  let leagueContext: FieldZoneLeagueContext;
  if (defenses.length === 0) {
    leagueContext = {
      qualifyingDefenses: 0,
      redZoneMeanEpaAllowed: null,
      openFieldMeanEpaAllowed: null,
      redZoneMeanSuccessRateAllowed: null,
      openFieldMeanSuccessRateAllowed: null,
      meanRedZoneTdRateAllowed: null,
      meanEpaSplit: null,
      meanSuccessSplit: null,
    };
  } else {
    const n = defenses.length;
    const sumRzEpa = defenses.reduce((acc, d) => acc + d.redZone.meanEpaAllowed, 0);
    const sumOfEpa = defenses.reduce((acc, d) => acc + d.openField.meanEpaAllowed, 0);
    const sumRzSr = defenses.reduce((acc, d) => acc + d.redZone.successRateAllowed, 0);
    const sumOfSr = defenses.reduce((acc, d) => acc + d.openField.successRateAllowed, 0);
    const sumRzTd = defenses.reduce((acc, d) => acc + d.redZoneTdRateAllowed, 0);
    const sumEpaSplit = defenses.reduce((acc, d) => acc + d.epaSplit, 0);
    const sumSrSplit = defenses.reduce((acc, d) => acc + d.successSplit, 0);

    leagueContext = {
      qualifyingDefenses: n,
      redZoneMeanEpaAllowed: round(sumRzEpa / n, 4),
      openFieldMeanEpaAllowed: round(sumOfEpa / n, 4),
      redZoneMeanSuccessRateAllowed: round(sumRzSr / n, 4),
      openFieldMeanSuccessRateAllowed: round(sumOfSr / n, 4),
      meanRedZoneTdRateAllowed: round(sumRzTd / n, 4),
      meanEpaSplit: round(sumEpaSplit / n, 4),
      meanSuccessSplit: round(sumSrSplit / n, 4),
    };
  }

  return {
    window,
    targetWeek,
    includedWeeks: includedWeeksList,
    defenses,
    leagueContext,
    diagnostics: {
      excludedNonScrimmagePlays,
      excludedKneelOrSpikePlays,
      excludedEmptyTeamPlays,
      excludedNonFiniteYardlinePlays,
      excludedNullEpaPlays,
      redZoneExcludedNullEpaPlays,
      openFieldExcludedNullEpaPlays,
      excludedUnratableSuccessPlays,
      redZoneExcludedUnratableSuccessPlays,
      openFieldExcludedUnratableSuccessPlays,
      belowFloorDefensesCount: belowFloorDefenses.length,
      belowFloorDefenses,
    },
  };
}

/**
 * Entry point for Q52 Defensive Field-Zone Split.
 * Accepts either `(plays, targetWeek, targetSeason?)` or `(plays, { targetWeek, targetSeason? })`.
 */
export function computeDefensiveFieldZoneSplit(
  plays: readonly DefensiveFieldZonePlay[],
  targetWeekOrOptions: number | ComputeDefensiveFieldZoneOptions,
  maybeTargetSeason?: number,
): DefensiveFieldZoneSplitOutput {
  const targetWeek =
    typeof targetWeekOrOptions === "number"
      ? targetWeekOrOptions
      : targetWeekOrOptions.targetWeek;
  const targetSeason =
    typeof targetWeekOrOptions === "number"
      ? (maybeTargetSeason ?? null)
      : (targetWeekOrOptions.targetSeason ?? null);

  // Point-in-time filter: strictly week < targetWeek (and matching targetSeason when specified).
  const pitPlays = plays.filter((p) => {
    if (!Number.isFinite(p.week) || p.week >= targetWeek) return false;
    if (targetSeason !== null && p.season !== undefined && p.season !== targetSeason) {
      return false;
    }
    return true;
  });

  const seasonToDate = computeWindowResult(pitPlays, targetWeek, "season-to-date");
  const last4Weeks = computeWindowResult(pitPlays, targetWeek, "last-4");
  const last8Weeks = computeWindowResult(pitPlays, targetWeek, "last-8");

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
