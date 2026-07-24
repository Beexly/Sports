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

/**
 * Pool Adjacent Violators — isotonic regression under non-decreasing constraint.
 * Returns the fitted values in the same order as the input (already sorted by score).
 */
function pavIsotonic(ys: readonly number[]): number[] {
  const n = ys.length;
  if (n === 0) return [];
  // Work with weighted blocks: [value, weight, start, end]
  const blocks: { value: number; weight: number; start: number; end: number }[] = ys.map(
    (y, i) => ({ value: y, weight: 1, start: i, end: i }),
  );

  let i = 0;
  while (i < blocks.length - 1) {
    if (blocks[i]!.value <= blocks[i + 1]!.value) {
      i += 1;
      continue;
    }
    // Merge violators
    const left = blocks[i]!;
    const right = blocks[i + 1]!;
    const totalWeight = left.weight + right.weight;
    const mergedValue = (left.value * left.weight + right.value * right.weight) / totalWeight;
    blocks.splice(i, 2, {
      value: mergedValue,
      weight: totalWeight,
      start: left.start,
      end: right.end,
    });
    // Backtrack if the merge created a new violation with the previous block
    if (i > 0) i -= 1;
  }

  const fitted = new Array<number>(n);
  for (const block of blocks) {
    for (let j = block.start; j <= block.end; j++) {
      fitted[j] = block.value;
    }
  }
  return fitted;
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
    // Stable sort by score ascending
    this.sorted = [...calibration].sort((a, b) => a.score - b.score || a.label - b.label);
  }

  /**
   * Predict multiprobability interval for a new score.
   * p0 = isotonic fit when the test point is forced to label 0
   * p1 = isotonic fit when the test point is forced to label 1
   */
  predict(testScore: number): IvapPrediction {
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
