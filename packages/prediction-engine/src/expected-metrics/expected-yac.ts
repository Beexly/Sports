/**
 * Expected YAC → our own YAC-over-expected (yards after catch above expectation).
 *
 * NGS publishes `avg_yac_above_expectation` per receiver from a tracking model.
 * We do NOT re-serve it. We fit OUR OWN expected-YAC model on public play-by-play
 * — pass depth (air yards), throw location, field position, and down/distance —
 * and define
 *
 *     GSE-xYAC(receiver) = mean(yardsAfterCatch − ŷ(yardsAfterCatch))
 *
 * over the receiver's qualifying receptions, fit-on-load against the real season.
 *
 * Honest limitation: air yards is a strong public proxy for expected YAC (short,
 * in-stride catches carry more YAC potential than deep contested ones), but NGS
 * also sees defender proximity at the catch point. We report the correlation we
 * earn against NGS (validation.ts), not an assumed identity.
 */

import { fitRidge, predictRidge, type LinearModel } from "./linear.js";
import { rollupByPlayer, type PlayerPlayOutcome } from "./rollup.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance, type PlayerExpectedMetric } from "./types.js";

/** One completed reception, mapped from an nflverse play-by-play row. */
export interface CatchPlay {
  /** Receiver gsis id (`receiver_player_id`). */
  readonly receiverId: string;
  /** Outcome: yards after catch (`yards_after_catch`). */
  readonly yardsAfterCatch: number;
  /** Intended air yards (`air_yards`); negative for catches behind the line. */
  readonly airYards: number;
  /** Field position, yards to opponent goal (`yardline_100`), 1–99. */
  readonly yardline100: number;
  /** Down (`down`), 1–4. */
  readonly down: number;
  /** Yards to go (`ydstogo`). */
  readonly ydstogo: number;
  /** Throw location (`pass_location`): left/middle/right, or null. */
  readonly passLocation: "left" | "middle" | "right" | null;
}

/** Canonical, ordered feature contract for the expected-YAC model. */
export const EXPECTED_YAC_FEATURE_KEYS = [
  "airYards",
  "yardline100",
  "down",
  "ydstogo",
  "isMiddle",
  "isLeft",
] as const;

export const EXPECTED_YAC_MODEL_VERSION = "gse-xyac-v1";

/** Minimum receptions required to fit. */
export const MIN_CATCHES_TO_FIT = 200;

/** Default per-receiver reception qualifier (aligned to NGS receiving grain). */
export const DEFAULT_MIN_RECEIVER_CATCHES = 30;

export interface ExpectedYacModel {
  readonly linear: LinearModel;
  readonly provenance: ExpectedMetricProvenance;
}

function featureRow(play: CatchPlay): number[] {
  return [
    play.airYards,
    play.yardline100,
    play.down,
    play.ydstogo,
    play.passLocation === "middle" ? 1 : 0,
    play.passLocation === "left" ? 1 : 0,
  ];
}

function isUsable(play: CatchPlay): boolean {
  return (
    play.receiverId.length > 0 &&
    Number.isFinite(play.yardsAfterCatch) &&
    Number.isFinite(play.airYards) &&
    Number.isFinite(play.yardline100) &&
    Number.isFinite(play.down) &&
    Number.isFinite(play.ydstogo)
  );
}

/**
 * Fit the expected-YAC model on a season of receptions. Returns null when fewer
 * than `MIN_CATCHES_TO_FIT` usable receptions are present.
 */
export function fitExpectedYacModel(
  plays: readonly CatchPlay[],
  options: { readonly minSample?: number; readonly lambda?: number } = {},
): ExpectedYacModel | null {
  const minSample = options.minSample ?? MIN_CATCHES_TO_FIT;
  const usable = plays.filter(isUsable);
  if (usable.length < minSample) return null;

  const rows = usable.map(featureRow);
  const targets = usable.map((p) => p.yardsAfterCatch);
  const linear = fitRidge(rows, targets, options.lambda ?? 1);
  if (linear === null) return null;

  return {
    linear,
    provenance: {
      modelVersion: EXPECTED_YAC_MODEL_VERSION,
      method: "ridge-linear",
      featureKeys: [...EXPECTED_YAC_FEATURE_KEYS],
      featureSchemaHash: computeFeatureSchemaHash(EXPECTED_YAC_FEATURE_KEYS),
      sampleSize: linear.sampleSize,
    },
  };
}

/** Predict expected YAC for one reception under a fitted model. */
export function predictExpectedYac(model: ExpectedYacModel, play: CatchPlay): number {
  return predictRidge(model.linear, featureRow(play));
}

/**
 * Compute GSE-xYAC per receiver. `overExpected` is YAC over expected per catch
 * (yards); `overExpectedTotal` is total YAC over expectation. Only receivers with
 * at least `minCatches` qualifying receptions are returned.
 */
export function computeYacOverExpected(
  plays: readonly CatchPlay[],
  model: ExpectedYacModel,
  options: { readonly minCatches?: number } = {},
): PlayerExpectedMetric[] {
  const minCatches = options.minCatches ?? DEFAULT_MIN_RECEIVER_CATCHES;
  const outcomes: PlayerPlayOutcome[] = [];
  for (const play of plays) {
    if (!isUsable(play)) continue;
    outcomes.push({
      playerId: play.receiverId,
      actual: play.yardsAfterCatch,
      expected: predictExpectedYac(model, play),
    });
  }
  return rollupByPlayer(outcomes, { minPlays: minCatches, reportScale: 1, decimals: 3 });
}
