
export interface AciState {
  readonly alpha: number;
}

/** ACI update: alpha_{t+1} = alpha_t + gamma * (targetErr - err_t). */
export function aciUpdate(state: AciState, covered: boolean, targetAlpha: number, gamma = 0.05): AciState {
  if (!(gamma > 0)) throw new Error("temporal-conformal: gamma must be positive");
  if (!(targetAlpha > 0 && targetAlpha < 1)) throw new Error("temporal-conformal: targetAlpha in (0,1) required");
  const err = covered ? 0 : 1;
  const next = state.alpha + gamma * (targetAlpha - err);
  return { alpha: Math.min(Math.max(next, 0.001), 0.5) };
}

/** Empirical quantile of trailing nonconformity scores at the adapted level. */
export function adaptiveQuantile(scores: readonly number[], alpha: number): number {
  if (scores.length === 0) throw new Error("temporal-conformal: need >= 1 score");
  if (!(alpha > 0 && alpha < 1)) throw new Error("temporal-conformal: alpha in (0,1) required");
  const sorted = [...scores].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((1 - alpha) * sorted.length) - 1));
  return sorted[idx] ?? 0;
}

/** Full ACI step: interval from the trailing window at the adapted alpha. */
export function aciInterval(
  state: AciState,
  pointForecast: number,
  trailingScores: readonly number[],
  covered: boolean,
  targetAlpha = 0.1,
  gamma = 0.05,
): { lower: number; upper: number; state: AciState } {
  const next = aciUpdate(state, covered, targetAlpha, gamma);
  const q = adaptiveQuantile(trailingScores, next.alpha);
  return { lower: pointForecast - q, upper: pointForecast + q, state: next };
}
