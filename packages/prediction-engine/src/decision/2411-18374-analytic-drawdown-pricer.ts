// ============================================================
// Analytic drawdown pricer (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: the drawdown price is a
 * monitoring/constraint input, never a stake. Activation needs (a) the
 * acceptance gate below to pass on real weekly data, and (b) a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2411.18374 — "Drawdowns of diffusions"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: excursion-theoretic drawdown laws for diffusions —
 * Lehoczky's formula for the joint law of the first drawdown time
 * theta_delta and the running maximum at that time, Malyutin's formula
 * for the maximum drawdown before a hitting time, and Taylor's
 * characterization of the first-drawdown-time distribution for Brownian
 * motion with drift. The pricer below evaluates Taylor's law directly:
 * P(maxDD_T > D) = P(theta_x <= T) with x = ln(1/(1-D)), where the
 * drawdown process DD_t = M_t - X_t is a Brownian motion with drift -mu
 * reflected at 0. The survival probability P(theta_x > T) is computed by
 * the exact eigenfunction (spectral) expansion of the reflected process —
 * no Laplace inversion is performed (inversion instability is an explicit
 * REJECT condition in the gate).
 *
 * IMPROVEMENT (from ledger): Replace Monte Carlo drawdown gates for the sizer with the closed-form analytic pricer (Brownian-motion-with-drift drawdown laws from Lehoczky/Malyutin/Taylor), running ≥100× faster than Monte Carlo, and extend it to a jump-diffusion so weekly tail losses — not just diffusion wiggle — calibrate against real weekly data.
 *
 * ACCEPTANCE GATE: ADOPT the analytic pricer if its drawdown-probability predictions are calibrated (calibration slope in [0.8, 1.2], Brier within 5% of Monte Carlo) while running ≥ 100× faster than Monte Carlo; REJECT if Laplace inversion is unstable or the BM approximation miscalibrates on real weekly data.
 *
 * Scope note: this module ships the BM-with-drift analytic pricer. The
 * jump-diffusion extension and the calibration-slope check require real
 * weekly bankroll data (not available in this environment) and are
 * deferred to the human call above. jumpDiffusionMonteCarloDrawdownProb
 * is provided as the calibration reference the extension will fit
 * against.
 */

/** Clamp to [0, 1]. */
function clamp01(p: number): number {
  return Math.min(Math.max(p, 0), 1);
}

/** Standard normal CDF via A&S 7.1.26 (erf approximation). */
export function phi(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + p * z);
  const poly = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;
  return 0.5 * (1 + sign * (1 - poly * Math.exp(-z * z)));
}

/** Bisection root finder on [lo, hi]; f(lo) and f(hi) must bracket a root. */
function bisect(f: (x: number) => number, lo: number, hi: number, iters = 200): number {
  let a = lo;
  let b = hi;
  let fa = f(a);
  for (let i = 0; i < iters; i++) {
    const m = 0.5 * (a + b);
    const fm = f(m);
    if (fa * fm <= 0) {
      b = m;
    } else {
      a = m;
      fa = fm;
    }
  }
  return 0.5 * (a + b);
}

/**
 * P(Y stays in [0, h] up to time T), where Y is a Brownian motion with
 * drift nu and unit volatility, reflected at 0 and absorbed at h.
 *
 * Exact eigenfunction expansion of the backward equation
 *   u_t = nu * u_y + (1/2) u_yy,  u_y(0,t) = 0, u(h,t) = 0, u(y,0) = 1.
 * With phi(y) = e^{-nu y} psi(y), the modes are
 *   psi_n(y) = cos(w_n y) + (nu/w_n) sin(w_n y),
 *   lambda_n = (nu^2 + w_n^2)/2,
 * where w_n > 0 solves tan(w h) = -w/nu, plus — when nu < 0 and
 * h > 1/|nu| — one bound state psi(y) = sinh(k(h-y))/sinh(kh) with
 * tanh(kh) = -k/nu and lambda = (nu^2-k^2)/2. The expansion coefficients
 * c_n = I_n/J_n use the closed forms
 *   I_n = e^{nu h} sin(w_n h)/w_n,
 *   J_n = (h/2)(1+nu^2/w_n^2) + (sin(2 w_n h)/(4 w_n))(1-nu^2/w_n^2)
 *         + nu sin^2(w_n h)/w_n^2,
 * (verified against numerical quadrature), and the bound-state norm
 *   J = (sinh(2kh) - 2kh)/(4k sinh^2(kh)),
 * which is free of the catastrophic cancellation in the naive form.
 */
function reflectedSurvival(nu: number, h: number, T: number): number {
  const TOL = 1e-13;
  const MAXN = 3000;
  let surv = 0;

  if (Math.abs(nu) < 1e-12) {
    // Driftless: w_n h = (n+1/2) pi, c_n = 2(-1)^n/(h w_n).
    for (let n = 0; n < MAXN; n++) {
      const w = ((n + 0.5) * Math.PI) / h;
      const term = ((2 * (n % 2 === 0 ? 1 : -1)) / (h * w)) * Math.exp(-((w * w * T) / 2));
      surv += term;
      if (n > 8 && Math.abs(term) < TOL) break;
    }
    return clamp01(surv);
  }

  // Trigonometric modes. Roots of tan(w h) = -w/nu:
  //   nu < 0: w h in (k pi, k pi + pi/2), k = 0, 1, ... — except that when
  //     |nu| h > 1 the k = 0 interval holds no root (its mode has turned
  //     into the bound state below); the loop then starts at k = 1.
  //     (Bisecting the rootless interval would converge on the tan pole
  //     and inject a bogus mode.)
  //   nu > 0: w h in ((k-1/2) pi, k pi), k = 1, 2, ...
  const boundActive = nu < 0 && h > 1 / Math.abs(nu);
  let n = 0;
  for (let k = nu < 0 ? (boundActive ? 1 : 0) : 1; k < MAXN; k++) {
    const a = nu < 0 ? (k * Math.PI + 1e-7) / h : ((k - 0.5) * Math.PI + 1e-7) / h;
    const b = nu < 0 ? ((k + 0.5) * Math.PI - 1e-7) / h : (k * Math.PI - 1e-7) / h;
    const w = bisect((x) => Math.tan(x * h) + x / nu, a, b);
    const lam = ((nu * nu) + w * w) / 2;
    const J =
      (h / 2) * (1 + (nu * nu) / (w * w)) +
      (Math.sin(2 * w * h) / (4 * w)) * (1 - (nu * nu) / (w * w)) +
      ((nu * Math.sin(w * h) * Math.sin(w * h)) / (w * w));
    const sinwh = Math.sin(w * h);
    // term = e^{nu h} sin(w h)/(w J) e^{-lam T}; log-form avoids overflow.
    const logAbs = nu * h - lam * T + Math.log(Math.abs(sinwh) / (w * J));
    const term = Math.sign(sinwh) * (logAbs < -745 ? 0 : Math.exp(logAbs));
    surv += term;
    n++;
    if (n > 8 && Math.abs(term) < TOL) break;
  }

  // Bound state: nu < 0 and h > 1/|nu| (exactly the regime where the
  // k = 0 trigonometric mode above ceases to exist). kappa solves
  // tanh(kh) = k/|nu|.
  // Written as s = -ln(eps), eps = 1 - k/|nu|, the exact equation
  //   eps = 2/(exp(2|nu|h(1-eps)) + 1)
  // is well-conditioned in s even when the root sits within 1e-15 of |nu|.
  if (boundActive) {
    const anu = Math.abs(nu);
    const F = (s: number) =>
      Math.exp(-s) - 2 / (Math.exp(2 * anu * h * (1 - Math.exp(-s))) + 1);
    const s = bisect(F, 1e-9, 2 * anu * h, 300);
    const kap = anu * (1 - Math.exp(-s));
    const lam = ((anu * anu) - kap * kap) / 2;
    // I = (e^{(nu+kap)h} - e^{(nu-kap)h})/(2 kap) — product-free, no 0*Inf.
    const I = (Math.exp((nu + kap) * h) - Math.exp((nu - kap) * h)) / (2 * kap);
    const z = kap * h;
    const sinhz = Math.sinh(z);
    const J = (Math.sinh(2 * z) - 2 * z) / (4 * kap * sinhz * sinhz);
    surv += (I / J) * Math.exp(-lam * T);
  }

  return clamp01(surv);
}

/**
 * Analytic P(max drawdown of wealth over horizon T exceeds D) for a
 * log-wealth process X_t = mu t + sigma W_t.
 *
 * {maxDD_T > D} = {theta_x <= T} with x = ln(1/(1-D)): the first time the
 * log drawdown crosses x. The drawdown process DD_t = M_t - X_t is a
 * Brownian motion with drift -mu reflected at 0 (Taylor/Lehoczky), so
 * with nu = -mu/sigma and h = x/sigma,
 *   P(maxDD_T > D) = 1 - reflectedSurvival(nu, h, T).
 * D is a wealth fraction in (0, 1); T in the same time units as mu/sigma.
 */
export function drawdownExceedanceProb(mu: number, sigma: number, T: number, D: number): number {
  if (!(sigma > 0) || !(T > 0) || !(D > 0) || !(D < 1)) return 0;
  const x = Math.log(1 / (1 - D));
  return 1 - reflectedSurvival(-mu / sigma, x / sigma, T);
}

/** Analytic CDF of the maximum drawdown: P(maxDD_T <= D). */
export function analyticDrawdownCdf(mu: number, sigma: number, T: number, D: number): number {
  if (!(sigma > 0) || !(T > 0)) return 0;
  if (D <= 0) return 0;
  if (D >= 1) return 1;
  return 1 - drawdownExceedanceProb(mu, sigma, T, D);
}

/**
 * Analytic P(max drawup of wealth over horizon T exceeds U): by negation
 * (X -> -X) the drawup under drift mu is the drawdown under drift -mu,
 * with log barrier ln(1+U), i.e. D = U/(1+U).
 */
export function drawupExceedanceProb(mu: number, sigma: number, T: number, U: number): number {
  if (!(sigma > 0) || !(T > 0) || !(U > 0)) return 0;
  return drawdownExceedanceProb(-mu, sigma, T, U / (1 + U));
}

/** Fit (mu, sigma) of the log-growth process from recent log-growth history. */
export function fitReturnProcess(logGrowths: number[]): { mu: number; sigma: number } {
  const n = logGrowths.length;
  if (n === 0) return { mu: 0, sigma: 0 };
  const mu = logGrowths.reduce((a, b) => a + b, 0) / n;
  const variance =
    n > 1 ? logGrowths.reduce((a, g) => a + (g - mu) * (g - mu), 0) / (n - 1) : 0;
  return { mu, sigma: Math.sqrt(Math.max(variance, 0)) };
}

/**
 * Hard-stop rule: block staking the slate if P(drawdown > D over horizon
 * T) exceeds the risk budget (e.g. 5% chance of a 20% weekly drawdown).
 */
export function drawdownHardStop(
  mu: number,
  sigma: number,
  horizon: number,
  depth: number,
  budget: number,
): boolean {
  return drawdownExceedanceProb(mu, sigma, horizon, depth) > budget;
}

/** Deterministic PRNG (mulberry32) for the reference simulators. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Monte Carlo reference pricer for the gate comparison (deterministic
 * seed). Simulates the log-wealth process X_t = mu t + sigma W_t and
 * measures the max wealth drawdown — the same quantity the analytic
 * pricer targets.
 */
export function monteCarloDrawdownProb(
  mu: number,
  sigma: number,
  T: number,
  D: number,
  nSims: number,
  steps: number,
  seed = 909,
): number {
  const rand = mulberry32(seed);
  const dt = T / steps;
  let exceed = 0;
  for (let s = 0; s < nSims; s++) {
    let logW = 0;
    let peak = 0;
    let maxDd = 0;
    for (let k = 0; k < steps; k++) {
      const u1 = Math.max(rand(), 1e-12);
      const u2 = rand();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      logW += mu * dt + sigma * Math.sqrt(dt) * z;
      if (logW > peak) peak = logW;
      const dd = 1 - Math.exp(logW - peak);
      if (dd > maxDd) maxDd = dd;
    }
    if (maxDd > D) exceed++;
  }
  return exceed / nSims;
}

/**
 * Jump-diffusion Monte Carlo reference for the deferred jump-diffusion
 * extension: dX_t = mu dt + sigma dW_t + J dN_t with compound-Poisson
 * jumps (intensity lambda, log-normal jump sizes with mean jumpMean and
 * sd jumpSd). The analytic pricer above is diffusion-only; this simulator
 * is the calibration target the jump extension will be fitted against
 * once real weekly data exists. With lambda = 0 it must agree with
 * monteCarloDrawdownProb up to simulation noise.
 */
export function jumpDiffusionMonteCarloDrawdownProb(
  mu: number,
  sigma: number,
  T: number,
  D: number,
  lambda: number,
  jumpMean: number,
  jumpSd: number,
  nSims: number,
  steps: number,
  seed = 910,
): number {
  const rand = mulberry32(seed);
  const dt = T / steps;
  let exceed = 0;
  for (let s = 0; s < nSims; s++) {
    let logW = 0;
    let peak = 0;
    let maxDd = 0;
    for (let k = 0; k < steps; k++) {
      const u1 = Math.max(rand(), 1e-12);
      const u2 = rand();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      logW += mu * dt + sigma * Math.sqrt(dt) * z;
      // Poisson(lambda dt) jumps via Bernoulli thinning (dt small).
      if (rand() < lambda * dt) {
        const v1 = Math.max(rand(), 1e-12);
        const v2 = rand();
        const zj = Math.sqrt(-2 * Math.log(v1)) * Math.cos(2 * Math.PI * v2);
        logW += jumpMean + jumpSd * zj;
      }
      if (logW > peak) peak = logW;
      const dd = 1 - Math.exp(logW - peak);
      if (dd > maxDd) maxDd = dd;
    }
    if (maxDd > D) exceed++;
  }
  return exceed / nSims;
}

export interface DrawdownGateCell {
  analytic: number;
  mc: number;
}

/**
 * Gate helper (Brier-spirit): the analytic pricer passes when its mean
 * relative deviation from the Monte Carlo reference across the grid is
 * within 5% and no cell deviates by more than 10%.
 */
export function drawdownPricerGatePasses(cells: DrawdownGateCell[]): {
  passes: boolean;
  meanRelErr: number;
  maxRelErr: number;
} {
  let sum = 0;
  let max = 0;
  for (const c of cells) {
    const rel = c.mc <= 0 ? (c.analytic <= 0.01 ? 0 : 1) : Math.abs(c.analytic - c.mc) / c.mc;
    sum += rel;
    if (rel > max) max = rel;
  }
  const meanRelErr = cells.length === 0 ? 1 : sum / cells.length;
  const passes = cells.length > 0 && meanRelErr <= 0.05 && max <= 0.1;
  return { passes, meanRelErr, maxRelErr: max };
}
