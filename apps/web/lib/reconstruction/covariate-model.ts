/**
 * The play-context adjustment layer, with a real fitter.
 *
 * Empirical-Bayes gives a receiver's de-noised separation *tendency*. But a
 * 3-yard slant and a 40-yard post do not produce the same separation. This
 * layer models the per-play departure from the tendency as a linear function
 * of legal, observable play covariates (air yards, location, down context).
 *
 * The coefficients are NOT invented. They start at zero (inert — the honest
 * default that adds no fabricated effect) and are FITTED by ridge-regularized
 * least squares against a truth set of real (covariates -> observed feature)
 * rows. The truth set is legal ground truth: the NGS Highlights coordinate
 * sample for calibration today, a licensed tracking feed later. Same code.
 */

export interface CovariateModel {
  readonly coefficients: readonly number[]; // one per feature; all 0 = inert
  readonly ridge: number; // regularization used at fit time
  readonly residualSd: number; // spread of what the model still cannot explain
  readonly fittedRows: number; // 0 = never fitted, coefficients are inert
  /**
   * Fit quality as R² against the calibration truth set (0..1, clamped). The
   * honest "fidelity" a trust gate reads: a model fitted on a thin or
   * unrepresentative truth set has low R² and must NOT be trusted to emit a
   * per-play number. Computed from the data, never asserted.
   */
  readonly fidelity: number;
}

/** An inert model: zero effect, honest wide residual, "not calibrated". */
export function inertModel(featureCount: number): CovariateModel {
  return {
    coefficients: new Array(featureCount).fill(0),
    ridge: 0,
    residualSd: Number.POSITIVE_INFINITY, // unknown until fitted
    fittedRows: 0,
    fidelity: 0,
  };
}

/** Apply the model: the additive play-context adjustment for one play. */
export function applyCovariateModel(
  features: readonly number[],
  model: CovariateModel,
): number {
  const n = Math.min(features.length, model.coefficients.length);
  let acc = 0;
  for (let i = 0; i < n; i++) acc += features[i]! * model.coefficients[i]!;
  return acc;
}

/**
 * Fit coefficients by ridge-regularized least squares on residual targets.
 *
 * @param rows  each: play covariate vector (same length/order everywhere)
 * @param targets  observed (feature - shrunkTendency) for that play, from a
 *   legal truth set (real coordinates). This is where reconstruction stops
 *   being a prior and starts being measured-against-reality.
 * @param ridge  L2 strength; small positive keeps the normal equations stable
 *   and guards against overfitting a thin calibration sample.
 */
export function fitCovariateModel(
  rows: readonly (readonly number[])[],
  targets: readonly number[],
  ridge = 1e-3,
): CovariateModel {
  const m = rows.length;
  if (m === 0 || targets.length !== m) return inertModel(rows[0]?.length ?? 0);
  const p = rows[0]!.length;

  // Normal equations: (XᵀX + ridge·I) β = Xᵀy  — solved by Gaussian elimination.
  const xtx: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  const xty: number[] = new Array(p).fill(0);
  for (let r = 0; r < m; r++) {
    const row = rows[r]!;
    const y = targets[r]!;
    for (let i = 0; i < p; i++) {
      xty[i]! += row[i]! * y;
      for (let j = 0; j < p; j++) xtx[i]![j]! += row[i]! * row[j]!;
    }
  }
  for (let i = 0; i < p; i++) xtx[i]![i]! += ridge;

  const beta = solveLinearSystem(xtx, xty);
  if (!beta) return inertModel(p);

  // Residual spread the model still cannot explain — the honest interval width.
  // Also accumulate total spread (SST) around the target mean to score fidelity.
  const targetMean = targets.reduce((s, t) => s + t, 0) / m;
  let sse = 0;
  let sst = 0;
  for (let r = 0; r < m; r++) {
    let pred = 0;
    const row = rows[r]!;
    for (let i = 0; i < p; i++) pred += row[i]! * beta[i]!;
    sse += (targets[r]! - pred) ** 2;
    sst += (targets[r]! - targetMean) ** 2;
  }
  const dof = Math.max(1, m - p);
  // Fidelity = R² clamped to 0..1. If the targets have no spread (sst≈0) the
  // fit explains nothing meaningful, so fidelity is 0, not a misleading 1.
  const fidelity = sst > 1e-12 ? Math.max(0, Math.min(1, 1 - sse / sst)) : 0;
  return {
    coefficients: beta,
    ridge,
    residualSd: Math.sqrt(sse / dof),
    fittedRows: m,
    fidelity,
  };
}

/** Solve A x = b for small dense A via partial-pivot Gaussian elimination. */
function solveLinearSystem(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = a.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r]![col]!) > Math.abs(M[pivot]![col]!)) pivot = r;
    }
    if (Math.abs(M[pivot]![col]!) < 1e-12) return null; // singular
    [M[col], M[pivot]] = [M[pivot]!, M[col]!];
    const pivRow = M[col]!;
    const pv = pivRow[col]!;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r]![col]! / pv;
      for (let c = col; c <= n; c++) M[r]![c]! -= factor * pivRow[c]!;
    }
  }
  return M.map((row, i) => row[n]! / row[i]!);
}
