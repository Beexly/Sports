/**
 * PFeatureSet — the typed contract every HB (hand-built) prop model in
 * packages/prediction-engine/src/edge-lab/ consumes as its *independent p*
 * prior inputs.
 *
 * WHY THIS FILE EXISTS
 * ───────────────────
 * The covariate bus (covariate-bus.ts) emits leak-safe NGS weekly-mean cells.
 * The props-hb-* modules each consume a specific SAMPLE of realized (exposure,
 * count) pairs — that is the *training* input to their empirical-Bayes priors,
 * distinct from the bus covariates. Before this file, the mapping between a
 * market slug and "which fields does module X need, and which file defines
 * them" lived only in scattered module headers. This is the single source of
 * truth, with every field anchored to the module that owns it.
 *
 * HONESTY (every module is priced:false, independent p — never q):
 *   - None of these are Odds inputs. No OddsLineSnapshot field is read.
 *   - `firePostedProp` (props-fire-gate.ts) is the q-side; it is NOT in this set.
 *   - Vendor "expected" NGS metrics (avgExpectedYac, expectedRushYards, ryoe,
 *     cpoe) are y-axis only and are deliberately absent here.
 *
 * The two binds (props-hb-adot-sep-bind.ts, props-hb-air-yac-bind.ts) couple
 * the bus covariates to the aDOT×SEP and air+YAC samples respectively — they
 * are listed here as BIND nodes so the map is complete, but the covariate
 * fields they inject (avgSeparation, avgYac) originate in covariate-bus.ts.
 *
 * Pure. No I/O. No Prisma. This is a type/registry module only.
 */

import type { StatType } from "./covariate-bus.js";

export const P_FEATURE_SET_METHOD_TAG = "p_feature_set_v1" as const;

/** Slug root every prop market prefix maps onto. See `prop-line-rows.ts`
 *  encodePropMarket: market = "<oddsApiKey>|<playerSlug>". */
export type PropSlugRoot =
  | "player_receptions"
  | "player_receiving_yards"
  | "player_reception_tds"
  | "player_rush_yards"
  | "player_rush_attempts"
  | "player_rush_tds"
  | "player_pass_yds"
  | "player_pass_tds"
  | "player_completions"
  | "player_interceptions"
  | "player_sacks"
  | "player_air_yards"
  | "player_longest_reception"
  | "player_first_td"
  | "player_anytime_td";

/** Where the input features come from. Two sources only, both honest:
 *  - NGS: nflverse NextGenStat weekly-mean rows (via covariate-bus.ts)
 *  - PBP: nflverse box-score / play-by-play aggregates (game-level samples)
 *  - BIND: injected by a covariate-bus bind (sep/yac) — sourced ultimately NGS
 *  - SNAP: nflverse snap_counts + injuries (CC-BY) */
export type FeatureSource = "NGS" | "PBP" | "BIND" | "SNAP";

/** One independent-p input field for one HB module. */
export interface PFeature {
  /** Field name as declared in the owning module's Sample/Prior interface. */
  readonly field: string;
  /** Human description — what this count/exposure actually is. */
  readonly description: string;
  /** Anchor: the exact file + exported symbol that owns this field. */
  readonly sourceFile: string;
  /** Anchor: the exact function/interface symbol that consumes or defines it. */
  readonly sourceSymbol: string;
  readonly source: FeatureSource;
  /** Schema provenance (one of the schema.prisma models on disk). */
  readonly schemaModel: string;
}

/**
 * PFeatureSet: slug root → the HB module that scores it + the file-anchored
 * list of prior-input fields it needs, and the field's origin symbol.
 *
 * Every entry below was read directly from the module file cited. The
 * `field` strings match the property names in that module's exported
 * Sample/Prior types. If a module changes its sample shape, this set must
 * change with it (CI can diff the two).
 */
export interface PFeatureSetEntry {
  readonly slugRoot: PropSlugRoot;
  /** The scoring module (props-hb-*.ts) that owns this line. */
  readonly module: string;
  /** The method tag the module exports (e.g. ADOT_SEP_METHOD_TAG). */
  readonly methodTagSymbol: string;
  /** Whether the line has a q-side fire gate wired (firePostedProp). */
  readonly fireGated: boolean;
  /** Independent-p prior-input fields, each anchored to its source file. */
  readonly features: readonly PFeature[];
}

export const P_FEATURE_SET: readonly PFeatureSetEntry[] = [
  {
    slugRoot: "player_receptions",
    module: "props-hb-adot-sep.ts",
    methodTagSymbol: "ADOT_SEP_METHOD_TAG",
    fireGated: true,
    features: [
      { field: "targets", description: "Targets in the game (Beta-Binomial exposure).", sourceFile: "props-hb-catch.ts", sourceSymbol: "CatchSample.targets", source: "PBP", schemaModel: "PlayerGameStat" },
      { field: "receptions", description: "Receptions in the game.", sourceFile: "props-hb-catch.ts", sourceSymbol: "CatchSample.receptions", source: "PBP", schemaModel: "PlayerGameStat" },
      { field: "airYards", description: "Air yards on caught balls (aDOT split).", sourceFile: "props-hb-adot-catch.ts", sourceSymbol: "AdotCatchSample.airYards", source: "PBP", schemaModel: "PlayerGameStat" },
      { field: "avgSeparation", description: "NGS weekly-mean separation, injected by the SEP bind.", sourceFile: "props-hb-adot-sep-bind.ts", sourceSymbol: "SepBindRequest", source: "BIND", schemaModel: "NextGenStat.avgSeparation" },
    ],
  },
  {
    slugRoot: "player_receiving_yards",
    module: "props-hb-air-yac.ts",
    methodTagSymbol: "AIR_YAC_METHOD_TAG",
    fireGated: true,
    features: [
      { field: "receptions", description: "Receptions (exposure for air+yac processes).", sourceFile: "props-hb-air-yac.ts", sourceSymbol: "AirYacSample.receptions", source: "PBP", schemaModel: "PlayerGameStat" },
      { field: "airYards", description: "Air yards on caught balls.", sourceFile: "props-hb-air-yac.ts", sourceSymbol: "AirYacSample.airYards", source: "PBP", schemaModel: "PlayerGameStat" },
      { field: "yac", description: "Realized YAC on caught balls (y-axis component).", sourceFile: "props-hb-air-yac.ts", sourceSymbol: "AirYacSample.yac", source: "PBP", schemaModel: "PlayerGameStat" },
      { field: "avgYac", description: "NGS weekly-mean YAC per reception, injected by the YAC bind.", sourceFile: "props-hb-air-yac-bind.ts", sourceSymbol: "YacBindRequest", source: "BIND", schemaModel: "NextGenStat.avgYac" },
    ],
  },
  {
    slugRoot: "player_rush_yards",
    module: "props-hb-rush.ts",
    methodTagSymbol: "RUSH_HB_METHOD_TAG",
    fireGated: true,
    features: [
      { field: "attempts", description: "Rush attempts (NB exposure).", sourceFile: "props-hb-rush.ts", sourceSymbol: "RushSample.attempts", source: "PBP", schemaModel: "PlayerGameStat" },
      { field: "yards", description: "Rush yards.", sourceFile: "props-hb-rush.ts", sourceSymbol: "RushSample.yards", source: "PBP", schemaModel: "PlayerGameStat" },
    ],
  },
  {
    slugRoot: "player_rush_attempts",
    module: "props-hb-rush-attempts.ts",
    methodTagSymbol: "RUSH_ATTEMPTS_HB_METHOD_TAG",
    fireGated: true,
    features: [
      { field: "games", description: "Games played in the window (rate denominator).", sourceFile: "props-hb-rush-attempts.ts", sourceSymbol: "RushAttemptsSample.games", source: "PBP", schemaModel: "PlayerGameStat" },
      { field: "attempts", description: "Rush attempts across those games (volume rate).", sourceFile: "props-hb-rush-attempts.ts", sourceSymbol: "RushAttemptsSample.attempts", source: "PBP", schemaModel: "PlayerGameStat" },
    ],
  },
  {
    slugRoot: "player_rush_tds",
    module: "props-hb-rush-td.ts",
    methodTagSymbol: "RUSH_TD_HB_METHOD_TAG",
    fireGated: true,
    features: [
      { field: "rushAtt", description: "Rush attempts (TD-per-attempt exposure).", sourceFile: "props-hb-rush-td.ts", sourceSymbol: "RushTdSample.rushAtt", source: "PBP", schemaModel: "PlayerGameStat" },
      { field: "rushTds", description: "Rush touchdowns.", sourceFile: "props-hb-rush-td.ts", sourceSymbol: "RushTdSample.rushTds", source: "PBP", schemaModel: "PlayerGameStat" },
    ],
  },
  {
    slugRoot: "player_pass_yds",
    module: "props-hb-pass-yards.ts",
    methodTagSymbol: "PASS_YARDS_HB_METHOD_TAG",
    fireGated: true,
    features: [
      { field: "attempts", description: "Pass attempts (yards-per-attempt exposure).", sourceFile: "props-hb-pass-yards.ts", sourceSymbol: "PassYardsSample.attempts", source: "PBP", schemaModel: "PlayerGameStat" },
      { field: "yards", description: "Net passing yards.", sourceFile: "props-hb-pass-yards.ts", sourceSymbol: "PassYardsSample.yards", source: "PBP", schemaModel: "PlayerGameStat" },
    ],
  },
  {
    slugRoot: "player_pass_tds",
    module: "props-hb-pass-td.ts",
    methodTagSymbol: "PASS_TD_HB_METHOD_TAG",
    fireGated: true,
    features: [
      { field: "attempts", description: "Pass attempts (TD-per-attempt exposure).", sourceFile: "props-hb-pass-td.ts", sourceSymbol: "PassTdSample.attempts", source: "PBP", schemaModel: "PlayerGameStat" },
      { field: "passTds", description: "Passing touchdowns.", sourceFile: "props-hb-pass-td.ts", sourceSymbol: "PassTdSample.passTds", source: "PBP", schemaModel: "PlayerGameStat" },
    ],
  },
  {
    slugRoot: "player_completions",
    module: "props-hb-comp.ts",
    methodTagSymbol: "COMP_HB_METHOD_TAG",
    fireGated: true,
    features: [
      { field: "attempts", description: "Pass attempts (Beta-Binomial exposure).", sourceFile: "props-hb-comp.ts", sourceSymbol: "CompSample.attempts", source: "PBP", schemaModel: "PlayerGameStat" },
      { field: "completions", description: "Completions.", sourceFile: "props-hb-comp.ts", sourceSymbol: "CompSample.completions", source: "PBP", schemaModel: "PlayerGameStat" },
    ],
  },
  {
    slugRoot: "player_interceptions",
    module: "props-hb-int.ts",
    methodTagSymbol: "INT_HB_METHOD_TAG",
    fireGated: true,
    features: [
      { field: "attempts", description: "Pass attempts (INT-per-attempt exposure).", sourceFile: "props-hb-int.ts", sourceSymbol: "IntSample.attempts", source: "PBP", schemaModel: "PlayerGameStat" },
      { field: "ints", description: "Interceptions thrown.", sourceFile: "props-hb-int.ts", sourceSymbol: "IntSample.ints", source: "PBP", schemaModel: "PlayerGameStat" },
    ],
  },
  {
    slugRoot: "player_sacks",
    module: "props-hb-sacks.ts",
    methodTagSymbol: "SACK_HB_METHOD_TAG",
    fireGated: true,
    features: [
      { field: "dropbacks", description: "Dropbacks = attempts + sacks (Beta-Binomial exposure).", sourceFile: "props-hb-sacks.ts", sourceSymbol: "SackSample.dropbacks", source: "PBP", schemaModel: "PlayerGameStat" },
      { field: "sacks", description: "Sacks taken.", sourceFile: "props-hb-sacks.ts", sourceSymbol: "SackSample.sacks", source: "PBP", schemaModel: "PlayerGameStat" },
    ],
  },
  {
    slugRoot: "player_air_yards",
    module: "props-hb-air-yac.ts",
    methodTagSymbol: "AIR_YAC_METHOD_TAG",
    fireGated: true,
    features: [
      { field: "receptions", description: "Receptions (air process exposure).", sourceFile: "props-hb-air-yac.ts", sourceSymbol: "AirYacSample.receptions", source: "PBP", schemaModel: "PlayerGameStat" },
      { field: "airYards", description: "Air yards (air process count).", sourceFile: "props-hb-air-yac.ts", sourceSymbol: "AirYacSample.airYards", source: "PBP", schemaModel: "PlayerGameStat" },
    ],
  },
  {
    slugRoot: "player_longest_reception",
    module: "props-hb.ts",
    methodTagSymbol: "(Gamma-Poisson base, max via probOver)",
    fireGated: false,
    features: [
      { field: "games", description: "Games in window (rate denominator).", sourceFile: "props-hb.ts", sourceSymbol: "RateSample.games", source: "PBP", schemaModel: "PlayerGameStat" },
      { field: "total", description: "Cumulative stat total (yards) over those games.", sourceFile: "props-hb.ts", sourceSymbol: "RateSample.total", source: "PBP", schemaModel: "PlayerGameStat" },
    ],
  },
  {
    slugRoot: "player_reception_tds",
    module: "props-hb-rec-td.ts",
    methodTagSymbol: "REC_TD_HB_METHOD_TAG",
    fireGated: true,
    features: [
      { field: "targets", description: "Targets (rec-TD-per-target exposure).", sourceFile: "props-hb-rec-td.ts", sourceSymbol: "RecTdSample.targets", source: "PBP", schemaModel: "PlayerGameStat" },
      { field: "recTds", description: "Receiving touchdowns.", sourceFile: "props-hb-rec-td.ts", sourceSymbol: "RecTdSample.recTds", source: "PBP", schemaModel: "PlayerGameStat" },
    ],
  },
  {
    slugRoot: "player_first_td",
    module: "props-hb.ts",
    methodTagSymbol: "(Gamma-Poisson base)",
    fireGated: false,
    features: [
      { field: "games", description: "Games in window (rate denominator).", sourceFile: "props-hb.ts", sourceSymbol: "RateSample.games", source: "PBP", schemaModel: "PlayerGameStat" },
      { field: "total", description: "First-TD occurrences over those games.", sourceFile: "props-hb.ts", sourceSymbol: "RateSample.total", source: "PBP", schemaModel: "PlayerGameStat" },
    ],
  },
  {
    slugRoot: "player_anytime_td",
    module: "props-hb.ts",
    methodTagSymbol: "(Gamma-Poisson base)",
    fireGated: false,
    features: [
      { field: "games", description: "Games in window (rate denominator).", sourceFile: "props-hb.ts", sourceSymbol: "RateSample.games", source: "PBP", schemaModel: "PlayerGameStat" },
      { field: "total", description: "TD occurrences over those games.", sourceFile: "props-hb.ts", sourceSymbol: "RateSample.total", source: "PBP", schemaModel: "PlayerGameStat" },
    ],
  },
] as const;

/** Look up the feature set for a slug root. Returns null (fail-closed) if the
 *  slug is not a recognized prop market — callers must refuse unknown slugs. */
export function pFeatureSetFor(slugRoot: PropSlugRoot): PFeatureSetEntry | null {
  for (const e of P_FEATURE_SET) if (e.slugRoot === slugRoot) return e;
  return null;
}

/** All recognized slug roots (the canonical allow-list). */
export function knownSlugRoots(): readonly PropSlugRoot[] {
  return P_FEATURE_SET.map((e) => e.slugRoot);
}

export type { StatType };
