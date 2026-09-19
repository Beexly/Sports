/**
 * Calibration application — turning the heuristic confidence score into a
 * calibrated win probability, the HONEST way.
 *
 * This is the engine that Step 1 of docs/path-to-70.md needs. It is intentionally
 * SELF-SUPPRESSING: it only applies a calibration map when the evidence supports
 * it, and otherwise passes the raw confidence through, clearly labeled uncalibrated.
 *
 * It does NOT flip any gate and does NOT change MODEL_VERSION. Wiring this into the
 * live scoring/display path is a deliberate, audited MODEL_VERSION step (the model
 * is frozen by scripts/guardrails/model-freeze.mjs + docs/calibration-proposals/FROZEN.md
 * to keep historical confidence numbers honest). Until there is a settled canonical
 * sample to fit against AND that audited step is taken, `buildCalibrator` returns an
 * inactive calibrator that is a no-op identity map.
 *
 * Activation requires BOTH:
 *   1. sampleSize >= minSample (default 100 — matches MIN_SETTLED_PICKS_FOR_LEARNING), AND
 *   2. the fitted map does not make calibration worse (calibratedEce <= rawEce).
 *
 * Pure functions, no I/O. Operates only on (forecastProbability, binaryOutcome)
 * samples drawn from settled, canonical, learning-eligible picks.
 */

import { clamp } from "./scoring.js";
import {
  isotonicCalibration,
  expectedCalibrationError,
  type CalibrationSample,
  type IsotonicModel,
} from "./probability-calibration.js";

/** Minimum settled sample before a calibration map may be applied. */
export const DEFAULT_MIN_CALIBRATION_SAMPLE = 100;

export interface CalibratedProbability {
  /** Win probability in [0,1]. */
  readonly probability: number;
  /** True only when a validated calibration map was actually applied. */
  readonly calibrated: boolean;
}

export interface Calibrator {
  /** True only when the map is backed by enough data AND improves (or holds) calibration. */
  readonly isActive: boolean;
  readonly sampleSize: number;
  readonly minSample: number;
  /** Expected Calibration Error of the raw forecasts (before mapping). */
  readonly rawEce: number;
  /** ECE after applying the fitted map to the same sample. */
  readonly calibratedEce: number;
  /** Human-readable reason the calibrator is inactive (empty when active). */
  readonly inactiveReason: string;
  /**
   * Convert a raw confidence score (0–100) into a win probability. When the
   * calibrator is inactive this is the identity map (confidence/100), flagged
   * `calibrated: false` so callers never mistake it for a calibrated number.
   */
  readonly apply: (confidence0to100: number) => CalibratedProbability;
}

/** Confidence (0–100) → base probability (0–1), with out-of-range values rejected to a safe midpoint of 0. */
function confidenceToBase(confidence: number): number {
  if (!Number.isFinite(confidence)) return 0;
  return clamp(confidence / 100, 0, 1);
}

/**
 * Build a calibrator from settled (forecastProbability, outcome) samples.
 *
 * The map is fit with isotonic regression (PAVA) but only marked active when it
 * clears the sample-size floor and does not worsen ECE. An inactive calibrator is
 * a safe identity passthrough.
 */
export function buildCalibrator(
  samples: readonly CalibrationSample[],
  opts: { readonly minSample?: number } = {},
): Calibrator {
  const minSample = opts.minSample ?? DEFAULT_MIN_CALIBRATION_SAMPLE;
  const sampleSize = samples.length;
  const model: IsotonicModel = isotonicCalibration(samples);

  const rawEce = expectedCalibrationError(samples);
  const calibratedSamples: CalibrationSample[] = samples.map((s) => ({
    p: model.predict(s.p),
    y: s.y,
  }));
  const calibratedEce = expectedCalibrationError(calibratedSamples);

  let inactiveReason = "";
  if (sampleSize < minSample) {
    inactiveReason = `settled sample ${sampleSize} is below the minimum ${minSample}`;
  } else if (calibratedEce > rawEce) {
    inactiveReason = `fitted map does not improve calibration (ECE ${calibratedEce} > ${rawEce})`;
  }
  const isActive = inactiveReason === "";

  const apply = (confidence0to100: number): CalibratedProbability => {
    const base = confidenceToBase(confidence0to100);
    if (!isActive) return { probability: base, calibrated: false };
    return { probability: clamp(model.predict(base), 0, 1), calibrated: true };
  };

  return { isActive, sampleSize, minSample, rawEce, calibratedEce, inactiveReason, apply };
}
