/**
 * arXiv 1909.12938v1: Time Series Modeling for Dream Team in Fantasy Premier League
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Per-player weekly time-series forecast stage (gradient-boosted TS with opponent/situational features plus a probabilistic availability model) feeding the ILP/MILP DFS lineup optimizer, replacing trailing-average forecasts; validated with a rolling-origin backtest requiring >= 5% realized-points gain on 2022-2024 slates.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Add a per-player weekly time-series forecast stage (gradient-boosted TS with opponent/situational features plus a probabilistic availability model) feeding the ILP/MILP DFS lineup optimizer, replacing trailing-average forecasts; validate with a rolling-origin backtest.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT the TS-forecast stage only if lineups built on TS forecasts beat lineups built on trailing-average forecasts by >=5% realized points on 2022-2024 rolling slates.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: mixed | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Simple exponential smoothing one-step forecast. */
export function sesForecast(xs: number[], alpha: number): number {
  let level = xs[0]!;
  for (let i = 1; i < xs.length; i++) level = alpha * xs[i]! + (1 - alpha) * level;
  return level;
}

/** Trailing-average forecast baseline. */
export function trailingMean(xs: number[], k: number): number {
  const w = xs.slice(Math.max(0, xs.length - k));
  return w.reduce((a, b) => a + b, 0) / w.length;
}

/** Rolling-origin backtest: compare two forecasters on one-step-ahead MAE. */
export function rollingOriginMae(
  xs: number[],
  forecaster: (hist: number[]) => number,
  minTrain: number,
): number {
  let s = 0;
  let c = 0;
  for (let t = minTrain; t < xs.length; t++) {
    s += Math.abs(xs[t]! - forecaster(xs.slice(0, t)));
    c++;
  }
  return c === 0 ? 0 : s / c;
}

/** Probabilistic availability: logistic on workload features. */
export function availabilityProb(features: number[], beta: number[]): number {
  const z = beta[0]! + features.reduce((s, f, j) => s + f * beta[j + 1]!, 0);
  return 1 / (1 + Math.exp(-z));
}

/** Lineup-score gain of TS forecasts over trailing-average forecasts. */
export function lineupForecastGain(tsScores: number[], trailScores: number[]): number {
  const m = (a: number[]): number => a.reduce((x, y) => x + y, 0) / a.length;
  return (m(tsScores) - m(trailScores)) / Math.max(1e-9, m(trailScores));
}
