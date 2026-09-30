/**
 * Calibration audit harness — measure the engine's calibration claims against
 * the real settled prod population.
 *
 * IMPORT PARITY (2026-09-30): this harness imports the SHIPPED engine math
 * directly — `isotonicCalibration` / `expectedCalibrationError` from
 * packages/prediction-engine/src/probability-calibration.ts and `buildCalibrator`
 * from packages/prediction-engine/src/calibration-apply.ts — so every number in
 * the audit is produced by the same code production runs. An earlier revision
 * re-implemented ECE and PAVA locally; that was replaced because a re-implementation
 * is an approximation, and an audit that measures an approximation cannot falsify
 * a claim about the real thing. Only the statistical additions that the engine
 * does not ship (out-of-fold validation, Brier vs the constant-0.5 baseline,
 * band z-tests, discrimination) are written here, and each is labelled.
 *
 * Both shipped modules are dependency-free by construction (no @sports/* imports),
 * which is what lets the audit run them straight from a worktree with no
 * node_modules.
 */

import {
  isotonicCalibration,
  expectedCalibrationError,
  type CalibrationSample,
} from "@sports/prediction-engine/src/probability-calibration";
import { buildCalibrator } from "@sports/prediction-engine/src/calibration-apply";
import {
  convictionTier,
  CONVICTION_MIN_PROBABILITY,
} from "@sports/prediction-engine/src/conviction-tier";

export type { CalibrationSample };
export {
  isotonicCalibration,
  expectedCalibrationError,
  buildCalibrator,
  convictionTier,
  CONVICTION_MIN_PROBABILITY,
};

/** Shipped equal-width ECE, re-exported under an audit-local name. */
export const shippedEce = expectedCalibrationError;


/**
 * Audit addition (NOT shipped by the engine): 5-fold out-of-fold ECE — fit the
 * isotonic map on 4 folds, score the held-out fold. This is the honest
 * generalization estimate; the shipped activation gate compares IN-SAMPLE ECEs.
 */
export function fiveFoldOutOfFoldEce(
  samples: readonly CalibrationSample[],
  foldCount = 5,
): { readonly mean: number; readonly perFold: number[] } {
  const perFold: number[] = [];
  for (let fold = 0; fold < foldCount; fold += 1) {
    const test: CalibrationSample[] = [];
    const train: CalibrationSample[] = [];
    samples.forEach((s, i) => (i % foldCount === fold ? test : train).push(s));
    if (test.length === 0) continue;
    const { predict } = isotonicCalibration(train);
    perFold.push(expectedCalibrationError(test.map((s) => ({ p: predict(s.p), y: s.y }))));
  }
  const mean = perFold.reduce((a, b) => a + b, 0) / Math.max(perFold.length, 1);
  return { mean, perFold };
}

/**
 * Audit addition (NOT shipped): Brier of the raw forecast against the constant
 * 0.5 forecast it must beat to carry any probabilistic skill at all.
 */
export function brier(samples: readonly CalibrationSample[]): {
  readonly model: number;
  readonly constantHalf: number;
  readonly skillBrier: number;
  readonly confidenceBeatsConstantHalf: boolean;
} {
  if (samples.length === 0) {
    return {
      model: 0,
      constantHalf: 0,
      skillBrier: 0,
      confidenceBeatsConstantHalf: false,
    };
  }
  const model = samples.reduce((sum, s) => sum + (s.p - s.y) ** 2, 0) / samples.length;
  const constantHalf =
    samples.reduce((sum, s) => sum + (0.5 - s.y) ** 2, 0) / samples.length;
  return {
    model,
    constantHalf,
    skillBrier: constantHalf === 0 ? 0 : (constantHalf - model) / constantHalf,
    confidenceBeatsConstantHalf: model < constantHalf,
  };
}

/** Audit addition (NOT shipped): two-sided z for H0: observed rate == expected. */
export function zTest(wins: number, n: number, expectedRate: number): number {
  if (n === 0) return 0;
  const se = Math.sqrt((expectedRate * (1 - expectedRate)) / n);
  return se === 0 ? 0 : (wins / n - expectedRate) / se;
}

/**
 * Audit addition (NOT shipped): per-band absolute calibration + the Brier-vs-0.5
 * test per band, mirroring the shipped confidence ladder's band edges.
 */
export function bandTable(
  samples: readonly CalibrationSample[],
  bands: readonly (readonly [number, number, string])[],
): Array<{
  label: string;
  n: number;
  wins: number;
  expected: number;
  observed: number;
  delta: number;
  brierConf: number;
  brierHalf: number;
  confBeatsConstantHalf: boolean;
  z: number;
}> {
  return bands.map(([lo, hi, label]) => {
    const inBand = samples.filter((s) => s.p * 100 >= lo && s.p * 100 <= hi);
    const n = inBand.length;
    const wins = inBand.reduce((a, s) => a + s.y, 0);
    const expected = n ? inBand.reduce((a, s) => a + s.p, 0) / n : 0;
    const observed = n ? wins / n : 0;
    const b = brier(inBand);
    return {
      label,
      n,
      wins,
      expected,
      observed,
      delta: n ? observed - expected : 0,
      brierConf: b.model,
      brierHalf: b.constantHalf,
      confBeatsConstantHalf: b.confidenceBeatsConstantHalf,
      z: Number(zTest(wins, n, expected).toFixed(2)),
    };
  });
}

/**
 * Audit addition (NOT shipped): does realized win rate rise with confidence?
 * `monotonic` requires every populated band (n >= minN) to be non-decreasing
 * as confidence rises. A score that ranks correctly is not the same as a score
 * that is a probability — the repo's own compute.ts says so explicitly.
 */
export function discrimination(
  rows: ReadonlyArray<{ expected: number; observed: number; n: number }>,
  minN = 30,
): {
  trend: "improving" | "inverted" | "flat" | "insufficient-data";
  monotonic: boolean;
  populatedBands: number;
  lowBand: string | null;
  highBand: string | null;
  lowObserved: number | null;
  highObserved: number | null;
  spread: number | null;
} {
  const populated = rows.filter((r) => r.n >= minN).sort((a, b) => a.expected - b.expected);
  if (populated.length < 2) {
    return {
      trend: "insufficient-data",
      monotonic: false,
      populatedBands: populated.length,
      lowBand: null,
      highBand: null,
      lowObserved: null,
      highObserved: null,
      spread: null,
    };
  }
  const first = populated[0]!;
  const last = populated[populated.length - 1]!;
  const monotonic = populated.every((r, i) => i === 0 || r.observed >= populated[i - 1]!.observed - 1e-9);
  const spread = last.observed - first.observed;
  return {
    trend: spread > 0.01 ? "improving" : spread < -0.01 ? "inverted" : "flat",
    monotonic,
    populatedBands: populated.length,
    lowBand: null,
    highBand: null,
    lowObserved: first.observed,
    highObserved: last.observed,
    spread: Number(spread.toFixed(4)),
  };
}