/**
 * Pure TypeScript probability distributions and Bayesian inference.
 *
 * No npm dependencies. Zero side effects. Strict TypeScript.
 *
 * Covers: Normal, Beta, Poisson, Binomial distributions;
 * Bayesian proportion estimation and A/B comparison;
 * Confidence and prediction intervals; Shannon entropy / KL divergence;
 * Sports-specific: devig, Poisson goal model, Kelly criterion, EV.
 */

// ---------------------------------------------------------------------------
// Internal LCG seeded PRNG
// ---------------------------------------------------------------------------

function makeLcg(seed: number): () => number {
  let state = (seed >>> 0) || 1;
  return (): number => {
    state = Math.imul(1664525, state) + 1013904223;
    state = state >>> 0;
    return state / 0x100000000;
  };
}

// ---------------------------------------------------------------------------
// Log-Gamma (Lanczos approximation)
// ---------------------------------------------------------------------------

/**
 * Natural log of the Gamma function via Lanczos approximation.
 * Valid for x > 0.
 */
export function logGamma(x: number): number {
  if (x <= 0) return Infinity;
  if (x === 1 || x === 2) return 0;

  // Lanczos coefficients (g=7, n=9)
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];

  if (x < 0.5) {
    // Reflection formula: Gamma(x) * Gamma(1-x) = pi / sin(pi*x)
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }

  const z = x - 1;
  let a = c[0]!;
  for (let i = 1; i < g + 2; i++) {
    a += c[i]! / (z + i);
  }
  const t = z + g + 0.5;
  return (
    0.5 * Math.log(2 * Math.PI) +
    (z + 0.5) * Math.log(t) -
    t +
    Math.log(a)
  );
}

/**
 * Log of the Beta function: logGamma(a) + logGamma(b) - logGamma(a+b)
 */
export function logBeta(a: number, b: number): number {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

/**
 * Log of the binomial coefficient C(n, k).
 */
export function logBinomialCoeff(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  if (k === 0 || k === n) return 0;
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}

// ---------------------------------------------------------------------------
// Normal distribution
// ---------------------------------------------------------------------------

/**
 * PDF of N(mean, std) at x.
 * Defaults to standard normal N(0,1).
 */
export function normalPdf(x: number, mean = 0, std = 1): number {
  const z = (x - mean) / std;
  return Math.exp(-0.5 * z * z) / (std * Math.sqrt(2 * Math.PI));
}

/**
 * CDF of N(mean, std): P(X <= x).
 * Uses Abramowitz & Stegun 26.2.17 approximation (max error < 1.5e-7).
 */
export function normalCdf(x: number, mean = 0, std = 1): number {
  const z = (x - mean) / std;
  const sign = z >= 0 ? 1 : -1;
  const abs = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * abs);
  const poly =
    t *
    (0.254829592 +
      t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erfc = poly * Math.exp(-(abs * abs));
  return 0.5 * (1 + sign * (1 - erfc));
}

/**
 * Inverse CDF (quantile/probit) of N(mean, std) via Newton's method.
 * p must be in (0, 1).
 */
export function normalQuantile(p: number, mean = 0, std = 1): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  // Initial approximation via rational (Beasley-Springer-Moro)
  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const cc = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];

  let z: number;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    z =
      (((((cc[0]! * q + cc[1]!) * q + cc[2]!) * q + cc[3]!) * q + cc[4]!) * q + cc[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  } else if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    z =
      (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) *
      q /
      (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    z = -(
      (((((cc[0]! * q + cc[1]!) * q + cc[2]!) * q + cc[3]!) * q + cc[4]!) * q + cc[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1)
    );
  }

  // Newton refinement (2 iterations for extra precision)
  for (let i = 0; i < 2; i++) {
    const err = normalCdf(z) - p;
    const pdf = normalPdf(z);
    if (pdf === 0) break;
    z -= err / pdf;
  }

  return mean + std * z;
}

/**
 * Box-Muller transform with LCG PRNG.
 * Returns one sample from N(mean, std).
 */
export function normalRandom(mean = 0, std = 1, seed?: number): number {
  const prng = makeLcg(seed ?? Math.floor(Math.random() * 2 ** 31));
  const u1 = prng();
  const u2 = prng();
  const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-300))) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

/**
 * Standard z-score: (x - mean) / std
 */
export function zScore(x: number, mean: number, std: number): number {
  return (x - mean) / std;
}

/**
 * One-sided p-value: P(Z > z) for Z ~ N(0,1)
 */
export function pValueOneSided(z: number): number {
  return 1 - normalCdf(z);
}

/**
 * Two-sided p-value: 2 * P(Z > |z|)
 */
export function pValueTwoSided(z: number): number {
  return 2 * (1 - normalCdf(Math.abs(z)));
}

// ---------------------------------------------------------------------------
// Beta distribution
// ---------------------------------------------------------------------------

/**
 * PDF of Beta(alpha, beta) at x in [0, 1].
 */
export function betaPdf(x: number, alpha: number, beta: number): number {
  if (x < 0 || x > 1) return 0;
  if (alpha <= 0 || beta <= 0) return NaN;
  if (x === 0) {
    if (alpha < 1) return Infinity;
    if (alpha === 1) return Math.exp(-logBeta(alpha, beta));
    return 0;
  }
  if (x === 1) {
    if (beta < 1) return Infinity;
    if (beta === 1) return Math.exp(-logBeta(alpha, beta));
    return 0;
  }
  const logPdf =
    (alpha - 1) * Math.log(x) +
    (beta - 1) * Math.log(1 - x) -
    logBeta(alpha, beta);
  return Math.exp(logPdf);
}

/**
 * Regularized incomplete Beta function I_x(a, b) — CDF of Beta(a, b).
 *
 * Uses the modified Lentz continued fraction from Numerical Recipes §6.4.
 * The continued fraction is:
 *   I_x(a,b) = x^a*(1-x)^b / (a*B(a,b)) * (1/(1 + d1/(1 + d2/(1 + ...))))
 * where the d_{2m+1} and d_{2m} are given by the standard recurrence.
 */
export function betaCdf(x: number, alpha: number, beta: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  if (alpha <= 0 || beta <= 0) return NaN;

  // For x > (a+1)/(a+b+2) use the symmetry relation for better convergence
  const flip = x > (alpha + 1) / (alpha + beta + 2);
  if (flip) {
    return 1 - betaCdf(1 - x, beta, alpha);
  }

  // log prefactor: x^a * (1-x)^b / (a * B(a,b))
  const logFront =
    alpha * Math.log(x) + beta * Math.log(1 - x) - logBeta(alpha, beta) - Math.log(alpha);

  // Modified Lentz algorithm for the continued fraction
  // cf = 1 + d_1/(1 + d_2/(1 + ...))
  // d_{2m}   = m*(b-m)*x / ((a+2m-1)*(a+2m))
  // d_{2m+1} = -(a+m)*(a+b+m)*x / ((a+2m)*(a+2m+1))
  const eps = 3e-12;
  const fpmin = 1e-300;
  const maxIter = 600;

  // Start continued fraction: f = f0, C = f0, D = 0
  const qab = alpha + beta;
  const qap = alpha + 1;
  const qam = alpha - 1;

  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < fpmin) d = fpmin;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;

    // Even step: d_{2m}
    let aa = (m * (beta - m) * x) / ((qam + m2) * (alpha + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    h *= d * c;

    // Odd step: d_{2m+1}
    aa = (-(alpha + m) * (qab + m) * x) / ((alpha + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    const delta = d * c;
    h *= delta;

    if (Math.abs(delta - 1) < eps) break;
  }

  return Math.exp(logFront) * h;
}

/** Mean of Beta(alpha, beta) = alpha / (alpha + beta) */
export function betaMean(alpha: number, beta: number): number {
  return alpha / (alpha + beta);
}

/** Variance of Beta(alpha, beta) */
export function betaVariance(alpha: number, beta: number): number {
  const s = alpha + beta;
  return (alpha * beta) / (s * s * (s + 1));
}

/**
 * Mode of Beta(alpha, beta) = (alpha-1)/(alpha+beta-2).
 * Returns null if alpha <= 1 or beta <= 1 (mode not unique interior point).
 */
export function betaMode(alpha: number, beta: number): number | null {
  if (alpha > 1 && beta > 1) {
    return (alpha - 1) / (alpha + beta - 2);
  }
  return null;
}

/**
 * Quantile of Beta(alpha, beta) via bisection on betaCdf.
 */
export function betaQuantile(p: number, alpha: number, beta: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;

  // Initial guess from mean
  let lo = 0;
  let hi = 1;
  let mid = alpha / (alpha + beta);

  for (let i = 0; i < 200; i++) {
    mid = (lo + hi) / 2;
    const cdf = betaCdf(mid, alpha, beta);
    if (Math.abs(cdf - p) < 1e-12) break;
    if (cdf < p) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return mid;
}

/**
 * Sample from Beta(alpha, beta) using Johnk's method (with transformation for a<1 or b<1).
 */
export function betaRandom(alpha: number, beta: number, seed?: number): number {
  const prng = makeLcg(seed ?? Math.floor(Math.random() * 2 ** 31));

  // For alpha and beta both >= 1 use Johnk's method
  // For small parameters use transformation via exponential
  function gammaRand(shape: number): number {
    if (shape < 1) {
      // Ahrens-Dieter transformation
      const u = prng();
      return gammaRand(1 + shape) * Math.pow(u, 1 / shape);
    }
    // Marsaglia-Tsang method for shape >= 1
    const d = shape - 1 / 3;
    const cc = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x: number, v: number;
      do {
        // Box-Muller
        const u1 = prng();
        const u2 = prng();
        x = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-300))) * Math.cos(2 * Math.PI * u2);
        v = 1 + cc * x;
      } while (v <= 0);
      v = v * v * v;
      const u = prng();
      if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }

  const ga = gammaRand(alpha);
  const gb = gammaRand(beta);
  return ga / (ga + gb);
}

// ---------------------------------------------------------------------------
// Bayesian proportion estimation
// ---------------------------------------------------------------------------

export interface BayesianProportionResult {
  posteriorAlpha: number;
  posteriorBeta: number;
  mean: number;
  mode: number | null;
  variance: number;
  credibleInterval: [number, number];
}

/**
 * Bayesian proportion estimation with Beta-Binomial conjugate model.
 * Prior defaults to uniform Beta(1, 1).
 */
export function bayesianProportion(
  successes: number,
  trials: number,
  priorAlpha = 1,
  priorBeta = 1
): BayesianProportionResult {
  const posteriorAlpha = priorAlpha + successes;
  const posteriorBeta = priorBeta + (trials - successes);
  return {
    posteriorAlpha,
    posteriorBeta,
    mean: betaMean(posteriorAlpha, posteriorBeta),
    mode: betaMode(posteriorAlpha, posteriorBeta),
    variance: betaVariance(posteriorAlpha, posteriorBeta),
    credibleInterval: [
      betaQuantile(0.025, posteriorAlpha, posteriorBeta),
      betaQuantile(0.975, posteriorAlpha, posteriorBeta),
    ],
  };
}

export interface BayesianABResult {
  probBBeatsA: number;
  expectedLift: number;
  credibleInterval: [number, number];
}

/**
 * Bayesian A/B comparison via Monte Carlo sampling.
 * Returns P(B > A), expected lift E[(B-A)/A], and 95% CI on lift.
 */
export function bayesianABComparison(
  aSuccesses: number,
  aTrials: number,
  bSuccesses: number,
  bTrials: number,
  priorAlpha = 1,
  priorBeta = 1,
  samples = 50000
): BayesianABResult {
  const postA = bayesianProportion(aSuccesses, aTrials, priorAlpha, priorBeta);
  const postB = bayesianProportion(bSuccesses, bTrials, priorAlpha, priorBeta);

  const lifts: number[] = [];
  let bBeatsA = 0;

  // Use a deterministic seed for reproducibility
  const prngA = makeLcg(12345);
  const prngB = makeLcg(67890);

  function sampleBeta(a: number, b: number, prng: () => number): number {
    // Gamma ratio method
    function gammaShape(shape: number): number {
      if (shape < 1) {
        const u = prng();
        return gammaShape(1 + shape) * Math.pow(Math.max(u, 1e-300), 1 / shape);
      }
      const d = shape - 1 / 3;
      const c = 1 / Math.sqrt(9 * d);
      for (;;) {
        let x: number, v: number;
        do {
          const u1 = prng();
          const u2 = prng();
          x = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-300))) * Math.cos(2 * Math.PI * u2);
          v = 1 + c * x;
        } while (v <= 0);
        v = v * v * v;
        const u = prng();
        if (u < 1 - 0.0331 * x * x * x * x) return d * v;
        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
      }
    }
    const ga = gammaShape(a);
    const gb = gammaShape(b);
    return ga / (ga + gb);
  }

  for (let i = 0; i < samples; i++) {
    const va = sampleBeta(postA.posteriorAlpha, postA.posteriorBeta, prngA);
    const vb = sampleBeta(postB.posteriorAlpha, postB.posteriorBeta, prngB);
    if (vb > va) bBeatsA++;
    const lift = va > 0 ? (vb - va) / va : 0;
    lifts.push(lift);
  }

  lifts.sort((a, b) => a - b);
  const lo = lifts[Math.floor(0.025 * samples)]!;
  const hi = lifts[Math.floor(0.975 * samples)]!;
  const expectedLift = lifts.reduce((s, v) => s + v, 0) / samples;

  return {
    probBBeatsA: bBeatsA / samples,
    expectedLift,
    credibleInterval: [lo, hi],
  };
}

// ---------------------------------------------------------------------------
// Poisson distribution
// ---------------------------------------------------------------------------

/**
 * PMF of Poisson(lambda): P(X = k).
 */
export function poissonPmf(k: number, lambda: number): number {
  if (!Number.isInteger(k) || k < 0) return 0;
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

/**
 * CDF of Poisson(lambda): P(X <= k).
 */
export function poissonCdf(k: number, lambda: number): number {
  if (k < 0) return 0;
  const kFloor = Math.floor(k);
  let cdf = 0;
  for (let i = 0; i <= kFloor; i++) cdf += poissonPmf(i, lambda);
  return Math.min(1, cdf);
}

/** Mean of Poisson(lambda) = lambda */
export function poissonMean(lambda: number): number {
  return lambda;
}

/** Variance of Poisson(lambda) = lambda */
export function poissonVariance(lambda: number): number {
  return lambda;
}

/**
 * Quantile of Poisson(lambda): minimum k such that CDF(k) >= p.
 */
export function poissonQuantile(p: number, lambda: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return Infinity;
  let k = 0;
  let cdf = poissonPmf(0, lambda);
  while (cdf < p) {
    k++;
    cdf += poissonPmf(k, lambda);
    if (k > 1e6) break;
  }
  return k;
}

// ---------------------------------------------------------------------------
// Binomial distribution
// ---------------------------------------------------------------------------

/**
 * PMF of Binomial(n, p): P(X = k).
 */
export function binomialPmf(k: number, n: number, p: number): number {
  if (!Number.isInteger(k) || k < 0 || k > n) return 0;
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  const logPmf =
    logBinomialCoeff(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p);
  return Math.exp(logPmf);
}

/**
 * CDF of Binomial(n, p): P(X <= k).
 */
export function binomialCdf(k: number, n: number, p: number): number {
  if (k < 0) return 0;
  if (k >= n) return 1;
  const kFloor = Math.floor(k);
  let cdf = 0;
  for (let i = 0; i <= kFloor; i++) cdf += binomialPmf(i, n, p);
  return Math.min(1, cdf);
}

/** Mean of Binomial(n, p) = n * p */
export function binomialMean(n: number, p: number): number {
  return n * p;
}

/** Variance of Binomial(n, p) = n * p * (1 - p) */
export function binomialVariance(n: number, p: number): number {
  return n * p * (1 - p);
}

/**
 * Quantile of Binomial(n, p): minimum k such that CDF(k) >= prob.
 */
export function binomialQuantile(prob: number, n: number, p: number): number {
  if (prob <= 0) return 0;
  if (prob >= 1) return n;
  let k = 0;
  let cdf = binomialPmf(0, n, p);
  while (cdf < prob && k < n) {
    k++;
    cdf += binomialPmf(k, n, p);
  }
  return k;
}

// ---------------------------------------------------------------------------
// Confidence intervals
// ---------------------------------------------------------------------------

/**
 * Wilson score interval for a proportion.
 * Better than Wald for small samples and extreme proportions.
 */
export function proportionConfidenceInterval(
  successes: number,
  trials: number,
  confidenceLevel = 0.95
): [number, number] {
  const alpha = 1 - confidenceLevel;
  const z = normalQuantile(1 - alpha / 2);
  const z2 = z * z;
  const pHat = successes / trials;
  const denom = 1 + z2 / trials;
  const centre = (pHat + z2 / (2 * trials)) / denom;
  const spread =
    (z * Math.sqrt((pHat * (1 - pHat)) / trials + z2 / (4 * trials * trials))) /
    denom;
  return [Math.max(0, centre - spread), Math.min(1, centre + spread)];
}

/**
 * Confidence interval for a sample mean.
 * Uses normal approximation for n >= 30, t-adjusted otherwise.
 */
export function meanConfidenceInterval(
  values: number[],
  confidenceLevel = 0.95
): [number, number] {
  const n = values.length;
  if (n === 0) return [NaN, NaN];
  const mu = values.reduce((s, x) => s + x, 0) / n;
  const variance =
    n > 1
      ? values.reduce((s, x) => s + (x - mu) ** 2, 0) / (n - 1)
      : 0;
  const stderr = Math.sqrt(variance / n);
  const alpha = 1 - confidenceLevel;
  const zBase = normalQuantile(1 - alpha / 2);
  // Small-sample t correction
  const z = n >= 30 ? zBase : zBase * Math.sqrt(1 + 1 / n);
  return [mu - z * stderr, mu + z * stderr];
}

/**
 * CI for the difference in two proportions.
 */
export function differenceInProportionsCI(
  n1: number,
  x1: number,
  n2: number,
  x2: number,
  confidenceLevel = 0.95
): [number, number] {
  const alpha = 1 - confidenceLevel;
  const z = normalQuantile(1 - alpha / 2);
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const diff = p1 - p2;
  const se = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  return [diff - z * se, diff + z * se];
}

/**
 * Prediction interval — wider than CI; accounts for future observation variance.
 */
export function predictionInterval(
  values: number[],
  confidenceLevel = 0.95
): [number, number] {
  const n = values.length;
  if (n === 0) return [NaN, NaN];
  const mu = values.reduce((s, x) => s + x, 0) / n;
  const variance =
    n > 1
      ? values.reduce((s, x) => s + (x - mu) ** 2, 0) / (n - 1)
      : 0;
  const alpha = 1 - confidenceLevel;
  const z = normalQuantile(1 - alpha / 2);
  // sqrt(variance * (1 + 1/n)) for prediction
  const spread = z * Math.sqrt(variance * (1 + 1 / n));
  return [mu - spread, mu + spread];
}

// ---------------------------------------------------------------------------
// Entropy & information theory
// ---------------------------------------------------------------------------

/**
 * Shannon entropy in bits: -sum p * log2(p). Skips p = 0.
 */
export function shannonEntropy(probs: number[]): number {
  let h = 0;
  for (const p of probs) {
    if (p > 0) h -= p * Math.log2(p);
  }
  return h;
}

/**
 * KL divergence: sum p * log(p/q). Returns Infinity if q=0 and p>0.
 */
export function klDivergence(p: number[], q: number[]): number {
  let kl = 0;
  for (let i = 0; i < p.length; i++) {
    const pi = p[i]!;
    const qi = q[i] ?? 0;
    if (pi === 0) continue;
    if (qi === 0) return Infinity;
    kl += pi * Math.log(pi / qi);
  }
  return kl;
}

/**
 * Jensen-Shannon divergence (symmetric, bounded in [0, ln2]).
 */
export function jensenShannonDivergence(p: number[], q: number[]): number {
  const m = p.map((pi, i) => (pi + (q[i] ?? 0)) / 2);
  return 0.5 * klDivergence(p, m) + 0.5 * klDivergence(q, m);
}

/**
 * Relative entropy (chi-square-like): sum (observed - expected)^2 / expected.
 */
export function relativeEntropy(observed: number[], expected: number[]): number {
  let re = 0;
  for (let i = 0; i < observed.length; i++) {
    const e = expected[i] ?? 0;
    if (e === 0) continue;
    const diff = (observed[i]! - e);
    re += (diff * diff) / e;
  }
  return re;
}

// ---------------------------------------------------------------------------
// Sports-specific utilities
// ---------------------------------------------------------------------------

/**
 * Convert American moneyline odds to implied win probability.
 *   -110 → 52.38..%
 *   +150 → 40%
 */
export function winProbabilityFromOdds(americanOdds: number): number {
  if (americanOdds < 0) {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
  return 100 / (americanOdds + 100);
}

/**
 * Devig: remove bookmaker margin from a two-sided market.
 * Normalizes implied probabilities to sum to 1.
 */
export function devig(
  homeOdds: number,
  awayOdds: number
): { homeProb: number; awayProb: number } {
  const homeImplied = winProbabilityFromOdds(homeOdds);
  const awayImplied = winProbabilityFromOdds(awayOdds);
  const total = homeImplied + awayImplied;
  return {
    homeProb: homeImplied / total,
    awayProb: awayImplied / total,
  };
}

export interface PoissonGoalModelResult {
  homeWin: number;
  draw: number;
  awayWin: number;
  scoreMatrix: number[][];
}

/**
 * Poisson goal model for soccer/hockey.
 * Returns H/D/A probabilities and full score matrix.
 */
export function poissonGoalModel(
  homeGoalRate: number,
  awayGoalRate: number,
  maxGoals = 8
): PoissonGoalModelResult {
  const matrix: number[][] = [];
  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;

  for (let h = 0; h <= maxGoals; h++) {
    const row: number[] = [];
    for (let a = 0; a <= maxGoals; a++) {
      const p = poissonPmf(h, homeGoalRate) * poissonPmf(a, awayGoalRate);
      row.push(p);
      if (h > a) homeWin += p;
      else if (h === a) draw += p;
      else awayWin += p;
    }
    matrix.push(row);
  }

  // Normalise for truncation
  const total = homeWin + draw + awayWin;
  const norm = total > 0 ? total : 1;

  return {
    homeWin: homeWin / norm,
    draw: draw / norm,
    awayWin: awayWin / norm,
    scoreMatrix: matrix,
  };
}

/**
 * Expected value of a bet (per unit staked).
 * EV = winProb * profit - (1 - winProb) * 1
 * where profit per unit = decimal odds - 1.
 */
export function sportsBettingEv(winProb: number, americanOdds: number): number {
  const decimal =
    americanOdds >= 0
      ? americanOdds / 100 + 1
      : 100 / Math.abs(americanOdds) + 1;
  const profit = decimal - 1;
  return winProb * profit - (1 - winProb);
}

/**
 * Kelly criterion: optimal fraction of bankroll to bet.
 * f* = (b * p - q) / b  where b = decimal - 1, q = 1 - p.
 * Returns 0 for no-edge or negative edge.
 */
export function kellyCriterion(winProb: number, americanOdds: number): number {
  const decimal =
    americanOdds >= 0
      ? americanOdds / 100 + 1
      : 100 / Math.abs(americanOdds) + 1;
  const b = decimal - 1;
  if (b <= 0) return 0;
  const q = 1 - winProb;
  return Math.max(0, (b * winProb - q) / b);
}
