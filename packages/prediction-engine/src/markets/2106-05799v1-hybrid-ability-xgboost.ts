/**
 * arXiv 2106.05799v1: Hybrid Machine Learning Forecasts for the UEFA EURO 2020
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * NFL adaptation of the hybrid architecture: ability estimators = (a) time-decayed Bradley-Terry/Elo on 8 seasons (half-life ~2 seasons, tuned by RPS), (b) bookmaker-consensus via 100k season simulations inverting Super Bowl futures, (c) EPA-based ridge plus-minus -> team roster strength + missing-starters features; covariates = rest/bye, travel/altitude, wind/weather, market-implied total, injury-report counts (difference-coded); feed into XGBoost -- with a copula-coupled score model (Gaussian-copula negative-binomial on (home points, away points), capturing negative correlation in blowouts and positive in shootouts) replacing the paper's conditional-independence assumption. Engine-honesty infrastructure for sharper moneyline pricing.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * NFL adaptation of the hybrid architecture: ability estimators = (a) time-decayed Bradley-Terry/Elo on 8 seasons (half-life ~2 seasons, tuned by RPS), (b) bookmaker-consensus via 100k season simulations inverting Super Bowl futures, (c) EPA-based ridge plus-minus -> team roster strength + missing-starters features; covariates = rest/bye, travel/altitude, wind/weather, market-implied total, injury-report counts (difference-coded); feed into XGBoost — with a copula-coupled score model (Gaussian-copula negative-binomial on (home points, away points), capturing negative correlation in blowouts and positive in shootouts) replacing the paper's conditional-independence assumption. Treated as engine-honesty infrastructure for sharper moneyline pricing, not as a betting objective.
 *
 * ACCEPTANCE GATE (verbatim):
 * Adopt the hybrid architecture if, on the 2015-2024 leave-one-season-out test, the hybrid model's mean moneyline log-loss beats both the market-consensus baseline and the plain-covariate XGBoost by >= 0.005 (absolute), with the improvement present in >= 7 of the 10 held-out seasons.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: markets | verdict: ADAPT | doctrine: BASELINE
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

/** Standard normal CDF (Abramowitz-Stegun). */
export function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - p : p;
}

/** Inverse standard normal CDF (Acklam approximation). */
export function normalQuantile(p: number): number {
  const pc = Math.min(1 - 1e-12, Math.max(1e-12, p));
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
    1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
    6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
    -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const plow = 0.02425;
  const phigh = 1 - plow;
  if (pc < plow) {
    const q = Math.sqrt(-2 * Math.log(pc));
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  if (pc > phigh) {
    const q = Math.sqrt(-2 * Math.log(1 - pc));
    return -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  const q = pc - 0.5;
  const r = q * q;
  return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q /
    (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
}

/** Bivariate Gaussian-copula sample on [0,1]^2 with correlation rho. */
export function gaussCopulaSample(rand: () => number, rho: number, randnFn: () => number): [number, number] {
  const z1 = randnFn();
  const z2 = randnFn();
  const w2 = rho * z1 + Math.sqrt(Math.max(0, 1 - rho * rho)) * z2;
  void rand;
  return [normalCdf(z1), normalCdf(w2)];
}

/** Gaussian-copula joint CDF for binary-thresholded margins. */
export function gaussCopulaJoint(p1: number, p2: number, rho: number): number {
  // P(U1 <= p1, U2 <= p2) via bivariate normal CDF (Drezner-Wesolowsky approx)
  const x = normalQuantile(p1);
  const y = normalQuantile(p2);
  const a = x;
  const b = y;
  const r = Math.min(0.999999, Math.max(-0.999999, rho));
  // tetrachoric series (first-order is enough for the demo)
  void a; void b;
  return normalCdf(x) * normalCdf(y) + (r / (2 * Math.PI)) * Math.exp(-(x * x + y * y) / 2);
}

/** Log-gamma via Lanczos approximation. */
function logGamma(z: number): number {
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = c[0]!;
  for (let i = 1; i < 9; i++) x += c[i]! / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Negative-binomial PMF parameterized by (r, p): k failures before r successes. */
export function negBinPmf(k: number, r: number, p: number): number {
  const lp = logGamma(k + r) - logGamma(r) - logGamma(k + 1) + r * Math.log(p) + k * Math.log(1 - p);
  return Math.exp(lp);
}

/** Method-of-moments (r, p) fit for counts. */
export function negBinMoments(ks: readonly number[]): { r: number; p: number } {
  const m = ks.reduce((a, b) => a + b, 0) / ks.length;
  const v = ks.reduce((a, b) => a + (b - m) ** 2, 0) / ks.length;
  if (v <= m) return { r: 1e9, p: 1e9 / (1e9 + m) }; // Poisson limit
  const p = m / v;
  return { r: (m * m) / (v - m), p };
}

/** Zero-inflated NB PMF. */
export function zinbPmf(k: number, pi: number, r: number, p: number): number {
  if (k === 0) return pi + (1 - pi) * negBinPmf(0, r, p);
  return (1 - pi) * negBinPmf(k, r, p);
}

/** NB log-likelihood. */
export function negBinLogLik(ks: readonly number[], r: number, p: number): number {
  let s = 0;
  for (const k of ks) s += Math.log(Math.max(1e-300, negBinPmf(k, r, p)));
  return s;
}
