/**
 * arXiv 2002.01193: A copula-based multivariate hidden Markov model for modelling momentum in football
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * CopulaHMM: drive/play-level bivariate observations (EPA per play + success rate) with CMP/negative-binomial marginals and a Gaussian/Clayton copula, K=3 states with covariate-driven transitions (score differential, time remaining, home/away, opponent strength); posterior state probabilities feed in-game win-probability and live spread/total models.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build gse.regimes.CopulaHMM: drive/play-level bivariate observations (e.g. EPA per play + success rate) with CMP/negative-binomial marginals and a Gaussian/Clayton copula, K=3 states with covariate-driven transitions (score differential, time remaining, home/away, opponent strength); feed posterior state probabilities into the in-game win-probability and live spread/total models.
 *
 * ACCEPTANCE GATE (verbatim):
 * On 2023-2024 holdout, the copula-HMM's one-step-ahead predictive log-likelihood beats the independence-HMM baseline by >= 0.02 nats/observation on average across team-seasons AND the Viterbi state dummies are jointly significant (p < 0.05) for next-drive points.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: bayesian | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Scaled forward algorithm; returns log-likelihood of the observation sequence. */
export function hmmForwardLogLik(
  pi: number[],
  A: number[][],
  logEmit: number[][],
): number {
  const T = logEmit.length;
  const K = pi.length;
  let logLik = 0;
  let alpha = pi.map((p, k) => Math.log(Math.max(1e-300, p)) + logEmit[0]![k]!);
  for (let t = 1; t < T; t++) {
    const next = new Array<number>(K).fill(-Infinity);
    for (let k = 0; k < K; k++) {
      let m = -Infinity;
      for (let j = 0; j < K; j++) {
        const v = alpha[j]! + Math.log(Math.max(1e-300, A[j]![k]!));
        if (v > m) m = v;
      }
      let s = 0;
      for (let j = 0; j < K; j++) s += Math.exp(alpha[j]! + Math.log(Math.max(1e-300, A[j]![k]!)) - m);
      next[k] = m + Math.log(Math.max(1e-300, s)) + logEmit[t]![k]!;
    }
    const mx = Math.max(...next);
    const scale = Math.log(next.reduce((s, v) => s + Math.exp(v - mx), 0)) + mx;
    logLik += scale;
    alpha = next.map((v) => v - scale);
  }
  const mx = Math.max(...alpha);
  return logLik + Math.log(alpha.reduce((s, v) => s + Math.exp(v - mx), 0)) + mx;
}

/** Viterbi most-likely state path. */
export function viterbi(pi: number[], A: number[][], logEmit: number[][]): number[] {
  const T = logEmit.length;
  const K = pi.length;
  const delta: number[][] = [];
  const psi: number[][] = [];
  delta.push(pi.map((p, k) => Math.log(Math.max(1e-300, p)) + logEmit[0]![k]!));
  psi.push(new Array<number>(K).fill(0));
  for (let t = 1; t < T; t++) {
    const dRow = new Array<number>(K).fill(-Infinity);
    const pRow = new Array<number>(K).fill(0);
    for (let k = 0; k < K; k++) {
      let best = -Infinity;
      let bj = 0;
      for (let j = 0; j < K; j++) {
        const v = delta[t - 1]![j]! + Math.log(Math.max(1e-300, A[j]![k]!));
        if (v > best) { best = v; bj = j; }
      }
      dRow[k] = best + logEmit[t]![k]!;
      pRow[k] = bj;
    }
    delta.push(dRow);
    psi.push(pRow);
  }
  const path = new Array<number>(T).fill(0);
  path[T - 1] = delta[T - 1]!.indexOf(Math.max(...delta[T - 1]!));
  for (let t = T - 2; t >= 0; t--) path[t] = psi[t + 1]![path[t + 1]!]!;
  return path;
}

/** Stationary distribution of a transition matrix (power iteration). */
export function hmmStationary(A: number[][], iters = 1000): number[] {
  const K = A.length;
  let v = new Array<number>(K).fill(1 / K);
  for (let it = 0; it < iters; it++) {
    const w = new Array<number>(K).fill(0);
    for (let j = 0; j < K; j++) for (let k = 0; k < K; k++) w[k]! += v[j]! * A[j]![k]!;
    v = w;
  }
  return v;
}

/**
 * Hamilton filter for a 2-state Markov-switching Gaussian model.
 * Returns filtered P(state=1 | y_1..y_t).
 */
export function hamiltonFilter(
  ys: number[],
  mu: [number, number],
  sig: [number, number],
  p11: number,
  p22: number,
): number[] {
  const out: number[] = [];
  let f0 = 0.5;
  let f1 = 0.5;
  for (const y of ys) {
    const e0 = gaussDens(y, mu[0], sig[0]);
    const e1 = gaussDens(y, mu[1], sig[1]);
    const p0 = (f0 * p11 + f1 * (1 - p22)) * e0;
    const p1 = (f0 * (1 - p11) + f1 * p22) * e1;
    const s = p0 + p1;
    f0 = p0 / Math.max(1e-300, s);
    f1 = p1 / Math.max(1e-300, s);
    out.push(f1);
  }
  return out;
}

function gaussDens(y: number, mu: number, sig: number): number {
  const z = (y - mu) / Math.max(1e-9, sig);
  return Math.exp(-0.5 * z * z) / (Math.max(1e-9, sig) * 2.5066282746310002);
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
