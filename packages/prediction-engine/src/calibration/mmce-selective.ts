
/** RBF kernel. */
function rbf(a: number, b: number, sigma: number): number {
  const d = (a - b) / sigma;
  return Math.exp(-0.5 * d * d);
}

/**
 * Maximum Mean Calibration Error (MMCE): || (1/n) sum_i (p_i - y_i) k(p_i, .) ||_H.
 * A differentiable calibration regularizer for the classification head.
 */
export function mmce(probs: readonly number[], outcomes: readonly number[], sigma = 0.2): number {
  if (probs.length !== outcomes.length) throw new Error("mmce-selective: probs/outcomes must align");
  const n = probs.length;
  if (n === 0) return 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const ri = (probs[i] ?? 0) - (outcomes[i] ?? 0);
    for (let j = 0; j < n; j++) {
      const rj = (probs[j] ?? 0) - (outcomes[j] ?? 0);
      total += ri * rj * rbf(probs[i] ?? 0, probs[j] ?? 0, sigma);
    }
  }
  return Math.sqrt(Math.max(total, 0)) / n;
}

/** Expected calibration error with equal-width bins. */
export function ece(probs: readonly number[], outcomes: readonly number[], bins = 10): number {
  if (probs.length !== outcomes.length || probs.length === 0) return 0;
  let total = 0;
  for (let b = 0; b < bins; b++) {
    const lo = b / bins;
    const hi = (b + 1) / bins;
    const idx = probs.map((p, i) => i).filter((i) => {
      const p = probs[i] ?? 0;
      return p >= lo && (b === bins - 1 ? p <= hi : p < hi);
    });
    if (idx.length === 0) continue;
    const meanP = idx.reduce((s, i) => s + (probs[i] ?? 0), 0) / idx.length;
    const meanY = idx.reduce((s, i) => s + (outcomes[i] ?? 0), 0) / idx.length;
    total += (idx.length / probs.length) * Math.abs(meanP - meanY);
  }
  return total;
}

export interface SelectorOptions {
  /** Keep predictions with confidence >= this. */
  readonly confidenceFloor?: number;
  /** Keep predictions with kNN outlier score <= this. */
  readonly outlierCeiling?: number;
}

/**
 * Selective-calibration selector: keep = (r-bar >= floor) AND (outlier <= ceiling).
 * Returns the kept indices.
 */
export function selectiveKeep(
  confidences: readonly number[],
  outlierScores: readonly number[],
  opts: SelectorOptions = {},
): number[] {
  if (confidences.length !== outlierScores.length) throw new Error("mmce-selective: inputs must align");
  const floor = opts.confidenceFloor ?? 0.6;
  const ceiling = opts.outlierCeiling ?? Infinity;
  return confidences.map((c, i) => i).filter((i) => (confidences[i] ?? 0) >= floor && (outlierScores[i] ?? 0) <= ceiling);
}

/** ECE on the selected set (the selective-calibration objective). */
export function selectiveEce(
  probs: readonly number[],
  outcomes: readonly number[],
  keep: readonly number[],
  bins = 10,
): number {
  return ece(keep.map((i) => probs[i] ?? 0), keep.map((i) => outcomes[i] ?? 0), bins);
}
