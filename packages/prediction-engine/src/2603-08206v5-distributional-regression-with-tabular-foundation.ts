/**
 * arXiv:2603.08206v5 — Distributional Regression with Tabular Foundation Models: Evaluating Probabilistic Predictions via Proper Scoring Rules
 *
 * CRPS-family training losses for margin/total models: beta-energy and weighted CRPS instead of MSE, plus
 * CRPS and IS95 on the model scoreboard — training aligned with distributional use.
 *
 * Improvement: GSE trains margin/total models on CRPS-family losses (beta-energy / weighted CRPS) instead of MSE and adds CRPS/IS95 to the model scoreboard, aligning training with the actual distributional use of the forecasts.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT if the CRPS-trained margin model beats the MSE baseline on held-out 2024 NFL by >=5% relative CRPS improvement AND >=3% IS95 improvement, with at most 2% MAE degradation on the implied point prediction.
 */

/** CRPS for a Gaussian predictive distribution (closed form). */
export function crpsGaussian(y: number, mu: number, sigma: number): number {
  if (sigma <= 0) throw new Error("crpsGaussian: sigma > 0");
  const z = (y - mu) / sigma;
  // phi and Phi via erf approximation
  const phi = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const t = 1 / (1 + 0.3275911 * Math.abs(z));
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-z * z);
  const Phi = 0.5 * (1 + Math.sign(z) * erf);
  return sigma * (z * (2 * Phi - 1) + 2 * phi - 1 / Math.sqrt(Math.PI));
}

/** Interval score at level alpha (the IS95 core, alpha=0.05). */
export function intervalScore(
  y: number,
  lower: number,
  upper: number,
  alpha: number,
): number {
  if (alpha <= 0 || alpha >= 1) throw new Error("intervalScore: alpha in (0,1)");
  const width = upper - lower;
  const missLo = lower > y ? (2 / alpha) * (lower - y) : 0;
  const missHi = y > upper ? (2 / alpha) * (y - upper) : 0;
  return width + missLo + missHi;
}

/** Beta-energy score surrogate: energy score with beta-weighted distance. */
export function betaEnergyScore(
  y: number,
  samples: readonly number[],
  beta: number,
): number {
  if (samples.length === 0) throw new Error("betaEnergyScore: no samples");
  if (beta <= 0 || beta >= 2) throw new Error("betaEnergyScore: beta in (0,2)");
  const d1 = samples.reduce((s, v) => s + Math.abs(v - y) ** beta, 0) / samples.length;
  let d2 = 0;
  for (const a of samples) for (const b of samples) d2 += Math.abs(a - b) ** beta;
  d2 /= samples.length * samples.length;
  return d1 - 0.5 * d2;
}

/** Mean CRPS / interval-score over a scoreboard. */
export function meanScore(scores: readonly number[]): number {
  if (scores.length === 0) throw new Error("meanScore: no scores");
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}
