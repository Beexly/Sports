/**
 * Decision-tilted model combination via relaxed entropic tilting.
 *
 * For the weekly betting portfolio, start from BMA-style component weights
 * w0 and tilt toward realized decision scores s_i (Kelly log-growth or ROI
 * on a selection window):
 *   w_i propto w0_i * exp(eta * s_i)
 * The risk-aware extension tilts on the penalized score
 *   s_i = growth_i - lambda * maxDrawdown_i
 * instead of raw growth. Hard veto: reject any tilted portfolio whose
 * worst-month drawdown exceeds the baseline's by more than 25%.
 *
 * Pure TypeScript, no I/O.
 *
 * Reference: arXiv:2405.01598v1 — Predictive Decision Synthesis for
 * Portfolios (decision-tilted model combination).
 *
 * ACCEPTANCE GATE: 2025-holdout Kelly log-growth beats the accuracy-weighted
 * baseline by >= 10% (bootstrap p < 0.05); hard veto on tail risk.
 */

export interface ComponentScore {
  /** Realized Kelly log-growth (or ROI) on the selection window. */
  readonly growth: number;
  /** Worst-month max drawdown (positive number) on the selection window. */
  readonly maxDrawdown: number;
}

/** Risk-aware decision score: growth - lambda * maxDrawdown. */
export function riskAwareScore(c: ComponentScore, lambda: number): number {
  if (!(lambda >= 0)) throw new Error("decision-tilt: lambda must be >= 0");
  if (!(c.maxDrawdown >= 0)) throw new Error("decision-tilt: maxDrawdown must be >= 0");
  return c.growth - lambda * c.maxDrawdown;
}

/**
 * Relaxed entropic tilting: w_i propto w0_i * exp(eta * score_i).
 * @param baseWeights prior (BMA-style) weights, sum to 1.
 * @param scores decision scores aligned with weights.
 * @param eta tilt strength (>= 0; 0 recovers the base weights).
 */
export function entropicTilt(
  baseWeights: readonly number[],
  scores: readonly number[],
  eta: number,
): number[] {
  if (baseWeights.length !== scores.length || baseWeights.length === 0) {
    throw new Error("decision-tilt: aligned non-empty weights/scores required");
  }
  if (!(eta >= 0)) throw new Error("decision-tilt: eta must be >= 0");
  const tilted = baseWeights.map((w, i) => {
    if (!(w >= 0)) throw new Error("decision-tilt: base weights must be >= 0");
    return w * Math.exp(eta * (scores[i] ?? 0));
  });
  const total = tilted.reduce((s, v) => s + v, 0);
  if (!(total > 0)) throw new Error("decision-tilt: tilted weights sum to zero");
  return tilted.map((v) => v / total);
}

/**
 * Hard tail-risk veto: true when the tilted portfolio's worst-month
 * drawdown exceeds the baseline's by more than 25% (reject regardless of
 * full-season growth).
 */
export function tailRiskVeto(tiltedWorstMonthDd: number, baselineWorstMonthDd: number): boolean {
  if (!(tiltedWorstMonthDd >= 0 && baselineWorstMonthDd >= 0)) {
    throw new Error("decision-tilt: drawdowns must be >= 0");
  }
  return tiltedWorstMonthDd > 1.25 * baselineWorstMonthDd;
}
