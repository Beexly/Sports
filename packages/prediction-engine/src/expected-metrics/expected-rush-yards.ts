/**
 * Expected Rush Yards → our own RYOE (rush yards over expected per attempt).
 *
 * NGS publishes `rush_yards_over_expected_per_att` from a tracking model that
 * knows defenders-in-the-box and player speed. We do NOT re-serve it. We fit OUR
 * OWN expected-rush-yards model on public play-by-play — field position, down,
 * distance, shotgun, score differential, and run direction (location + gap) — and
 * define
 *
 *     GSE-RYOE(rusher) = mean(rushingYards − ŷ(rushingYards))
 *
 * over the rusher's qualifying carries, fit-on-load against the real season.
 *
 * Honest limitation: without tracking we cannot see the box count or the runner's
 * closing speed, which are exactly what NGS's model keys on. So our per-carry
 * expectation is coarser and our RYOE will correlate only moderately with NGS
 * RYOE (documented in validation.ts). That gap is the honest boundary of a
 * public-data reconstruction — we report the correlation we actually earn.
 */

import { fitRidge, predictRidge, type LinearModel } from "./linear.js";
import { rollupByPlayer, type PlayerPlayOutcome } from "./rollup.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance, type PlayerExpectedMetric } from "./types.js";

/** One designed rush attempt, mapped from an nflverse play-by-play row. */
export interface RushPlay {
  /** Rusher gsis id (`rusher_player_id`). */
  readonly rusherId: string;
  /** Outcome: yards gained on the carry (`rushing_yards`). */
  readonly rushingYards: number;
  /** Field position, yards to opponent goal (`yardline_100`), 1–99. */
  readonly yardline100: number;
  /** Down (`down`), 1–4. */
  readonly down: number;
  /** Yards to go (`ydstogo`). */
  readonly ydstogo: number;
  /** Shotgun snap (`shotgun`), 0/1. */
  readonly shotgun: 0 | 1;
  /** Offense score minus defense score at snap (`score_differential`). */
  readonly scoreDifferential: number;
  /** Run location (`run_location`): left/middle/right, or null. */
  readonly runLocation: "left" | "middle" | "right" | null;
  /** Run gap (`run_gap`): end/tackle/guard, or null. */
  readonly runGap: "end" | "tackle" | "guard" | null;
}

/** Canonical, ordered feature contract for the expected-rush-yards model. */
export const EXPECTED_RUSH_FEATURE_KEYS = [
  "yardline100",
  "down",
  "ydstogo",
  "shotgun",
  "scoreDifferential",
  "runMiddle",
  "runLeft",
  "gapGuard",
  "gapTackle",
] as const;

export const EXPECTED_RUSH_MODEL_VERSION = "gse-xrush-v1";

/** Minimum carries required to fit. */
export const MIN_RUSHES_TO_FIT = 200;

/** Default per-rusher carry qualifier (matches NGS rushing grain). */
export const DEFAULT_MIN_RUSHER_ATTEMPTS = 50;

export interface ExpectedRushModel {
  readonly linear: LinearModel;
  readonly provenance: ExpectedMetricProvenance;
}

function featureRow(play: RushPlay): number[] {
  return [
    play.yardline100,
    play.down,
    play.ydstogo,
    play.shotgun,
    play.scoreDifferential,
    play.runLocation === "middle" ? 1 : 0,
    play.runLocation === "left" ? 1 : 0,
    play.runGap === "guard" ? 1 : 0,
    play.runGap === "tackle" ? 1 : 0,
  ];
}

function isUsable(play: RushPlay): boolean {
  return (
    play.rusherId.length > 0 &&
    Number.isFinite(play.rushingYards) &&
    Number.isFinite(play.yardline100) &&
    Number.isFinite(play.down) &&
    Number.isFinite(play.ydstogo) &&
    Number.isFinite(play.scoreDifferential)
  );
}

/**
 * Fit the expected-rush-yards model on a season of carries. Returns null when
 * fewer than `MIN_RUSHES_TO_FIT` usable carries are present.
 */
export function fitExpectedRushModel(
  plays: readonly RushPlay[],
  options: { readonly minSample?: number; readonly lambda?: number } = {},
): ExpectedRushModel | null {
  const minSample = options.minSample ?? MIN_RUSHES_TO_FIT;
  const usable = plays.filter(isUsable);
  if (usable.length < minSample) return null;

  const rows = usable.map(featureRow);
  const targets = usable.map((p) => p.rushingYards);
  const linear = fitRidge(rows, targets, options.lambda ?? 1);
  if (linear === null) return null;

  return {
    linear,
    provenance: {
      modelVersion: EXPECTED_RUSH_MODEL_VERSION,
      method: "ridge-linear",
      featureKeys: [...EXPECTED_RUSH_FEATURE_KEYS],
      featureSchemaHash: computeFeatureSchemaHash(EXPECTED_RUSH_FEATURE_KEYS),
      sampleSize: linear.sampleSize,
    },
  };
}

/** Predict expected yards for one carry under a fitted model. */
export function predictExpectedRushYards(model: ExpectedRushModel, play: RushPlay): number {
  return predictRidge(model.linear, featureRow(play));
}

/**
 * Compute GSE-RYOE per rusher. `overExpected` is RYOE per attempt (yards);
 * `overExpectedTotal` is total rush yards over expectation. Only rushers with at
 * least `minAttempts` qualifying carries are returned.
 */
export function computeRyoe(
  plays: readonly RushPlay[],
  model: ExpectedRushModel,
  options: { readonly minAttempts?: number } = {},
): PlayerExpectedMetric[] {
  const minAttempts = options.minAttempts ?? DEFAULT_MIN_RUSHER_ATTEMPTS;
  const outcomes: PlayerPlayOutcome[] = [];
  for (const play of plays) {
    if (!isUsable(play)) continue;
    outcomes.push({
      playerId: play.rusherId,
      actual: play.rushingYards,
      expected: predictExpectedRushYards(model, play),
    });
  }
  return rollupByPlayer(outcomes, { minPlays: minAttempts, reportScale: 1, decimals: 3 });
}
