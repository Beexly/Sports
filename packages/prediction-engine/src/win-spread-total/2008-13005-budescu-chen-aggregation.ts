/**
 * arXiv 2008.13005: Wisdom of the Crowds Forecasting the 2018 FIFA Men's World Cup
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Budescu-Chen aggregation arm: C_j = mean leave-one-out gain over trailing 2 seasons; sources with C_j > 0 aggregated weighted by C_j; compared against Variance-EM and simple average; assertiveness audit ((3/2)Sum(p-1/3)^2-style) of the engine's published probabilities vs their Brier scores with global shrinkage-toward-0.5 recalibration if systematically over-assertive; evaluation-honesty rule (no 'model A beats model B' claim on < ~500 games without a truth-knower simulation).
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Add the Budescu-Chen aggregation arm: C_j = mean leave-one-out gain over trailing 2 seasons; aggregate sources with C_j > 0 weighted by C_j; compare against Variance-EM and simple average on 2024-2025; run an assertiveness audit ((3/2)Sum(p-1/3)^2-style assertiveness) for the engine's published probabilities vs their Brier scores, applying global shrinkage-toward-0.5 recalibration if systematically over-assertive; adopt the evaluation-honesty rule (no 'model A beats model B' claim on < ~500 games without a truth-knower simulation).
 *
 * ACCEPTANCE GATE (verbatim):
 * Adopt Budescu-Chen if it beats simple averaging on 2024-2025 Brier by >=0.002 OR wins the truth-knower simulation more often than Variance-EM; adopt the evaluation-honesty rule regardless; reject the assertiveness recalibration if the engine's assertiveness already sits at its Brier-optimal point.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: win_spread_total | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Mean leave-one-out gain of each source over a trailing window. */
export function looGains(P: number[][], y: number[]): number[] {
  const K = P[0]!.length;
  const gains = new Array<number>(K).fill(0);
  const brier = (ps: number[]): number => {
    let s = 0;
    for (let i = 0; i < ps.length; i++) s += (ps[i]! - y[i]!) ** 2;
    return s / ps.length;
  };
  const full = brier(P.map((row) => row.reduce((a, b) => a + b, 0) / K));
  for (let k = 0; k < K; k++) {
    const loo = brier(P.map((row) => {
      let s = 0;
      for (let j = 0; j < K; j++) if (j !== k) s += row[j]!;
      return s / (K - 1);
    }));
    gains[k] = loo - full; // Brier is a loss: positive = source helps
  }
  return gains;
}

/** Budescu-Chen weights: C_j > 0 weighted by C_j, else 0. */
export function budescuChenWeights(gains: number[]): number[] {
  const pos = gains.map((g) => Math.max(0, g));
  const s = pos.reduce((a, b) => a + b, 0);
  if (s <= 0) return gains.map(() => 1 / gains.length);
  return pos.map((g) => g / s);
}

/** Assertiveness audit: (3/2) * sum (p - 1/3)^2 style dispersion measure. */
export function assertiveness(ps: number[], base = 0.5): number {
  return (ps.reduce((s, p) => s + (p - base) ** 2, 0) / ps.length) * 2;
}

/** Global shrinkage-toward-base recalibration for over-assertive forecasts. */
export function shrinkTowardBase(ps: number[], base: number, lambda: number): number[] {
  return ps.map((p) => lambda * base + (1 - lambda) * p);
}
