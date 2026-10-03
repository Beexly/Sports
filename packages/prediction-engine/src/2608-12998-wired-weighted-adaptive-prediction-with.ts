/**
 * arXiv:2608.12998 — WIRED: Weighted Adaptive Prediction with Structured Dependence for Probabilistic Multiseries Forecasting
 *
 * GSE-WIRED post-engine combination: CRPS-weighted mixtures of the engine, market-implied, Elo, and
 * bootstrap margin experts (Theil-Sen skill extrapolation with shrinkage toward uniform) plus a
 * Gaussian/Student-t copula over slate game margins for joint probabilities.
 *
 * Improvement: Add a GSE-WIRED post-engine combination layer that forms CRPS-weighted mixtures of the engine, market-implied, Elo, and bootstrap margin experts (Theil-Sen skill extrapolation with shrinkage toward uniform) plus a Gaussian/Student-t copula over slate game margins for joint probabilities.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT the CRPS-weighted mixture layer if, over the two-season test window, it beats equal-weight mixture by >=2% mean CRPS AND holds 80% interval coverage within [0.76, 0.84]; REJECT adaptive weighting (keep equal weights + copula) if it fails to beat equal weights or coverage falls below 0.74.
 */

/** One expert's distributional margin forecast. */
export interface MarginExpert {
  name: string;
  mean: number;
  sd: number;
}

/** CRPS for a Gaussian margin forecast (closed form, reused pattern). */
export function marginCrps(y: number, mean: number, sd: number): number {
  if (sd <= 0) throw new Error("marginCrps: sd > 0");
  const z = (y - mean) / sd;
  const phi = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const t = 1 / (1 + 0.3275911 * Math.abs(z));
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-z * z);
  const Phi = 0.5 * (1 + Math.sign(z) * erf);
  return sd * (z * (2 * Phi - 1) + 2 * phi - 1 / Math.sqrt(Math.PI));
}

/**
 * Theil-Sen skill extrapolation with shrinkage toward uniform: weight_i
 * proportional to shrink * (1/skill_i) + (1-shrink)/K.
 */
export function theilSenWeights(
  skills: readonly number[],
  shrink: number,
): number[] {
  if (skills.length === 0) throw new Error("theilSenWeights: no skills");
  if (shrink < 0 || shrink > 1) throw new Error("theilSenWeights: shrink in [0,1]");
  const inv = skills.map((s) => 1 / Math.max(1e-9, s));
  const z = inv.reduce((a, b) => a + b, 0);
  const K = skills.length;
  return inv.map((v) => shrink * (v / z) + (1 - shrink) / K);
}

/** Gaussian-copula joint probability that all margins clear their lines. */
export function copulaJointProb(
  zScores: readonly number[],
  corr: number,
): number {
  // Equicorrelated Gaussian copula via the one-factor representation,
  // integrated by Gauss-Hermite-ish quadrature (fixed 21-point grid).
  if (corr < -0.99 || corr > 0.99) throw new Error("copulaJointProb: |corr| < 0.99");
  const xs: number[] = [];
  for (let i = 0; i <= 20; i++) xs.push(-4 + (8 * i) / 20);
  const phi = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  const Phi = (x: number): number => {
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const erf = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-x * x);
    return 0.5 * (1 + Math.sign(x) * erf);
  };
  const rho = Math.sqrt(Math.max(0, corr));
  let num = 0;
  let den = 0;
  for (const f of xs) {
    const wgt = phi(f);
    let prod = 1;
    for (const z of zScores) {
      const cond = (z - rho * f) / Math.sqrt(Math.max(1e-9, 1 - corr));
      prod *= 1 - Phi(cond); // P(margin clears | factor)
    }
    num += wgt * prod;
    den += wgt;
  }
  return num / den;
}
