/**
 * Inductive Venn-Abers Predictor (IVAP)
 *
 * Distribution-free multiprobability calibration for binary outcomes.
 * Given a calibration set of (score, label) pairs, produces for any new score
 * a valid multiprobability interval (p0, p1) that is guaranteed under
 * exchangeability. Uses the Pool Adjacent Violators (PAV) algorithm for
 * isotonic regression.
 *
 * Reference: Vovk, Petej, Fedorova — "Large-scale probabilistic predictors
 * with guarantees" / Inductive Venn-Abers predictors.
 *
 * Status: ready for integration into the honesty / selective-gate path.
 * Coding agent: verify, add tests, wire; do not rewrite the core algorithm.
 */

import { pavIsotonic } from "./pav.js";

export interface IvapCalibrationPoint {
  readonly score: number;
  readonly label: 0 | 1;
}

export interface IvapPrediction {
  /** Lower multiprobability (force label = 0 at the test point) */
  readonly p0: number;
  /** Upper multiprobability (force label = 1 at the test point) */
  readonly p1: number;
  /** Point prediction (midpoint, for convenience only — not a validity claim) */
  readonly pMid: number;
  /** Width of the multiprobability interval */
  readonly width: number;
}

function clamp01(x: number): number {
  if (Number.isNaN(x) || !Number.isFinite(x)) return 0.5;
  return Math.min(1, Math.max(0, x));
}

/**
 * Fit an Inductive Venn-Abers Predictor on a calibration set.
 * Scores should be real-valued (higher = more evidence for label 1).
 */
export class InductiveVennAbers {
  private readonly sorted: IvapCalibrationPoint[];

  constructor(calibration: readonly IvapCalibrationPoint[]) {
    // Fail closed on non-finite calibration scores (defect D1, fixed
    // 2026-10-15): a NaN score was previously accepted silently — it poisoned
    // the sort order and shifted every interval the fit produced. Reject it
    // with the offending index instead of converting it into confidence.
    for (let i = 0; i < calibration.length; i++) {
      const score = calibration[i]!.score;
      if (!Number.isFinite(score)) {
        throw new Error(
          `InductiveVennAbers: calibration score at index ${i} must be finite, got ${String(score)}`,
        );
      }
    }
    // Stable sort by score ascending
    this.sorted = [...calibration].sort((a, b) => a.score - b.score || a.label - b.label);
  }

  /**
   * Predict multiprobability interval for a new score.
   * p0 = isotonic fit when the test point is forced to label 0
   * p1 = isotonic fit when the test point is forced to label 1
   */
  predict(testScore: number): IvapPrediction {
    // Fail closed on a non-finite test score (defect D1, fixed 2026-10-15):
    // NaN previously failed every `s > testScore` comparison, so the test
    // point was inserted at the top of the range and predict(NaN) returned a
    // confident interval (e.g. [2/3, 1] on a four-point set). Reject instead.
    if (!Number.isFinite(testScore)) {
      throw new Error(
        `InductiveVennAbers.predict: test score must be finite, got ${String(testScore)}`,
      );
    }
    if (this.sorted.length === 0) {
      return { p0: 0.5, p1: 0.5, pMid: 0.5, width: 0 };
    }

    // Insert the test point into the ordered sequence (we will force its label twice)
    const scores = this.sorted.map((p) => p.score);
    let insertAt = scores.findIndex((s) => s > testScore);
    if (insertAt < 0) insertAt = scores.length;

    const p0 = this.fitWithForcedLabel(insertAt, testScore, 0);
    const p1 = this.fitWithForcedLabel(insertAt, testScore, 1);

    // Validity: under exchangeability p0 <= true probability <= p1 (in expectation)
    // We still clamp and order for numerical safety.
    const lo = clamp01(Math.min(p0, p1));
    const hi = clamp01(Math.max(p0, p1));
    return {
      p0: lo,
      p1: hi,
      pMid: (lo + hi) / 2,
      width: hi - lo,
    };
  }

  private fitWithForcedLabel(insertAt: number, testScore: number, forcedLabel: 0 | 1): number {
    const labels: number[] = [];
    const scores: number[] = [];
    for (let i = 0; i < this.sorted.length; i++) {
      if (i === insertAt) {
        scores.push(testScore);
        labels.push(forcedLabel);
      }
      scores.push(this.sorted[i]!.score);
      labels.push(this.sorted[i]!.label);
    }
    if (insertAt === this.sorted.length) {
      scores.push(testScore);
      labels.push(forcedLabel);
    }

    // Already nearly sorted; re-sort to be safe when ties exist
    const order = scores
      .map((s, i) => ({ s, i }))
      .sort((a, b) => a.s - b.s || a.i - b.i)
      .map((o) => o.i);
    const sortedLabels = order.map((i) => labels[i]!);
    const fitted = pavIsotonic(sortedLabels);

    // Locate the test point in the sorted order
    const testPos = order.indexOf(insertAt <= this.sorted.length ? insertAt : this.sorted.length);
    // When insertAt was pushed at the end before the final push, the index is the last one
    const idx = testPos >= 0 ? testPos : fitted.length - 1;
    return fitted[idx] ?? 0.5;
  }
}

/** Convenience factory */
export function fitIvap(calibration: readonly IvapCalibrationPoint[]): InductiveVennAbers {
  return new InductiveVennAbers(calibration);
}

/** Convenience one-shot predict */
export function ivapPredict(
  calibration: readonly IvapCalibrationPoint[],
  testScore: number,
): IvapPrediction {
  return new InductiveVennAbers(calibration).predict(testScore);
}
