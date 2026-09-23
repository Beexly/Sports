/**
 * arXiv 2108.00821v2: The reaction to news in live betting
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Adapt the SSM news-reaction design to NFL in-play: fit the paper's ARX(1)+ZAGA state model on NFL in-play spreads/totals using 1-minute odds-change velocity (Odds API / oddsPapi / APIVault snapshots) as the observable, with news covariates = touchdowns/turnovers classified by surprise (pre-play win probability from nflfastR's wp, thresholds at <25%); test a contrarian rule fading the line move after surprising events (take the pre-event fair-price side) -- and decompose the observable into ticket count vs handle share where public split data exists, testing whether the overreaction is retail tickets (cognitive bias) or sharp handle (repositioning).
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Adapt the SSM news-reaction design to NFL in-play: fit the paper's ARX(1)+ZAGA state model on NFL in-play spreads/totals using 1-minute odds-change velocity (Odds API / oddsPapi / APIVault snapshots) as the observable, with news covariates = touchdowns/turnovers classified by surprise (pre-play win probability from nflfastR's wp, thresholds at <25%); test a contrarian rule fading the line move after surprising events (take the pre-event fair-price side) — and decompose the observable into ticket count vs handle share where public split data exists, testing whether the overreaction is retail tickets (cognitive bias) or sharp handle (repositioning).
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT the adapted design if BOTH hold on the 2024 holdout: (1) the surprising-news coefficient beta-hat_surprising > 0 with 95% CI excluding zero (behavioral replication); (2) a contrarian rule shows positive mean CLV per event at >= +0.5% average with two-sided p<0.05 on >=100 surprising events.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: experimental | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Solve a square linear system via Gauss-Jordan with partial pivoting. */
export function solveLinear(A: number[][], b: number[]): number[] {
  const n = A.length;
  if (n === 0) throw new Error("solveLinear: empty system");
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

/** Ridge regression: (X'X + lI)^-1 X'y. X rows = observations (include intercept col). */
export function ridgeFit(X: number[][], y: number[], lambda: number): number[] {
  const n = X.length;
  const p = X[0]!.length;
  const XtX: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const Xty: number[] = new Array<number>(p).fill(0);
  for (let i = 0; i < n; i++) {
    const xi = X[i]!;
    for (let j = 0; j < p; j++) {
      Xty[j]! += xi[j]! * y[i]!;
      for (let k = 0; k < p; k++) XtX[j]![k]! += xi[j]! * xi[k]!;
    }
  }
  for (let j = 0; j < p; j++) XtX[j]![j]! += lambda;
  return solveLinear(XtX, Xty);
}

/** Linear prediction. */
export function ridgePredict(X: number[][], beta: number[]): number[] {
  return X.map((xi) => xi.reduce((s, x, j) => s + x * beta[j]!, 0));
}

/** ARX(p) fit via ridge on lagged design (Y[t] on Y[t-1..t-p] and exog). */
export function arxFit(Y: number[], Xexog: number[][], p: number, lambda: number): number[] {
  const rows: number[][] = [];
  const tgt: number[] = [];
  for (let t = p; t < Y.length; t++) {
    const row = [1];
    for (let l = 1; l <= p; l++) row.push(Y[t - l]!);
    for (const xe of Xexog) row.push(xe[t]!);
    rows.push(row);
    tgt.push(Y[t]!);
  }
  return ridgeFit(rows, tgt, lambda);
}

/** Adjusted plus-minus: ridge of segment point-differential on player presence. */
export function adjustedPlusMinus(
  presence: number[][],
  margin: number[],
  lambda: number,
): number[] {
  const X = presence.map((row) => [1, ...row]);
  return ridgeFit(X, margin, lambda).slice(1);
}

export interface AR1State {
  level: number;
  variance: number;
}

/** Scalar Kalman filter for AR(1) strength: x_t = phi x_{t-1} + w, y_t = x_t + v. */
export function ar1Update(
  s: AR1State,
  obs: number,
  phi: number,
  stateVar: number,
  obsVar: number,
): AR1State {
  const predLevel = phi * s.level;
  const predVar = phi * phi * s.variance + stateVar;
  const gain = predVar / (predVar + obsVar);
  return {
    level: predLevel + gain * (obs - predLevel),
    variance: (1 - gain) * predVar,
  };
}

/** One-step-ahead AR(1) forecast. */
export function ar1Forecast(s: AR1State, phi: number, stateVar: number): { mean: number; variance: number } {
  return { mean: phi * s.level, variance: phi * phi * s.variance + stateVar };
}

/** Ornstein-Uhlenbeck forecast: mean-reverting continuous-time dynamics. */
export function ouForecast(
  x: number,
  theta: number,
  mu: number,
  sigma: number,
  dt: number,
): { mean: number; variance: number } {
  const e = Math.exp(-theta * dt);
  return {
    mean: mu + (x - mu) * e,
    variance: (sigma * sigma * (1 - Math.exp(-2 * theta * dt))) / (2 * theta),
  };
}

/** Closed-form in-play win probability from an OU score-differential process. */
export function ouWinProb(lead: number, theta: number, sigma: number, tRemain: number): number {
  const f = ouForecast(lead, theta, 0, sigma, tRemain);
  const sd = Math.sqrt(Math.max(1e-12, f.variance));
  return normalCdfOU(f.mean / sd);
}

function normalCdfOU(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - p : p;
}

/** Brownian-motion win probability (theta -> 0 limit intuition, drift mu). */
export function brownianWinProb(lead: number, drift: number, sigma: number, tRemain: number): number {
  const sd = sigma * Math.sqrt(Math.max(1e-12, tRemain));
  return normalCdfOU((lead + drift * tRemain) / sd);
}
