/**
 * arXiv 2004.14108v2: Static and Dynamic Models for Multivariate Distribution Forecasts: Proper Scoring Rule Tests of Factor-Quantile vs. Multivariate GARCH Models.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Variogram score VS_p (p in {0.5,1,2}) as a correlation diagnostic alongside the energy score for multivariate engine-variant ranking; FQ-style pilot joint forecaster for one correlated prop set: engine residuals -> PCA factors -> per-target quantile regression at the 9-node tail-concentrated grid -> PCHIP marginal CDFs -> Gaussian/t copula on PIT residuals.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Add a variogram-score evaluator (VS_p for p in {0.5, 1, 2}) in gse-backtest/scoring/ ranking engine variants by mean VS_1 alongside the energy score, and pilot an FQ-style joint forecaster for one correlated prop set (QB pass yards/attempts/completions + team total): engine residuals -> PCA factors -> per-target quantile regression at the tail-concentrated 9-node grid -> PCHIP marginal CDFs -> Gaussian/t copula on PIT residuals.
 *
 * ACCEPTANCE GATE:
 * Adapt only if, on one GSE correlated-prop backtest set, the FQ-A-style pilot joint forecaster matches the current joint simulator on mean energy score within 3% while calibrating faster. Separately, if VS_1 ranks two engine variants differently than the energy score does, adopt VS_p as a permanent correlation diagnostic regardless of the pilot outcome.
 *
 * Pilot ENABLED=false: VS_p ranking is a pure offline diagnostic (no flag); the FQ pilot joint forecaster is disabled pending the backtest gate.
 */


export const PILOT_ENABLED = false;

function mean(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1);
}

/**
 * Variogram score of order p: sum_{i<j} (|y_i - y_j|^p - E_m|X_{m,i} - X_{m,j}|^p)^2.
 * Sensitive to the dependence (correlation) structure; lower is better.
 */
export function variogramScore(
  ensemble: readonly (readonly number[])[],
  obs: readonly number[],
  p: number,
): number {
  const m = ensemble.length;
  const d = obs.length;
  let s = 0;
  for (let i = 0; i < d; i++) {
    for (let j = i + 1; j < d; j++) {
      const obsTerm = Math.pow(Math.abs(obs[i] - obs[j]), p);
      let ensTerm = 0;
      for (let k = 0; k < m; k++) {
        ensTerm += Math.pow(Math.abs(ensemble[k][i] - ensemble[k][j]), p);
      }
      ensTerm /= Math.max(m, 1);
      s += (obsTerm - ensTerm) * (obsTerm - ensTerm);
    }
  }
  return s;
}

/** VS_p for p in {0.5, 1, 2} as the standard diagnostic triple. */
export function variogramTriple(
  ensemble: readonly (readonly number[])[],
  obs: readonly number[],
): { vs05: number; vs1: number; vs2: number } {
  return {
    vs05: variogramScore(ensemble, obs, 0.5),
    vs1: variogramScore(ensemble, obs, 1),
    vs2: variogramScore(ensemble, obs, 2),
  };
}

/** Rank two variants by mean VS_1 (lower wins). */
export function rankByVariogram(
  scoresA: readonly number[],
  scoresB: readonly number[],
): { winner: "A" | "B" | "tie"; meanA: number; meanB: number } {
  const meanA = mean(scoresA);
  const meanB = mean(scoresB);
  return {
    winner: meanA < meanB ? "A" : meanB < meanA ? "B" : "tie",
    meanA,
    meanB,
  };
}

/** Tail-concentrated 9-node quantile grid for the FQ pilot. */
export const FQ_QUANTILE_GRID = [0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99];

/**
 * Per-target empirical quantile function on the 9-node grid (stand-in for the
 * quantile-regression step; monotone by construction).
 */
export function empiricalQuantileGrid(
  residuals: readonly number[],
): { taus: number[]; quantiles: number[] } {
  const sorted = [...residuals].sort((a, b) => a - b);
  const n = sorted.length;
  const quantiles = FQ_QUANTILE_GRID.map((tau) => {
    const k = Math.min(n - 1, Math.floor(tau * n));
    return sorted[k];
  });
  return { taus: [...FQ_QUANTILE_GRID], quantiles };
}

/**
 * Monotone piecewise-linear marginal CDF from the quantile grid
 * (PCHIP stand-in: linear interpolation on a monotone grid is monotone).
 */
export function marginalCdf(
  grid: { taus: number[]; quantiles: number[] },
  x: number,
): number {
  const { taus, quantiles } = grid;
  if (x <= quantiles[0]) return taus[0] * (x / quantiles[0] || 0);
  for (let i = 1; i < quantiles.length; i++) {
    if (x <= quantiles[i]) {
      const t = (x - quantiles[i - 1]) / (quantiles[i] - quantiles[i - 1] || 1);
      return taus[i - 1] + t * (taus[i] - taus[i - 1]);
    }
  }
  return 1;
}

/**
 * Gaussian-copula joint draw on PIT residuals: correlate uniforms via a
 * Cholesky factor of the target correlation matrix, then invert the marginals.
 * (t-copula extension: replace normal quantiles with t quantiles.)
 */
export function gaussianCopulaDraw(
  uniforms: readonly number[],
  chol: readonly (readonly number[])[],
  marginals: readonly { taus: number[]; quantiles: number[] }[],
): number[] {
  const d = uniforms.length;
  const z = uniforms.map((u) =>
    Math.sqrt(2) * inverseErf(2 * Math.min(Math.max(u, 1e-9), 1 - 1e-9) - 1),
  );
  const correlated = chol.map((row) =>
    row.reduce((a, c, j) => a + c * z[j], 0),
  );
  const phi = (v: number) => 0.5 * (1 + erfApprox(v / Math.SQRT2));
  return correlated.map((v, i) => {
    const u = phi(v);
    // invert the marginal CDF by bisection on the quantile grid range
    const { quantiles } = marginals[i];
    let lo = quantiles[0] - 3 * Math.abs(quantiles[0] || 1);
    let hi = quantiles[quantiles.length - 1] + 3 * Math.abs(quantiles[quantiles.length - 1] || 1);
    for (let it = 0; it < 40; it++) {
      const mid = (lo + hi) / 2;
      if (marginalCdf(marginals[i], mid) < u) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  });
}

function erfApprox(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t -
      0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

function inverseErf(x: number): number {
  // Winitzki approximation
  const a = 0.147;
  const ln = Math.log(1 - x * x);
  const t1 = 2 / (Math.PI * a) + ln / 2;
  return (
    Math.sign(x) *
    Math.sqrt(Math.sqrt(t1 * t1 - ln / a) - t1)
  );
}

/** 2x2 Cholesky factor for correlation rho (pilot: QB yards/attempts pair). */
export function chol2(rho: number): number[][] {
  const r = Math.min(Math.max(rho, -0.999), 0.999);
  return [
    [1, 0],
    [r, Math.sqrt(1 - r * r)],
  ];
}
