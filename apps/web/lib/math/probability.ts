/**
 * Probability and statistical inference utilities — pure, zero dependencies.
 *
 * Confidence intervals, hypothesis testing, probability distributions,
 * Monte Carlo simulation primitives, and significance testing for
 * sports pick calibration and win rate analysis.
 */

// ---------------------------------------------------------------------------
// Normal distribution
// ---------------------------------------------------------------------------

/**
 * CDF of the standard normal distribution.
 * Abramowitz & Stegun approximation 26.2.17, maximum error < 1.5e-7.
 * Returns P(Z <= z) for Z ~ N(0, 1).
 */
export function normalCdf(z: number): number {
  const sign = z >= 0 ? 1 : -1;
  const x = Math.abs(z) / Math.SQRT2;

  // A&S 26.2.17 rational approximation for erfc
  const t = 1 / (1 + 0.3275911 * x);
  const poly =
    t *
    (0.254829592 +
      t *
        (-0.284496736 +
          t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erfc = poly * Math.exp(-(x * x));
  const erf = 1 - erfc;

  return 0.5 * (1 + sign * erf);
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

  // Rational approximation coefficients
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
// Confidence intervals
// ---------------------------------------------------------------------------

/**
 * Wilson score confidence interval for a proportion.
 * Returns lower/upper bounds and margin of error.
 * Throws if n <= 0.
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
 * For large n (> 30) uses normal approximation.
 * For small n uses a simple t-distribution adjustment: multiply z by sqrt(1 + 1/n).
 * Throws if values is empty.
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
  // Small-sample adjustment: inflate z by sqrt(1 + 1/n) for n <= 30
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
// Hypothesis tests
// ---------------------------------------------------------------------------

/**
 * Chi-square survival function (1 - CDF) approximation.
 * Uses Wilson-Hilferty normal approximation for df > 0.
 */
function chiSquareSurvival(chi2: number, df: number): number {
  if (chi2 <= 0) return 1;
  if (df <= 0) return 0;
  // Wilson-Hilferty approximation
  const x = Math.pow(chi2 / df, 1 / 3);
  const mu = 1 - 2 / (9 * df);
  const sigma = Math.sqrt(2 / (9 * df));
  const z = (x - mu) / sigma;
  return 1 - normalCdf(z);
}

/**
 * Chi-square goodness-of-fit p-value.
 * chi2 = sum((o - e)^2 / e), df = observed.length - 1.
 * Throws if lengths differ or any expected value is 0.
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
 * Uses normal approximation: z = (successes - n*p) / sqrt(n*p*(1-p)).
 * Throws if n <= 0 or p not in (0, 1).
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
  const mean = n * p;
  const std = Math.sqrt(n * p * (1 - p));
  if (std === 0) return 1;
  const z = (successes - mean) / std;
  // Two-tailed
  return 2 * Math.min(normalCdf(z), 1 - normalCdf(z));
}

/**
 * Two-proportion z-test.
 * pPool = (p1*n1 + p2*n2) / (n1 + n2)
 * se = sqrt(pPool * (1-pPool) * (1/n1 + 1/n2))
 * z = (p1 - p2) / se
 * Two-tailed p-value; significant if pValue < 0.05.
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
// Poisson distribution
// ---------------------------------------------------------------------------

/**
 * P(X = k) for Poisson(lambda).
 * Returns 0 for k < 0 or non-integer k.
 */
export function poissonPmf(k: number, lambda: number): number {
  if (k < 0 || !Number.isInteger(k)) return 0;
  if (lambda <= 0) return k === 0 ? 1 : 0;
  // Use log-space to avoid overflow for large k
  let logProb = -lambda + k * Math.log(lambda);
  // Subtract log(k!)
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
// Expected goals / match probabilities
// ---------------------------------------------------------------------------

/**
 * Dixon-Coles-style expected goals.
 * xG = teamRate * opponentDefRate / leagueAvg
 * All values should be positive rates (goals per game).
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
 * Evaluates joint probability matrix P(home=i, away=j) for i,j in 0..maxGoals.
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
// Monte Carlo simulation
// ---------------------------------------------------------------------------

/**
 * Simple LCG seeded PRNG.
 * Returns a function that generates the next pseudo-random number in [0, 1).
 */
function makeLcgPrng(seed: number): () => number {
  let state = seed >>> 0;
  return function (): number {
    state = ((1664525 * state + 1013904223) & 0xffffffff) >>> 0;
    return state / 0x100000000;
  };
}

/**
 * Simulate `trials` experiments, each with `n` picks at win probability `p`.
 * Returns distribution of win rates across trials.
 * Seed defaults to 42 if not provided.
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
// Betting edge utilities
// ---------------------------------------------------------------------------

/**
 * Kelly criterion: f* = (p * (b + 1) - 1) / b
 * p: probability of win
 * b: net odds (e.g., b=1 for even money, b=0.909 for -110)
 * Returns 0 if result is negative (no edge).
 */
export function kellyOptimal(p: number, b: number): number {
  if (b <= 0) return 0;
  const f = (p * (b + 1) - 1) / b;
  return Math.max(0, f);
}

/**
 * Implied edge = modelProb - marketProb.
 * Positive means the model sees more value than the market implies.
 */
export function impliedEdge(modelProb: number, marketProb: number): number {
  return modelProb - marketProb;
}

// ---------------------------------------------------------------------------
// Sample size calculation
// ---------------------------------------------------------------------------

/**
 * Minimum sample size for a proportion test.
 * effect: minimum detectable difference from 0.5 (e.g., 0.05 means detect 55% vs 50%).
 * Uses: n = (z_alpha/2 + z_beta)^2 * p * (1-p) / effect^2, p = 0.5.
 * Returns ceiling.
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
