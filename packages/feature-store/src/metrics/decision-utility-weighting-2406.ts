/**
 * Decision-utility (BPDS) weighting for the GSE ensemble
 *
 * Research port: arXiv:2406.03321
 * Normalized lane: calibration | Doctrine: PROPRIETARY_EDGE
 *
 * Decision-utility weighting for the GSE ensemble: each sub-model j produces p_j(y|x) over game outcomes y given a candidate action x (stake profile across spread/total/moneyline); BPDS weights tilt toward models whose predictive densities score well under the decision utility. Pure weighting math; never changes a published probability.
 *
 * ACCEPTANCE GATE: Adopt decision-utility weighting only if walk-forward 2024-2025 shows the BPDS-weighted ensemble beating predictive-fit-weighted (BMA-style) combination by >=1.0% ROI. Live-data gate -> GSE_BPDS_WEIGHTING_ENABLED flag (default false).
 */

export interface ModelDensity {
  model: string;
  /** p_j(y | x) over the outcome grid */
  probs: number[];
}

export interface StakeProfile {
  spread: number;
  total: number;
  moneyline: number;
}

/** Expected utility of a model's density under a stake profile (toy utility: E[log wealth]). */
export function expectedUtility(d: ModelDensity, stakes: StakeProfile, edge: number[]): number {
  const total = stakes.spread + stakes.total + stakes.moneyline;
  if (total <= 0 || d.probs.length === 0) return 0;
  const w = d.probs.reduce((a, p) => a + p, 0) || 1;
  let u = 0;
  for (let i = 0; i < d.probs.length && i < edge.length; i++) {
    const p = (d.probs[i] ?? 0) / w;
    u += p * Math.log1p(Math.max(-0.99, (total / 100) * (edge[i] ?? 0)));
  }
  return u;
}

/**
 * BPDS weights: w_j proportional to exp(tau * U_j), tilted toward decision utility.
 * tau = 0 recovers uniform weights.
 */
export function bpdsWeights(utilities: number[], tau = 1): number[] {
  if (utilities.length === 0) return [];
  const m = Math.max(...utilities);
  const exps = utilities.map((u) => Math.exp(tau * (u - m)));
  const s = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / s);
}

/** BMA-style predictive-fit weights (baseline the gate compares against). */
export function bmaWeights(logScores: number[]): number[] {
  return bpdsWeights(logScores, 1);
}

/** Live-data gate: >=1.0% ROI over BMA on 2024-2025 walk-forward. */
export const GSE_BPDS_WEIGHTING_ENABLED = false;

