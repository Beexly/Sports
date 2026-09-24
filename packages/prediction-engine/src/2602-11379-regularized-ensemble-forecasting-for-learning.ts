/**
 * arXiv:2602.11379 — Regularized Ensemble Forecasting for Learning Weights from Historical and Current Forecasts
 *
 * Regularized ensemble forecasting (REF): CCR-prior weights blended from six Identity-L2/Log-Entropy specs
 * with lambda tuned by rolling validation, plus a Bayesian posterior predictive interval on every published
 * forecast.
 *
 * Improvement: GSE replaces simple-mean ensemble weights with regularized ensemble forecasting: CCR-prior weights blended from six Identity-L2/Log-Entropy specs with lambda tuned by rolling validation, plus a Bayesian posterior predictive interval on every published forecast.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT if on the 2024 holdout REF improves margin RMSE >=2% and ATS Brier >=1% vs Simple Mean AND the medium-PS balanced-regime weeks drive the gain; REJECT if REF is within 0.5% of Simple Mean or lambda collapses to a degenerate value.
 */

/** One candidate weight spec's output. */
export interface WeightSpec {
  name: string; // e.g. "identity-l2-0.1", "log-entropy-0.5"
  weights: number[];
}

/**
 * CCR (constrained-combination regression) prior blend: weight the specs by
 * exp(-lambda * rollingLoss), normalized — lambda from rolling validation.
 */
export function blendSpecs(
  specs: readonly WeightSpec[],
  rollingLoss: readonly number[],
  lambda: number,
): number[] {
  if (specs.length !== rollingLoss.length || specs.length === 0) {
    throw new Error("blendSpecs: length mismatch");
  }
  if (lambda < 0) throw new Error("blendSpecs: lambda >= 0");
  const w = rollingLoss.map((l) => Math.exp(-lambda * l));
  const z = w.reduce((a, b) => a + b, 0);
  const p = specs[0]?.weights.length ?? 0;
  const out = new Array<number>(p).fill(0);
  specs.forEach((s, i) => {
    s.weights.forEach((sw, j) => {
      out[j] = (out[j] ?? 0) + ((w[i] ?? 0) / z) * sw;
    });
  });
  return out;
}

/** Log-entropy spec weights: w_i proportional to -p_i log p_i uncertainty. */
export function logEntropyWeights(probs: readonly number[]): number[] {
  if (probs.length === 0) throw new Error("logEntropyWeights: no probs");
  const ent = probs.map((p) => {
    const pc = Math.min(1 - 1e-9, Math.max(1e-9, p));
    return -(pc * Math.log(pc) + (1 - pc) * Math.log(1 - pc));
  });
  const z = ent.reduce((a, b) => a + b, 0);
  return z > 0 ? ent.map((e) => e / z) : ent.map(() => 1 / ent.length);
}

/** Posterior predictive interval: mean +/- z * sqrt(var + tau2). */
export function posteriorPredictiveInterval(
  mean: number,
  variance: number,
  tau2: number,
  z = 1.645,
): [number, number] {
  if (variance < 0 || tau2 < 0) throw new Error("posteriorPredictiveInterval: var >= 0");
  const sd = Math.sqrt(variance + tau2);
  return [mean - z * sd, mean + z * sd];
}
