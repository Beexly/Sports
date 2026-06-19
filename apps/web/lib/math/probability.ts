/**
 * Probability and statistical inference utilities — pure, zero dependencies.
 *
 * Covers: basic probability, discrete distributions, continuous distributions,
 * special math functions, descriptive statistics, hypothesis testing,
 * and sports-specific prediction models.
 *
 * All floating-point comparisons in tests use toBeCloseTo.
 */

// ---------------------------------------------------------------------------
// Normal distribution (legacy exports kept for backward compatibility)
// ---------------------------------------------------------------------------

/**
 * CDF of the standard normal distribution.
 * Abramowitz & Stegun approximation 26.2.17, maximum error < 1.5e-7.
 * Returns P(Z <= z) for Z ~ N(0, 1).
 */
export function normalCdf(z: number): number {
  const sign = z >= 0 ? 1 : -1;
  const x = Math.abs(z) / Math.SQRT2;

  const t = 1 / (1 + 0.3275911 * x);
  const poly =
    t *
    (0.254829592 +
      t *
        (-0.284496736 +
          t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erfc = poly * Math.exp(-(x * x));
  const erfVal = 1 - erfc;

  return 0.5 * (1 + sign * erfVal);
}

/**
 * Inverse normal CDF (probit function).
 * Uses a rational approximation (Beasley-Springer-Moro style).
 * Returns z such that P(Z <= z) = p.
 * Throws if p <= 0 or p >= 1.
 */
export function normalPpf(p: number): number {
  if (p <= 0 || p >= 1) {
    throw new RangeError(`normalPpf: p must be in (0, 1), got ${p}`);
  }

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let z: number;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    z =
      (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q +
        c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  } else if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    z =
      (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r +
        a[5]!) *
      q /
      (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    z = -(
      (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q +
        c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1)
    );
  }

  return z;
}

// ---------------------------------------------------------------------------
// Confidence intervals (legacy)
// ---------------------------------------------------------------------------

/**
 * Wilson score confidence interval for a proportion.
 */
export function proportionCI(
  successes: number,
  n: number,
  confidence = 0.95
): { lower: number; upper: number; margin: number } {
  if (n <= 0) {
    throw new RangeError(`proportionCI: n must be > 0, got ${n}`);
  }
  const alpha = 1 - confidence;
  const z = normalPpf(1 - alpha / 2);
  const pHat = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (pHat + z2 / (2 * n)) / denom;
  const spread = (z * Math.sqrt((pHat * (1 - pHat)) / n + z2 / (4 * n * n))) / denom;
  const lower = Math.max(0, centre - spread);
  const upper = Math.min(1, centre + spread);
  const margin = (upper - lower) / 2;
  return { lower, upper, margin };
}

/**
 * Confidence interval for a sample mean.
 */
export function meanCI(
  values: readonly number[],
  confidence = 0.95
): {
  lower: number;
  upper: number;
  margin: number;
  mean: number;
  stderr: number;
} {
  if (values.length === 0) {
    throw new RangeError("meanCI: values array must not be empty");
  }
  const n = values.length;
  const mu = values.reduce((s, x) => s + x, 0) / n;
  const variance =
    values.reduce((s, x) => s + (x - mu) ** 2, 0) / (n - 1 < 1 ? 1 : n - 1);
  const stderr = Math.sqrt(variance / n);

  const alpha = 1 - confidence;
  const zBase = normalPpf(1 - alpha / 2);
  const z = n > 30 ? zBase : zBase * Math.sqrt(1 + 1 / n);

  const margin = z * stderr;
  return {
    mean: mu,
    stderr,
    lower: mu - margin,
    upper: mu + margin,
    margin,
  };
}

// ---------------------------------------------------------------------------
// Chi-square helpers (legacy)
// ---------------------------------------------------------------------------

function chiSquareSurvival(chi2: number, df: number): number {
  if (chi2 <= 0) return 1;
  if (df <= 0) return 0;
  const x = Math.pow(chi2 / df, 1 / 3);
  const mu = 1 - 2 / (9 * df);
  const sigma = Math.sqrt(2 / (9 * df));
  const z = (x - mu) / sigma;
  return 1 - normalCdf(z);
}

/**
 * Chi-square goodness-of-fit p-value.
 */
export function chiSquarePValue(
  observed: readonly number[],
  expected: readonly number[]
): number {
  if (observed.length !== expected.length) {
    throw new RangeError(
      `chiSquarePValue: observed and expected must have the same length`
    );
  }
  if (expected.some((e) => e === 0)) {
    throw new RangeError(`chiSquarePValue: expected values must not be 0`);
  }
  const chi2 = observed.reduce(
    (sum, o, i) => sum + (o - expected[i]!) ** 2 / expected[i]!,
    0
  );
  const df = observed.length - 1;
  return chiSquareSurvival(chi2, df);
}

/**
 * Two-tailed binomial test p-value.
 */
export function binomialPValue(
  successes: number,
  n: number,
  p: number
): number {
  if (n <= 0) {
    throw new RangeError(`binomialPValue: n must be > 0, got ${n}`);
  }
  if (p <= 0 || p >= 1) {
    throw new RangeError(`binomialPValue: p must be in (0, 1), got ${p}`);
  }
  const mu = n * p;
  const std = Math.sqrt(n * p * (1 - p));
  if (std === 0) return 1;
  const z = (successes - mu) / std;
  return 2 * Math.min(normalCdf(z), 1 - normalCdf(z));
}

/**
 * Two-proportion z-test.
 */
export function proportionTest(
  p1: number,
  n1: number,
  p2: number,
  n2: number
): { zScore: number; pValue: number; significant: boolean } {
  const pPool = (p1 * n1 + p2 * n2) / (n1 + n2);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
  if (se === 0) {
    return { zScore: 0, pValue: 1, significant: false };
  }
  const zScore = (p1 - p2) / se;
  const pValue = 2 * Math.min(normalCdf(zScore), 1 - normalCdf(zScore));
  return { zScore, pValue, significant: pValue < 0.05 };
}

// ---------------------------------------------------------------------------
// Poisson (legacy exports)
// ---------------------------------------------------------------------------

/**
 * P(X = k) for Poisson(lambda).
 */
export function poissonPmf(k: number, lambda: number): number {
  if (k < 0 || !Number.isInteger(k)) return 0;
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logProb = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) {
    logProb -= Math.log(i);
  }
  return Math.exp(logProb);
}

/**
 * P(X <= k) for Poisson(lambda).
 */
export function poissonCdf(k: number, lambda: number): number {
  if (k < 0) return 0;
  let cdf = 0;
  const kInt = Math.floor(k);
  for (let i = 0; i <= kInt; i++) {
    cdf += poissonPmf(i, lambda);
  }
  return Math.min(1, cdf);
}

/**
 * Expected value of Poisson(lambda) = lambda.
 */
export function poissonMean(lambda: number): number {
  return lambda;
}

// ---------------------------------------------------------------------------
// Expected goals / match probabilities (legacy)
// ---------------------------------------------------------------------------

/**
 * Dixon-Coles-style expected goals.
 */
export function expectedGoals(
  teamRate: number,
  opponentDefRate: number,
  leagueAvg: number
): number {
  if (leagueAvg === 0) return 0;
  return (teamRate * opponentDefRate) / leagueAvg;
}

/**
 * Compute match outcome probabilities using independent Poisson distributions.
 */
export function matchProbabilities(
  homeXg: number,
  awayXg: number,
  maxGoals = 10
): { homeWin: number; draw: number; awayWin: number } {
  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;

  for (let i = 0; i <= maxGoals; i++) {
    const homeP = poissonPmf(i, homeXg);
    for (let j = 0; j <= maxGoals; j++) {
      const awayP = poissonPmf(j, awayXg);
      const joint = homeP * awayP;
      if (i > j) homeWin += joint;
      else if (i === j) draw += joint;
      else awayWin += joint;
    }
  }

  return { homeWin, draw, awayWin };
}

// ---------------------------------------------------------------------------
// Monte Carlo simulation (legacy)
// ---------------------------------------------------------------------------

function makeLcgPrng(seed: number): () => number {
  let state = seed >>> 0;
  return function (): number {
    state = ((1664525 * state + 1013904223) & 0xffffffff) >>> 0;
    return state / 0x100000000;
  };
}

/**
 * Simulate win rate distribution over trials.
 */
export function monteCarloWinRate(
  n: number,
  p: number,
  trials = 10000,
  seed?: number
): { mean: number; stdDev: number; ci95: { lower: number; upper: number } } {
  const prng = makeLcgPrng(seed ?? 42);
  const winRates: number[] = [];

  for (let t = 0; t < trials; t++) {
    let wins = 0;
    for (let i = 0; i < n; i++) {
      if (prng() < p) wins++;
    }
    winRates.push(wins / n);
  }

  const mu = winRates.reduce((s, r) => s + r, 0) / trials;
  const variance =
    winRates.reduce((s, r) => s + (r - mu) ** 2, 0) / (trials - 1);
  const stdDev = Math.sqrt(variance);

  const z95 = 1.959964;
  const stderr = stdDev / Math.sqrt(trials);
  return {
    mean: mu,
    stdDev,
    ci95: {
      lower: mu - z95 * stderr,
      upper: mu + z95 * stderr,
    },
  };
}

// ---------------------------------------------------------------------------
// Betting edge utilities (legacy)
// ---------------------------------------------------------------------------

/**
 * Kelly criterion: f* = (p * (b + 1) - 1) / b
 */
export function kellyOptimal(p: number, b: number): number {
  if (b <= 0) return 0;
  const f = (p * (b + 1) - 1) / b;
  return Math.max(0, f);
}

/**
 * Implied edge = modelProb - marketProb.
 */
export function impliedEdge(modelProb: number, marketProb: number): number {
  return modelProb - marketProb;
}

// ---------------------------------------------------------------------------
// Sample size calculation (legacy)
// ---------------------------------------------------------------------------

/**
 * Minimum sample size for a proportion test.
 */
export function sampleSize(
  effect: number,
  alpha = 0.05,
  power = 0.8
): number {
  const zAlpha = normalPpf(1 - alpha / 2);
  const zBeta = normalPpf(power);
  const p = 0.5;
  const n = ((zAlpha + zBeta) ** 2 * p * (1 - p)) / (effect ** 2);
  return Math.ceil(n);
}

// ===========================================================================
// NEW COMPREHENSIVE PROBABILITY LIBRARY
// ===========================================================================

// ---------------------------------------------------------------------------
// 1. Basic probability
// ---------------------------------------------------------------------------

/**
 * Iterative factorial. Throws if n < 0 or n > 20 (overflow prevention).
 */
export function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) {
    throw new RangeError(`factorial: n must be a non-negative integer, got ${n}`);
  }
  if (n > 20) {
    throw new RangeError(`factorial: n must be <= 20 to prevent overflow, got ${n}`);
  }
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

/**
 * Combinations C(n, k) using Pascal's triangle, supports n up to 30.
 */
export function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  if (n > 30) {
    throw new RangeError(`combinations: n must be <= 30, got ${n}`);
  }
  // Build Pascal's triangle row by row up to n
  let row: number[] = [1];
  for (let i = 1; i <= n; i++) {
    const next: number[] = [1];
    for (let j = 1; j < row.length; j++) {
      next.push((row[j - 1]! + row[j]!));
    }
    next.push(1);
    row = next;
  }
  return row[k]!;
}

/**
 * Permutations P(n, k) = n! / (n-k)!
 */
export function permutations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = n; i > n - k; i--) result *= i;
  return result;
}

/**
 * Complement probability: 1 - p.
 */
export function complement(p: number): number {
  return 1 - p;
}

/**
 * Conditional probability P(A|B) = P(A∩B) / P(B). Throws if pB = 0.
 */
export function conditionalProbability(pAandB: number, pB: number): number {
  if (pB === 0) {
    throw new RangeError("conditionalProbability: pB must not be 0");
  }
  return pAandB / pB;
}

/**
 * Bayes theorem: P(A|B) = P(B|A) * P(A) / P(B).
 */
export function bayesUpdate(
  prior: number,
  likelihood: number,
  marginalLikelihood: number
): number {
  if (marginalLikelihood === 0) {
    throw new RangeError("bayesUpdate: marginalLikelihood must not be 0");
  }
  return (likelihood * prior) / marginalLikelihood;
}

/**
 * Total probability: sum of prior[i] * likelihood[i].
 */
export function totalProbability(
  priors: number[],
  likelihoods: number[]
): number {
  if (priors.length !== likelihoods.length) {
    throw new RangeError("totalProbability: priors and likelihoods must have equal length");
  }
  return priors.reduce((sum, p, i) => sum + p * likelihoods[i]!, 0);
}

// ---------------------------------------------------------------------------
// 2. Discrete distributions
// ---------------------------------------------------------------------------

/**
 * Binomial PMF: C(n,k) * p^k * (1-p)^(n-k).
 */
export function binomialPMF(k: number, n: number, p: number): number {
  if (k < 0 || k > n || !Number.isInteger(k) || !Number.isInteger(n)) return 0;
  if (p < 0 || p > 1) return 0;
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  const c = combinations(n, k);
  return c * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

/**
 * Binomial CDF: P(X <= k).
 */
export function binomialCDF(k: number, n: number, p: number): number {
  if (k < 0) return 0;
  if (k >= n) return 1;
  let cdf = 0;
  for (let i = 0; i <= Math.floor(k); i++) {
    cdf += binomialPMF(i, n, p);
  }
  return Math.min(1, cdf);
}

/**
 * Binomial mean: n * p.
 */
export function binomialMean(n: number, p: number): number {
  return n * p;
}

/**
 * Binomial variance: n * p * (1 - p).
 */
export function binomialVariance(n: number, p: number): number {
  return n * p * (1 - p);
}

/**
 * Poisson PMF: e^(-lambda) * lambda^k / k!
 */
export function poissonPMF(k: number, lambda: number): number {
  return poissonPmf(k, lambda);
}

/**
 * Poisson CDF: P(X <= k).
 */
export function poissonCDF(k: number, lambda: number): number {
  return poissonCdf(k, lambda);
}

/**
 * Poisson mean = lambda.
 */
export function poissonMeanFn(lambda: number): number {
  return lambda;
}

/**
 * Geometric PMF: p * (1-p)^(k-1), k >= 1.
 */
export function geometricPMF(k: number, p: number): number {
  if (k < 1 || !Number.isInteger(k)) return 0;
  return p * Math.pow(1 - p, k - 1);
}

/**
 * Geometric CDF: 1 - (1-p)^k.
 */
export function geometricCDF(k: number, p: number): number {
  if (k < 1) return 0;
  return 1 - Math.pow(1 - p, k);
}

/**
 * Negative binomial PMF: C(k-1,r-1) * p^r * (1-p)^(k-r).
 * k = total trials (k >= r), r = successes.
 */
export function negativeBinomialPMF(k: number, r: number, p: number): number {
  if (k < r || !Number.isInteger(k) || !Number.isInteger(r)) return 0;
  return combinations(k - 1, r - 1) * Math.pow(p, r) * Math.pow(1 - p, k - r);
}

/**
 * Hypergeometric PMF: C(K,k) * C(N-K, n-k) / C(N,n).
 * N = population, K = successes in population, n = draws, k = observed successes.
 */
export function hypergeometricPMF(
  k: number,
  K: number,
  n: number,
  N: number
): number {
  if (k < 0 || k > K || k > n || n - k > N - K) return 0;
  return (combinations(K, k) * combinations(N - K, n - k)) / combinations(N, n);
}

/**
 * Multinomial coefficient: n! / (k1! * k2! * ... * km!) where n = sum(counts).
 */
export function multinomialCoeff(counts: number[]): number {
  const n = counts.reduce((s, c) => s + c, 0);
  if (n > 20) {
    throw new RangeError("multinomialCoeff: sum of counts must be <= 20");
  }
  let result = factorial(n);
  for (const c of counts) {
    result /= factorial(c);
  }
  return Math.round(result);
}

// ---------------------------------------------------------------------------
// 3. Special math functions
// ---------------------------------------------------------------------------

/**
 * Error function approximation (Abramowitz & Stegun 7.1.26).
 * Maximum error: 1.5e-7.
 */
export function erf(x: number): number {
  if (x === 0) return 0;
  const sign = x >= 0 ? 1 : -1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const poly =
    t *
    (0.254829592 +
      t *
        (-0.284496736 +
          t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const result = 1 - poly * Math.exp(-(ax * ax));
  return sign * result;
}

/**
 * Complementary error function: 1 - erf(x).
 */
export function erfc(x: number): number {
  return 1 - erf(x);
}

/**
 * Log-Gamma function via Lanczos approximation. Valid for x > 0.
 */
export function logGamma(x: number): number {
  if (x <= 0) return Infinity;
  if (x === 1 || x === 2) return 0;

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
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }

  const xm1 = x - 1;
  let a = c[0]!;
  for (let i = 1; i < g + 2; i++) {
    a += c[i]! / (xm1 + i);
  }
  const t = xm1 + g + 0.5;
  return (
    0.5 * Math.log(2 * Math.PI) +
    (xm1 + 0.5) * Math.log(t) -
    t +
    Math.log(a)
  );
}

/**
 * Gamma function via Lanczos approximation.
 */
export function gammaFunction(x: number): number {
  if (x <= 0 && Number.isInteger(x)) return Infinity;
  return Math.exp(logGamma(x));
}

/**
 * Beta function: B(a,b) = Gamma(a)*Gamma(b)/Gamma(a+b).
 */
export function betaFunction(a: number, b: number): number {
  return Math.exp(logGamma(a) + logGamma(b) - logGamma(a + b));
}

/**
 * Regularized incomplete gamma function P(a, x) using series expansion.
 */
export function regularizedIncompleteGamma(a: number, x: number): number {
  if (x < 0) return 0;
  if (x === 0) return 0;
  if (a <= 0) return 1;

  // Use series expansion for small x, continued fraction for large x
  if (x < a + 1) {
    // Series expansion
    let term = 1 / a;
    let sum = term;
    for (let n = 1; n <= 200; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-12) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  } else {
    // Continued fraction (Lentz's method)
    const FPMIN = 1e-300;
    let b = x + 1 - a;
    let c = 1 / FPMIN;
    let d = 1 / b;
    let h = d;

    for (let i = 1; i <= 200; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < FPMIN) d = FPMIN;
      c = b + an / c;
      if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-12) break;
    }
    return 1 - Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
  }
}

/**
 * Regularized incomplete beta function I_x(a,b) using continued fraction.
 */
export function regularizedIncompleteBeta(
  a: number,
  b: number,
  x: number
): number {
  if (x < 0 || x > 1) return x < 0 ? 0 : 1;
  if (x === 0) return 0;
  if (x === 1) return 1;

  // Use symmetry relation for numerical stability
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - regularizedIncompleteBeta(b, a, 1 - x);
  }

  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta) / a;

  // Continued fraction (Lentz's method)
  const FPMIN = 1e-300;
  let c = 1;
  let d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= 200; m++) {
    // Even step
    let numerator = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + numerator * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + numerator / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;

    // Odd step
    numerator = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + numerator * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + numerator / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-12) break;
  }

  return front * h;
}

// ---------------------------------------------------------------------------
// 3. Continuous distributions
// ---------------------------------------------------------------------------

/**
 * Normal PDF: (1/(sigma*sqrt(2*pi))) * exp(-0.5*((x-mean)/sigma)^2).
 */
export function normalPDF(x: number, meanVal = 0, std = 1): number {
  const z = (x - meanVal) / std;
  return Math.exp(-0.5 * z * z) / (std * Math.sqrt(2 * Math.PI));
}

/**
 * Normal CDF using erf approximation.
 */
export function normalCDF(x: number, meanVal = 0, std = 1): number {
  return 0.5 * (1 + erf((x - meanVal) / (std * Math.SQRT2)));
}

/**
 * Inverse normal CDF (probit).
 */
export function normalInverseCDF(p: number, meanVal = 0, std = 1): number {
  return meanVal + std * normalPpf(p);
}

/**
 * Standard normal PDF: normalPDF(x, 0, 1).
 */
export function standardNormal(x: number): number {
  return normalPDF(x, 0, 1);
}

/**
 * t-distribution PDF. Uses logGamma for numerical stability.
 */
export function tDistributionPDF(x: number, df: number): number {
  const logNum = logGamma((df + 1) / 2);
  const logDen = 0.5 * Math.log(df * Math.PI) + logGamma(df / 2);
  const logKernel = -(df + 1) / 2 * Math.log(1 + x * x / df);
  return Math.exp(logNum - logDen + logKernel);
}

/**
 * t-distribution CDF using regularized incomplete beta function.
 */
export function tDistributionCDF(x: number, df: number): number {
  const t2 = x * x;
  const betaRatio = regularizedIncompleteBeta(df / 2, 0.5, df / (df + t2));
  if (x >= 0) {
    return 1 - 0.5 * betaRatio;
  } else {
    return 0.5 * betaRatio;
  }
}

/**
 * Chi-squared PDF: x^(k/2-1) * e^(-x/2) / (2^(k/2) * Gamma(k/2)).
 */
export function chiSquaredPDF(x: number, k: number): number {
  if (x <= 0) return 0;
  return (
    Math.pow(x, k / 2 - 1) *
    Math.exp(-x / 2) /
    (Math.pow(2, k / 2) * gammaFunction(k / 2))
  );
}

/**
 * Chi-squared CDF using regularized incomplete gamma function.
 */
export function chiSquaredCDF(x: number, k: number): number {
  if (x <= 0) return 0;
  return regularizedIncompleteGamma(k / 2, x / 2);
}

/**
 * Exponential PDF: lambda * e^(-lambda*x), x >= 0.
 */
export function exponentialPDF(x: number, lambda: number): number {
  if (x < 0) return 0;
  return lambda * Math.exp(-lambda * x);
}

/**
 * Exponential CDF: 1 - e^(-lambda*x).
 */
export function exponentialCDF(x: number, lambda: number): number {
  if (x < 0) return 0;
  return 1 - Math.exp(-lambda * x);
}

/**
 * Beta PDF: x^(alpha-1) * (1-x)^(beta-1) / B(alpha,beta).
 */
export function betaPDF(x: number, alpha: number, beta: number): number {
  if (x < 0 || x > 1) return 0;
  if (x === 0) return alpha < 1 ? Infinity : alpha === 1 ? 1 / betaFunction(alpha, beta) : 0;
  if (x === 1) return beta < 1 ? Infinity : beta === 1 ? 1 / betaFunction(alpha, beta) : 0;
  return (
    Math.pow(x, alpha - 1) *
    Math.pow(1 - x, beta - 1) /
    betaFunction(alpha, beta)
  );
}

/**
 * Beta CDF: regularized incomplete beta function I_x(alpha, beta).
 */
export function betaCDF(x: number, alpha: number, beta: number): number {
  return regularizedIncompleteBeta(alpha, beta, x);
}

/**
 * Uniform PDF: 1/(b-a) if a <= x <= b, else 0.
 */
export function uniformPDF(x: number, a: number, b: number): number {
  if (x < a || x > b) return 0;
  return 1 / (b - a);
}

/**
 * Uniform CDF.
 */
export function uniformCDF(x: number, a: number, b: number): number {
  if (x < a) return 0;
  if (x > b) return 1;
  return (x - a) / (b - a);
}

/**
 * Lognormal PDF.
 */
export function lognormalPDF(x: number, mu: number, sigma: number): number {
  if (x <= 0) return 0;
  const lnx = Math.log(x);
  return (
    Math.exp(-0.5 * ((lnx - mu) / sigma) ** 2) /
    (x * sigma * Math.sqrt(2 * Math.PI))
  );
}

/**
 * Lognormal CDF.
 */
export function lognormalCDF(x: number, mu: number, sigma: number): number {
  if (x <= 0) return 0;
  return normalCDF(Math.log(x), mu, sigma);
}

// ---------------------------------------------------------------------------
// 4. Descriptive statistics
// ---------------------------------------------------------------------------

/**
 * Arithmetic mean.
 */
export function mean(data: number[]): number {
  if (data.length === 0) throw new RangeError("mean: data must not be empty");
  return data.reduce((s, x) => s + x, 0) / data.length;
}

/**
 * Median via sorting (does not mutate input).
 */
export function median(data: number[]): number {
  if (data.length === 0) throw new RangeError("median: data must not be empty");
  const sorted = [...data].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

/**
 * Mode — returns all modes (values with maximum frequency).
 */
export function mode(data: number[]): number[] {
  if (data.length === 0) throw new RangeError("mode: data must not be empty");
  const freq = new Map<number, number>();
  for (const x of data) freq.set(x, (freq.get(x) ?? 0) + 1);
  const maxFreq = Math.max(...freq.values());
  return [...freq.entries()]
    .filter(([, f]) => f === maxFreq)
    .map(([v]) => v)
    .sort((a, b) => a - b);
}

/**
 * Variance — sample (default) or population.
 */
export function variance(data: number[], population = false): number {
  if (data.length === 0) throw new RangeError("variance: data must not be empty");
  const mu = mean(data);
  const n = population ? data.length : data.length - 1;
  if (n === 0) return 0;
  return data.reduce((s, x) => s + (x - mu) ** 2, 0) / n;
}

/**
 * Standard deviation.
 */
export function standardDeviation(data: number[], population = false): number {
  return Math.sqrt(variance(data, population));
}

/**
 * Fisher-Pearson skewness.
 */
export function skewness(data: number[]): number {
  if (data.length < 3) throw new RangeError("skewness: need at least 3 data points");
  const mu = mean(data);
  const s = standardDeviation(data);
  if (s === 0) return 0;
  const n = data.length;
  const m3 = data.reduce((sum, x) => sum + ((x - mu) / s) ** 3, 0);
  return (n / ((n - 1) * (n - 2))) * m3;
}

/**
 * Excess kurtosis.
 */
export function kurtosis(data: number[]): number {
  if (data.length < 4) throw new RangeError("kurtosis: need at least 4 data points");
  const mu = mean(data);
  const s = standardDeviation(data);
  if (s === 0) return 0;
  const n = data.length;
  const m4 = data.reduce((sum, x) => sum + ((x - mu) / s) ** 4, 0);
  return (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3)) * m4 -
    (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
}

/**
 * Quantile via linear interpolation.
 */
export function quantile(data: number[], p: number): number {
  if (data.length === 0) throw new RangeError("quantile: data must not be empty");
  if (p < 0 || p > 1) throw new RangeError("quantile: p must be in [0, 1]");
  const sorted = [...data].sort((a, b) => a - b);
  const pos = p * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (pos - lo) * (sorted[hi]! - sorted[lo]!);
}

/**
 * Interquartile range: Q3 - Q1.
 */
export function iqr(data: number[]): number {
  return quantile(data, 0.75) - quantile(data, 0.25);
}

/**
 * Z-score: (x - mean) / std.
 */
export function zScore(x: number, meanVal: number, std: number): number {
  if (std === 0) throw new RangeError("zScore: std must not be 0");
  return (x - meanVal) / std;
}

/**
 * Sample covariance.
 */
export function covariance(x: number[], y: number[]): number {
  if (x.length !== y.length) throw new RangeError("covariance: x and y must have equal length");
  if (x.length < 2) throw new RangeError("covariance: need at least 2 data points");
  const mx = mean(x);
  const my = mean(y);
  const n = x.length;
  return x.reduce((s, xi, i) => s + (xi - mx) * (y[i]! - my), 0) / (n - 1);
}

/**
 * Pearson correlation coefficient.
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  const sx = standardDeviation(x);
  const sy = standardDeviation(y);
  if (sx === 0 || sy === 0) return 0;
  return covariance(x, y) / (sx * sy);
}

/**
 * Rank array (average ranks for ties).
 */
function ranks(data: number[]): number[] {
  const indexed = data.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const result = new Array<number>(data.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j < indexed.length - 1 && indexed[j + 1]!.v === indexed[j]!.v) j++;
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) {
      result[indexed[k]!.i] = avgRank;
    }
    i = j + 1;
  }
  return result;
}

/**
 * Spearman rank correlation.
 */
export function spearmanCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length) throw new RangeError("spearmanCorrelation: x and y must have equal length");
  return pearsonCorrelation(ranks(x), ranks(y));
}

// ---------------------------------------------------------------------------
// 5. Hypothesis testing
// ---------------------------------------------------------------------------

/**
 * Z-test (two-tailed, alpha=0.05).
 */
export function zTest(
  sampleMean: number,
  mu0: number,
  sigma: number,
  n: number
): { z: number; pValue: number; reject: boolean } {
  const z = (sampleMean - mu0) / (sigma / Math.sqrt(n));
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  return { z, pValue, reject: pValue < 0.05 };
}

/**
 * One-sample t-test (two-tailed).
 */
export function tTest(
  data: number[],
  mu0: number
): { t: number; df: number; pValue: number; reject: boolean } {
  const n = data.length;
  if (n < 2) throw new RangeError("tTest: need at least 2 data points");
  const mu = mean(data);
  const s = standardDeviation(data);
  const t = (mu - mu0) / (s / Math.sqrt(n));
  const df = n - 1;
  const pValue = 2 * (1 - tDistributionCDF(Math.abs(t), df));
  return { t, df, pValue, reject: pValue < 0.05 };
}

/**
 * Chi-square goodness-of-fit test.
 */
export function chiSquareGoodnessOfFit(
  observed: number[],
  expected: number[]
): { chiSq: number; df: number; pValue: number; reject: boolean } {
  if (observed.length !== expected.length) {
    throw new RangeError("chiSquareGoodnessOfFit: arrays must have equal length");
  }
  const chiSq = observed.reduce(
    (sum, o, i) => sum + (o - expected[i]!) ** 2 / expected[i]!,
    0
  );
  const df = observed.length - 1;
  const pValue = 1 - chiSquaredCDF(chiSq, df);
  return { chiSq, df, pValue, reject: pValue < 0.05 };
}

/**
 * Proportion z-test (one-sample, two-tailed).
 */
export function proportionZTest(
  successes: number,
  n: number,
  p0: number
): { z: number; pValue: number; reject: boolean } {
  const pHat = successes / n;
  const se = Math.sqrt(p0 * (1 - p0) / n);
  const z = (pHat - p0) / se;
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  return { z, pValue, reject: pValue < 0.05 };
}

/**
 * Confidence interval using z-score.
 */
export function confidenceInterval(
  sampleMean: number,
  std: number,
  n: number,
  confidence = 0.95
): { lower: number; upper: number } {
  const z = normalInverseCDF(1 - (1 - confidence) / 2);
  const margin = z * std / Math.sqrt(n);
  return { lower: sampleMean - margin, upper: sampleMean + margin };
}

// ---------------------------------------------------------------------------
// 6. Sports prediction
// ---------------------------------------------------------------------------

/**
 * Poisson match goals matrix: P(home=i, away=j) for i,j in 0..maxGoals.
 */
export function poissonMatchGoals(
  lambdaHome: number,
  lambdaAway: number,
  maxGoals = 8
): number[][] {
  const matrix: number[][] = [];
  for (let i = 0; i <= maxGoals; i++) {
    const row: number[] = [];
    for (let j = 0; j <= maxGoals; j++) {
      row.push(poissonPmf(i, lambdaHome) * poissonPmf(j, lambdaAway));
    }
    matrix.push(row);
  }
  return matrix;
}

/**
 * Poisson win probabilities.
 */
export function poissonWinProbs(
  lambdaHome: number,
  lambdaAway: number,
  maxGoals = 8
): { homeWin: number; draw: number; awayWin: number } {
  const matrix = poissonMatchGoals(lambdaHome, lambdaAway, maxGoals);
  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;
  for (let i = 0; i <= maxGoals; i++) {
    for (let j = 0; j <= maxGoals; j++) {
      const p = matrix[i]![j]!;
      if (i > j) homeWin += p;
      else if (i === j) draw += p;
      else awayWin += p;
    }
  }
  return { homeWin, draw, awayWin };
}

/**
 * Poisson over/under probability for total goals.
 */
export function poissonOverUnder(
  lambdaHome: number,
  lambdaAway: number,
  line: number,
  maxGoals = 8
): { over: number; under: number } {
  const matrix = poissonMatchGoals(lambdaHome, lambdaAway, maxGoals);
  let over = 0;
  let under = 0;
  for (let i = 0; i <= maxGoals; i++) {
    for (let j = 0; j <= maxGoals; j++) {
      const total = i + j;
      const p = matrix[i]![j]!;
      if (total > line) over += p;
      else under += p;
    }
  }
  return { over, under };
}

/**
 * Probability of at least one win streak of length `streakLength` in `n` games.
 * Uses dynamic programming (analytical, simulation-free).
 *
 * Let dp[i][j] = probability that after i games, current win streak = j, and
 * no streak of length L has occurred yet.
 */
export function binomialWinStreak(
  p: number,
  n: number,
  streakLength: number
): number {
  if (streakLength <= 0 || n <= 0) return 0;
  if (streakLength > n) return 0;
  if (p === 0) return 0;
  if (p === 1) return 1;

  // dp[j] = probability of being in state "current streak = j" without ever hitting L
  // j ranges from 0 to L-1
  let dp = new Array<number>(streakLength).fill(0);
  dp[0] = 1; // start state: 0 games played, 0 consecutive wins

  for (let i = 0; i < n; i++) {
    const next = new Array<number>(streakLength).fill(0);
    for (let j = 0; j < streakLength; j++) {
      if (dp[j] === 0) continue;
      // lose
      next[0]! += dp[j]! * (1 - p);
      // win
      if (j + 1 < streakLength) {
        next[j + 1]! += dp[j]! * p;
      }
      // if j + 1 === streakLength: streak achieved, probability leaves dp
    }
    dp = next;
  }

  // Probability of no streak = sum of dp
  const noStreak = dp.reduce((s, x) => s + x, 0);
  return 1 - noStreak;
}

/**
 * Expected NFL points from win probability (wins=1, loss=0).
 * expectedPoints = winProb (in a simple binary outcome model).
 */
export function expectedPointsNFL(winProb: number): number {
  return winProb;
}
