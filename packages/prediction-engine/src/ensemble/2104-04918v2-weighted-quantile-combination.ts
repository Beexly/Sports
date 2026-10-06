/**
 * arXiv 2104.04918v2: Modelling uncertainty in financial tail risk: a forecast combination and weighted quantile approach
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * For spread/total markets, combine GSE's model margin-quantile curves per quantile level with level-specific weights (FC-WQ, M=5 level grid, per-level quantile-loss weights on trailing 8 weeks), then convert the combined quantiles into a tail functional via a strictly consistent joint loss; improvement: cost-aware extension weighting recent games by CLV capture (beat-the-close indicator).
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * For spread/total markets, combine GSE's model margin-quantile curves per quantile level with level-specific weights (FC-WQ, M=5 level grid, per-level quantile-loss weights on trailing 8 weeks), then convert the combined quantiles into a tail functional via a strictly consistent joint loss -- covering the quantile-adjacent combination doctrine absent from Round-1 ensembles; improvement: replace fixed level weights with a cost-aware extension weighting recent games by CLV capture (beat-the-close indicator).
 *
 * ACCEPTANCE GATE (verbatim):
 * ADAPT accepted if walk-forward mean quantile loss >=2% below the simple-average baseline at >= 4 of 5 grid levels AND the joint tail-functional loss >=2% below FC-SA, with per-level VRate within [0.7alpha, 1.3alpha] (calibration guard); else REJECT. Hard fail: if any level's weights collapse to a single model for >80% of weeks (combination adds nothing), reject.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: ensembles | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Pinball (quantile) loss. */
export function pinballLoss(y: number, q: number, alpha: number): number {
  const e = y - q;
  return e >= 0 ? alpha * e : (alpha - 1) * e;
}

/** Mean pinball loss over a sample. */
export function meanPinball(ys: readonly number[], qs: readonly number[], alpha: number): number {
  if (ys.length !== qs.length || ys.length === 0) throw new Error("meanPinball: length mismatch");
  let s = 0;
  for (let i = 0; i < ys.length; i++) s += pinballLoss(ys[i]!, qs[i]!, alpha);
  return s / ys.length;
}

/** Empirical violation rate: fraction of y below the alpha-quantile forecast. */
export function violationRate(ys: readonly number[], qs: readonly number[]): number {
  let v = 0;
  for (let i = 0; i < ys.length; i++) if (ys[i]! < qs[i]!) v++;
  return v / ys.length;
}

/** Level-weighted quantile combination (FC-WQ style). */
export function quantileCombine(
  quantileForecasts: readonly (readonly number[])[],
  levelWeights: readonly number[],
): number[] {
  const m = quantileForecasts.length;
  if (m === 0) throw new Error("quantileCombine: empty");
  const L = quantileForecasts[0]!.length;
  const wsum = levelWeights.reduce((a, b) => a + b, 0);
  const out: number[] = [];
  for (let l = 0; l < L; l++) {
    let s = 0;
    for (let j = 0; j < m; j++) s += levelWeights[j]! * quantileForecasts[j]![l]!;
    out.push(s / wsum);
  }
  return out;
}

/** Linear quantile regression via subgradient descent (X rows include intercept). */
export function quantileRegSGD(
  X: readonly (readonly number[])[],
  y: readonly number[],
  alpha: number,
  lr: number,
  epochs: number,
  rand: () => number,
): number[] {
  const p = X[0]!.length;
  const beta = Array.from({ length: p }, () => (rand() - 0.5) * 0.01);
  const n = X.length;
  for (let e = 0; e < epochs; e++) {
    for (let i = 0; i < n; i++) {
      const xi = X[i]!;
      let pred = 0;
      for (let j = 0; j < p; j++) pred += beta[j]! * xi[j]!;
      const sub = y[i]! - pred >= 0 ? alpha : alpha - 1;
      for (let j = 0; j < p; j++) beta[j]! += lr * sub * xi[j]!;
    }
  }
  return beta;
}
