/**
 * arXiv:2502.07528v3 — Forecasting the Future Development in Quality and Value of Professional Football Players
 *
 * Conformal Seasonal Meta-learner (CSM) for win totals: per-team seasonal trajectory forecasts with
 * split-conformal bands, meta-learned weighting of trajectory experts, and holdout residual quantiles as
 * the coverage diagnostic.
 *
 * Improvement: Add a player-development forecaster to the projection pipeline with a hierarchical mixed-effects age curve: fit a position-specific Bayesian aging curve first and feed each player's residual-vs-curve as the feature, separating age-expected decline from true development signal — targeting the volatile under-24 slice where the paper's models were weakest.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT the development forecaster + its intervals into GSE's projection pipeline only if: (a) ≥10% RMSE improvement over carry-forward on 2023–2024 test for at least 3 of 4 positions, (b) empirical 80%-interval coverage within 75–85%, and (c) subgroup slices show no catastrophic failure (RMSE on 2nd-year breakouts no worse than 1.3× overall RMSE).
 */

/** Holdout residuals for one team. */
export interface TeamResiduals {
  team: string;
  residuals: number[];
}

/** (1-alpha) quantile of absolute residuals = half-width of the band. */
export function conformalHalfWidth(residuals: readonly number[], alpha: number): number {
  if (residuals.length === 0) throw new Error("conformalHalfWidth: no residuals");
  if (alpha <= 0 || alpha >= 1) throw new Error("conformalHalfWidth: alpha in (0,1)");
  const s = residuals.map(Math.abs).sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((1 - alpha) * s.length)) - 1] ?? 0;
}

/** Prediction band for a point forecast. */
export function predictionBand(point: number, halfWidth: number): [number, number] {
  return [point - halfWidth, point + halfWidth];
}

/**
 * Meta-learned expert weights: softmax over negative mean absolute residual
 * (experts with tighter holdout residuals get more weight).
 */
export function metaWeights(meanAbsResidual: readonly number[], temp = 1): number[] {
  if (meanAbsResidual.length === 0) throw new Error("metaWeights: no experts");
  if (temp <= 0) throw new Error("metaWeights: temp > 0");
  const m = Math.min(...meanAbsResidual);
  const exps = meanAbsResidual.map((r) => Math.exp(-(r - m) / temp));
  const z = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / z);
}

/** Empirical coverage of bands on holdout (the coverage diagnostic). */
export function empiricalCoverage(
  points: readonly number[],
  actuals: readonly number[],
  halfWidths: readonly number[],
): number {
  if (points.length !== actuals.length || points.length !== halfWidths.length) {
    throw new Error("empiricalCoverage: length mismatch");
  }
  let hit = 0;
  for (let i = 0; i < points.length; i++) {
    if (Math.abs((actuals[i] ?? 0) - (points[i] ?? 0)) <= (halfWidths[i] ?? 0)) hit++;
  }
  return points.length === 0 ? NaN : hit / points.length;
}
