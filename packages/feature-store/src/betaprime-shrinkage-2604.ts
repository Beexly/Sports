/**
 * BetaPrime-hyperprior radial shrinkage for early-season team EPA effects
 *
 * Research port: arXiv:2604.04673
 * Normalized lane: calibration | Doctrine: PROPRIETARY_EDGE
 *
 * Pure Monte Carlo implementation of the paper's radial shrinkage rule
 * delta(Y): team EPA effects Y shrink toward the league average mu under a
 * hierarchical Gaussian model with a BetaPrime(a,b) hyperprior on the
 * variance ratio W. With kappa = 1/(1+W) ~ Beta(b,a), the posterior mean is
 * delta(Y) = E[kappa|Y]*mu + (1-E[kappa|Y])*Y, where E[kappa|Y] is estimated
 * by self-normalized importance sampling over kappa draws — Monte Carlo over
 * W, no MCMC, exactly as the paper prescribes. Model-form note: this module
 * implements the standard normal-normal BetaPrime hierarchy; the paper's
 * exact delta(Y) constants should be cross-checked against the paper before
 * production use.
 *
 * ACCEPTANCE GATE: ADOPT the hyperprior shrinkage rule iff on the 2024 test
 * window it reduces team-EPA MSE by >= 3% relative to the baseline point
 * estimate AND does not worsen Brier score on derived win probabilities
 * (paired t-test, alpha = 0.05, non-inferiority margin 0.001).
 */

export interface ShrinkageParams {
  /** BetaPrime shape a */
  a: number;
  /** BetaPrime shape b */
  b: number;
  /** observation noise variance sigma^2 */
  sigma2: number;
  /** league-average effect mu (scalar, applied per dimension) */
  mu: number;
  /** Monte Carlo draws over W (via kappa) */
  mcDraws: number;
  /** deterministic seed */
  seed: number;
}

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

/** Marsaglia-Tsang gamma sampler (shape > 0). */
function gammaSample(shape: number, rng: () => number): number {
  if (shape < 1) {
    // augmentation: Gamma(shape) = Gamma(shape+1) * U^(1/shape)
    return gammaSample(shape + 1, rng) * Math.pow(rng(), 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x = 0;
    let v = 0;
    // Box-Muller for the normal draw
    const u1 = Math.max(rng(), 1e-12);
    const u2 = rng();
    x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    v = 1 + c * x;
    if (v <= 0) continue;
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

export interface ShrinkageResult {
  /** posterior-mean shrinkage weight on the league average */
  kappaBar: number;
  /** shrunk effects delta(Y) */
  shrunk: number[];
  /** effective draws (ESS of the importance weights) */
  effectiveDraws: number;
}

/**
 * Radial shrinkage delta(Y) via Monte Carlo over the BetaPrime hyperprior.
 * Y: observed team effects; shrinks toward mu.
 */
export function betaprimeShrink(y: number[], params: ShrinkageParams): ShrinkageResult {
  const { a, b, sigma2, mu, mcDraws, seed } = params;
  const fail: ShrinkageResult = { kappaBar: Number.NaN, shrunk: [], effectiveDraws: 0 };
  if (y.length === 0 || !(a > 0) || !(b > 0) || !(sigma2 > 0) || !(mcDraws > 0)) return fail;
  const rng = mulberry32(seed);
  const d = y.length;
  const sqDist = y.reduce((s, v) => s + (v - mu) * (v - mu), 0);
  let wSum = 0;
  let wkSum = 0;
  let wSqSum = 0;
  let draws = 0;
  for (let i = 0; i < mcDraws; i++) {
    const g1 = gammaSample(b, rng);
    const g2 = gammaSample(a, rng);
    const kappa = g1 / (g1 + g2); // Beta(b, a) draw
    if (!(kappa > 0) || !(kappa < 1)) continue;
    // log marginal likelihood of Y given kappa: Y ~ N(mu, (sigma2/kappa) I)
    const lw = (d / 2) * Math.log(kappa) - (kappa * sqDist) / (2 * sigma2);
    const ew = Math.exp(lw);
    draws++;
    wSum += ew;
    wkSum += ew * kappa;
    wSqSum += ew * ew;
  }
  if (draws === 0 || wSum === 0) return fail;
  const kappaBar = wkSum / wSum;
  const ess = (wSum * wSum) / Math.max(wSqSum, 1e-300);
  return {
    kappaBar,
    shrunk: y.map((v) => kappaBar * mu + (1 - kappaBar) * v),
    effectiveDraws: ess,
  };
}

/** MSE of shrunk vs raw estimates against a target (for the 3% gate check). */
export function mse(values: number[], target: number[]): number {
  if (values.length === 0 || values.length !== target.length) return Number.NaN;
  let s = 0;
  for (let i = 0; i < values.length; i++) {
    const e = (values[i] ?? 0) - (target[i] ?? 0);
    s += e * e;
  }
  return s / values.length;
}

export const GSE_BETAPRIME_SHRINKAGE_ENABLED = false;
