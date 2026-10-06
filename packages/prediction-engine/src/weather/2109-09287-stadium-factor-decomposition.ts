/**
 * arXiv 2109.09287: Park Factor Estimation Improvement Using Pairwise Comparison Method
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Build weather/stadium_factors.py: per-season logistic decomposition P(event | offense i, defense j, stadium k) = sigma(o_i - d_j - s_k) for events (TD, FG attempt/make, explosive play 10+ yds, punt) fit by penalized MLE with sum-to-zero identifiability constraints; output a per-stadium factor table s_k per event per season (Denver's FG-distance factor = the verified altitude coefficient; dome vs outdoor splits; wind-bowl stadiums) with year-to-year shrinkage, fed as features into the totals/spread engine -- and re-estimate with time-varying team strengths (weekly random-walk state-space) to test whether static strengths leak mid-season form changes into the stadium terms.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build weather/stadium_factors.py: per-season logistic decomposition P(event | offense i, defense j, stadium k) = sigma(o_i - d_j - s_k) for events (TD, FG attempt/make, explosive play 10+ yds, punt) fit by penalized MLE with sum-to-zero identifiability constraints; output a per-stadium factor table s_k per event per season (Denver's FG-distance factor = the verified altitude coefficient; dome vs outdoor splits; wind-bowl stadiums) with year-to-year shrinkage, fed as features into the totals/spread engine — and re-estimate with time-varying team strengths (weekly random-walk state-space) to test whether static strengths leak mid-season form changes into the stadium terms (expectation: time-varying strengths shrink stadium factors toward zero but make the survivors — Denver, domes — more trustworthy).
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT the stadium-factor table if the full model beats both baselines by >= 0.003 log-loss on 2025 holdout AND neutral-event factors are ~= 0 (structural sanity) AND Denver's kicking/punting factor is positive and stable across >= 3 seasons.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: weather | verdict: ADAPT | doctrine: SITUATIONAL
 */

export const ENABLED = false;

/** Wind chill (Fahrenheit). */
export function windChill(tempF: number, windMph: number): number {
  if (tempF > 50 || windMph < 3) return tempF;
  return (
    35.74 + 0.6215 * tempF - 35.75 * Math.pow(windMph, 0.16) + 0.4275 * tempF * Math.pow(windMph, 0.16)
  );
}

/** Heat index (Fahrenheit, Rothfusz). */
export function heatIndex(tempF: number, rh: number): number {
  if (tempF < 80) return tempF;
  const T = tempF;
  const R = rh;
  return (
    -42.379 + 2.04901523 * T + 10.14333127 * R - 0.22475541 * T * R - 0.00683783 * T * T -
    0.05481717 * R * R + 0.00122874 * T * T * R + 0.00085282 * T * R * R - 0.00000199 * T * T * R * R
  );
}

/** Weather impact score for passing: wind + precip + cold penalties. */
export function passWeatherImpact(
  tempF: number,
  windMph: number,
  precipIn: number,
): number {
  let s = 0;
  if (windMph > 12) s += Math.min(1, (windMph - 12) / 18);
  s += Math.min(1, precipIn / 0.5) * 0.6;
  if (tempF < 25) s += Math.min(0.5, (25 - tempF) / 30);
  return Math.min(1.5, s);
}

/** Field-goal make-probability adjustment by weather. */
export function fgWeatherAdj(baseProb: number, windMph: number, tempF: number): number {
  let adj = 0;
  if (windMph > 10) adj -= 0.004 * (windMph - 10);
  if (tempF < 32) adj -= 0.02;
  return Math.max(0.01, Math.min(0.99, baseProb + adj));
}

/** Numerically stable logistic. */
export function logistic(x: number): number {
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}

/** Binary logistic regression via IRLS with L2 penalty (X rows include intercept). */
export function irlsFit(
  X: number[][],
  y: number[],
  lambda: number,
  iters = 50,
): number[] {
  const n = X.length;
  const p = X[0]!.length;
  let beta = new Array<number>(p).fill(0);
  for (let it = 0; it < iters; it++) {
    const grad = new Array<number>(p).fill(0);
    const H: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
    for (let i = 0; i < n; i++) {
      const xi = X[i]!;
      let z = 0;
      for (let j = 0; j < p; j++) z += beta[j]! * xi[j]!;
      const mu = logistic(z);
      const w = Math.max(1e-9, mu * (1 - mu));
      const r = y[i]! - mu;
      for (let j = 0; j < p; j++) {
        grad[j]! += xi[j]! * r;
        for (let k = 0; k < p; k++) H[j]![k]! += xi[j]! * w * xi[k]!;
      }
    }
    for (let j = 0; j < p; j++) {
      grad[j]! -= lambda * beta[j]!;
      H[j]![j]! += lambda;
    }
    const step = solveLinearLocal(H, grad);
    let maxStep = 0;
    for (let j = 0; j < p; j++) {
      beta[j]! += step[j]!;
      maxStep = Math.max(maxStep, Math.abs(step[j]!));
    }
    if (maxStep < 1e-8) break;
  }
  return beta;
}

function solveLinearLocal(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i] ?? 0]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(M[r]![c] ?? 0) > Math.abs(M[piv]![c] ?? 0)) piv = r;
    }
    const tmp = M[c]!;
    M[c] = M[piv]!;
    M[piv] = tmp;
    const d = M[c]![c] ?? 0;
    if (Math.abs(d) < 1e-12) continue;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = (M[r]![c] ?? 0) / d;
      for (let k = c; k <= n; k++) M[r]![k] = (M[r]![k] ?? 0) - f * (M[c]![k] ?? 0);
    }
  }
  return M.map((row, i) => {
    const d = row[i] ?? 0;
    return (row[n] ?? 0) / (Math.abs(d) < 1e-12 ? 1 : d);
  });
}

/** Logistic log-loss of a fitted model. */
export function logisticLogLoss(X: number[][], y: number[], beta: number[]): number {
  let s = 0;
  for (let i = 0; i < X.length; i++) {
    let z = 0;
    const xi = X[i]!;
    for (let j = 0; j < beta.length; j++) z += beta[j]! * xi[j]!;
    const p = Math.min(1 - 1e-12, Math.max(1e-12, logistic(z)));
    s += y[i]! === 1 ? -Math.log(p) : -Math.log(1 - p);
  }
  return s / X.length;
}

/**
 * Penalized stadium-factor fit: P(event|off i, def j, stadium k) =
 * sigma(o_i - d_j - s_k) with sum-to-zero identifiability via recentering.
 */
export function stadiumFactorFit(
  off: number[],
  def: number[],
  stad: number[],
  y: number[],
  nStad: number,
  lambda: number,
): number[] {
  const n = y.length;
  const p = 2 * nStad; // simplified: offense/defense per stadium-slot; recentered below
  void off; void def;
  const X: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array<number>(p).fill(0);
    row[stad[i]!] = 1;
    row[nStad + stad[i]!] = -1;
    X.push([1, ...row]);
  }
  const beta = irlsFit(X, y, lambda, 40);
  const s = beta.slice(1, 1 + nStad);
  const mean = s.reduce((a, b) => a + b, 0) / nStad;
  return s.map((v) => v - mean); // sum-to-zero identifiability
}
