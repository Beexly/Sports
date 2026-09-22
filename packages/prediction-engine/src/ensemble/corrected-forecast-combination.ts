
/** Bias of a forecaster on history: mean(forecast - actual). */
export function estimateBias(forecasts: readonly number[], actuals: readonly number[]): number {
  if (forecasts.length !== actuals.length || forecasts.length === 0) {
    throw new Error("corrected-forecast-combination: aligned non-empty history required");
  }
  return forecasts.reduce((s, f, i) => s + (f - (actuals[i] ?? 0)), 0) / forecasts.length;
}

/** Debiased average: mean_i (f_i - bias_i). */
export function debiasedCombine(forecasts: readonly number[], biases: readonly number[]): number {
  if (forecasts.length !== biases.length || forecasts.length === 0) {
    throw new Error("corrected-forecast-combination: aligned non-empty inputs required");
  }
  return forecasts.reduce((s, f, i) => s + (f - (biases[i] ?? 0)), 0) / forecasts.length;
}

/** Inverse-MSE weights for the debiased forecasts. */
export function inverseMseWeights(mses: readonly number[]): number[] {
  if (mses.length === 0) throw new Error("corrected-forecast-combination: need >= 1 mse");
  const inv = mses.map((m) => 1 / Math.max(m, 1e-12));
  const sum = inv.reduce((s, v) => s + v, 0);
  return inv.map((v) => v / sum);
}

/** Inverse-MSE-weighted debiased combination. */
export function debiasedWeightedCombine(
  forecasts: readonly number[],
  biases: readonly number[],
  mses: readonly number[],
): number {
  if (forecasts.length !== biases.length || forecasts.length !== mses.length || forecasts.length === 0) {
    throw new Error("corrected-forecast-combination: aligned non-empty inputs required");
  }
  const w = inverseMseWeights(mses);
  return forecasts.reduce((s, f, i) => s + (w[i] ?? 0) * (f - (biases[i] ?? 0)), 0);
}
