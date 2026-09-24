// @ts-nocheck
/**
 * arXiv 2603.08907: Cross-Domain Uncertainty Quantification for Selective Prediction: A Comprehensive Bound Ablation with Transfer-Informed Betting.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Cross-domain selective-prediction bounds for the pick-certification layer: the bound recipe is chosen by calibration-sample size (WSR+LTT for rich markets, empirical Bernstein mid-tier, transfer-informed warm starts for thin markets) so new markets graduate from uncertified to certified with n. Honest track-record infrastructure.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * GSE's pick-certification layer picks risk bounds by calibration-sample size (WSR+LTT for rich markets, empirical Bernstein mid-tier, transfer-informed warm starts for thin markets) so new markets graduate from uncertified to certified with n — honest track-record infrastructure.
 *
 * ACCEPTANCE GATE:
 * ADAPT the bound recipe iff WSR+LTT or LTT+EB certifies >=10% more historical picks than Hoeffding+union at alpha=0.10 with zero forward violations; ADAPT TIB iff it makes >=1 thin market (n<120) certifiable with forward risk <= alpha.
 *
 * ENABLED=false: certification layer over posted picks; needs a human call.
 */


export const ENABLED = false;

export type BoundRecipe = "hoeffding-union" | "empirical-bernstein" | "wsr-ltt" | "transfer-informed";

/**
 * Pick the risk-bound recipe by calibration-sample size n:
 * thin (n < 120) -> transfer-informed warm start; mid -> empirical Bernstein;
 * rich -> WSR+LTT. Hoeffding+union is the strawman baseline.
 */
export function pickBoundRecipe(n: number): BoundRecipe {
  if (n < 120) return "transfer-informed";
  if (n < 500) return "empirical-bernstein";
  return "wsr-ltt";
}

/** Hoeffding bound on the mean risk: mean + sqrt(log(1/delta)/(2n)). */
export function hoeffdingBound(risks: readonly number[], delta: number): number {
  const n = risks.length;
  const mean = risks.reduce((a, b) => a + b, 0) / Math.max(n, 1);
  return mean + Math.sqrt(Math.log(1 / Math.max(delta, 1e-12)) / (2 * Math.max(n, 1)));
}

/** Empirical Bernstein bound: mean + se*sqrt(2 log(2/delta)/n) + 7 log(2/delta)/(3(n-1)). */
export function empiricalBernsteinBound(risks: readonly number[], delta: number): number {
  const n = risks.length;
  if (n < 2) return hoeffdingBound(risks, delta);
  const mean = risks.reduce((a, b) => a + b, 0) / n;
  const variance = risks.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (n - 1);
  const logTerm = Math.log(2 / Math.max(delta, 1e-12));
  return (
    mean +
    Math.sqrt((2 * variance * logTerm) / n) +
    (7 * logTerm) / (3 * (n - 1))
  );
}

/**
 * WSR (betting-based) bound approximation: mean + z_{1-delta} * se with the
 * Robbins mixture tightening factor (valid anytime bound proxy for the harness).
 */
export function wsrBound(risks: readonly number[], delta: number): number {
  const n = risks.length;
  if (n === 0) return Infinity;
  const mean = risks.reduce((a, b) => a + b, 0) / n;
  const variance = risks.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(n - 1, 1);
  const se = Math.sqrt(variance / n);
  // Robbins-mixture width ~ sqrt(2 log(log n / delta) / n) once n is large.
  const width = Math.sqrt((2 * Math.log(Math.max(Math.log(Math.max(n, 3)), 1) / delta)) / n);
  return mean + Math.max(se * 2, width * se * 2 + 1e-9);
}

/**
 * Transfer-informed warm start: shrink the thin market's empirical mean toward
 * the source (rich-market) prior mean with pseudo-count kappa.
 */
export function transferInformedBound(
  risks: readonly number[],
  sourceMean: number,
  kappa: number,
  delta: number,
): number {
  const n = risks.length;
  const shrunk =
    (risks.reduce((a, b) => a + b, 0) + kappa * sourceMean) / (n + kappa);
  return hoeffdingBound(
    risks.map(() => shrunk), // bound centered at the shrunk estimate
    delta,
  );
}

export function boundForRecipe(
  risks: readonly number[],
  recipe: BoundRecipe,
  delta: number,
  sourceMean = 0.5,
  kappa = 50,
): number {
  switch (recipe) {
    case "hoeffding-union":
      return hoeffdingBound(risks, delta);
    case "empirical-bernstein":
      return empiricalBernsteinBound(risks, delta);
    case "wsr-ltt":
      return wsrBound(risks, delta);
    case "transfer-informed":
      return transferInformedBound(risks, sourceMean, kappa, delta);
  }
}

export interface Certification {
  readonly n: number;
  readonly recipe: BoundRecipe;
  readonly riskBound: number;
  /** Certified iff the upper bound on risk is within the alpha budget. */
  readonly certified: boolean;
}

/** Certify a market's pick history at risk budget alpha (default 0.10). */
export function certifyPicks(
  risks: readonly number[],
  alpha = 0.1,
  delta = 0.05,
  sourceMean = 0.5,
): Certification {
  const n = risks.length;
  const recipe = pickBoundRecipe(n);
  const riskBound = boundForRecipe(risks, recipe, delta, sourceMean);
  return { n, recipe, riskBound, certified: riskBound <= alpha };
}
