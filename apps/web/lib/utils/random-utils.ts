/**
 * random-utils.ts — Pure TypeScript random utilities for Galaxy Sports Edge.
 *
 * No external dependencies. No `any`. Covers:
 *   - Seeded PRNG (mulberry32)
 *   - Distribution sampling (uniform, normal, exponential, Poisson, binomial, beta, gamma, categorical)
 *   - Shuffling and sampling without replacement
 *   - Permutations and combinations
 *   - Monte Carlo utilities
 *   - Sports simulation
 *   - Randomness testing helpers
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PRNG = { next: () => number };

// ---------------------------------------------------------------------------
// 1. Seeded PRNG (mulberry32)
// ---------------------------------------------------------------------------

/**
 * Create a mulberry32 seeded PRNG.
 * Returns values in [0, 1) exclusive.
 */
export function createPRNG(seed: number): PRNG {
  let s = seed >>> 0;
  return {
    next(): number {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/**
 * Return a single pseudo-random value in [0, 1) from the given seed.
 */
export function seededRandom(seed: number): number {
  return createPRNG(seed).next();
}

/**
 * Return a pseudo-random integer in [min, max] (inclusive) from the given seed.
 */
export function seededRandomInt(seed: number, min: number, max: number): number {
  const r = createPRNG(seed).next();
  return Math.floor(r * (max - min + 1)) + min;
}

/**
 * Shuffle a copy of `arr` using Fisher-Yates with a seeded PRNG.
 * Returns a new array; does not mutate the input.
 */
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const prng = createPRNG(seed);
  const result = arr.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(prng.next() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

// ---------------------------------------------------------------------------
// 2. Sampling from distributions
// ---------------------------------------------------------------------------

/**
 * Sample from a uniform distribution on [min, max).
 * Defaults: min=0, max=1.
 */
export function uniformSample(prng: PRNG, min = 0, max = 1): number {
  return min + prng.next() * (max - min);
}

/**
 * Sample from a normal distribution using Box-Muller transform.
 * Defaults: mean=0, std=1.
 */
export function normalSample(prng: PRNG, mean = 0, std = 1): number {
  const u1 = prng.next();
  const u2 = prng.next();
  const z0 = Math.sqrt(-2 * Math.log(u1 === 0 ? Number.EPSILON : u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z0;
}

/**
 * Sample from an exponential distribution.
 * Uses inverse CDF: -ln(1 - U) / rate.
 * Default rate=1.
 */
export function exponentialSample(prng: PRNG, rate = 1): number {
  const u = prng.next();
  // Avoid log(0)
  const safe = u === 1 ? 1 - Number.EPSILON : u;
  return -Math.log(1 - safe) / rate;
}

/**
 * Sample from a Poisson distribution using Knuth's algorithm.
 */
export function poissonSample(prng: PRNG, lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= prng.next();
  } while (p > L);
  return k - 1;
}

/**
 * Sample from a binomial distribution: sum of n independent Bernoulli(p) trials.
 */
export function binomialSample(prng: PRNG, n: number, p: number): number {
  let successes = 0;
  for (let i = 0; i < n; i++) {
    if (prng.next() < p) successes++;
  }
  return successes;
}

/**
 * Sample from a gamma distribution using Marsaglia-Tsang's algorithm.
 * Throws if shape <= 0.
 * Default scale=1.
 */
export function gammaSample(prng: PRNG, shape: number, scale = 1): number {
  if (shape <= 0) throw new RangeError("gammaSample: shape must be > 0");

  // For shape < 1, use the boost trick: Gamma(shape) = Gamma(shape+1) * U^(1/shape)
  if (shape < 1) {
    const u = prng.next();
    return gammaSample(prng, shape + 1, scale) * Math.pow(u, 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  for (;;) {
    let x: number;
    let v: number;
    do {
      x = normalSample(prng, 0, 1);
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = prng.next();

    if (u < 1 - 0.0331 * (x * x) * (x * x)) {
      return d * v * scale;
    }
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v * scale;
    }
  }
}

/**
 * Sample from a beta distribution via two gamma samples.
 * Throws if alpha <= 0 or beta <= 0.
 */
export function betaSample(prng: PRNG, alpha: number, beta: number): number {
  if (alpha <= 0) throw new RangeError("betaSample: alpha must be > 0");
  if (beta <= 0) throw new RangeError("betaSample: beta must be > 0");
  const x = gammaSample(prng, alpha, 1);
  const y = gammaSample(prng, beta, 1);
  return x / (x + y);
}

/**
 * Sample from a weighted categorical distribution.
 * Throws if categories and weights lengths differ, or if sum of weights is 0.
 */
export function categoricalSample<T>(prng: PRNG, categories: T[], weights: number[]): T {
  if (categories.length !== weights.length) {
    throw new Error("categoricalSample: categories and weights must have the same length");
  }
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) throw new Error("categoricalSample: weights must sum to > 0");
  let r = prng.next() * total;
  for (let i = 0; i < categories.length; i++) {
    r -= weights[i] as number;
    if (r <= 0) return categories[i] as T;
  }
  return categories[categories.length - 1] as T;
}

// ---------------------------------------------------------------------------
// 3. Shuffling and sampling
// ---------------------------------------------------------------------------

/**
 * Return a shuffled copy of `arr` using Fisher-Yates.
 * Uses Math.random if no PRNG is supplied.
 */
export function shuffle<T>(arr: T[], prng?: PRNG): T[] {
  const result = arr.slice();
  const rand = prng ? () => prng.next() : Math.random;
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

/**
 * Sample n items without replacement from `arr`.
 * Throws if n > arr.length.
 */
export function sample<T>(arr: T[], n: number, prng?: PRNG): T[] {
  if (n > arr.length) throw new RangeError("sample: n cannot exceed array length");
  return shuffle(arr, prng).slice(0, n);
}

/**
 * Sample n items with replacement from `arr`.
 */
export function sampleWithReplacement<T>(arr: T[], n: number, prng?: PRNG): T[] {
  const rand = prng ? () => prng.next() : Math.random;
  const result: T[] = [];
  for (let i = 0; i < n; i++) {
    result.push(arr[Math.floor(rand() * arr.length)] as T);
  }
  return result;
}

/**
 * Reservoir sampling: select k items from a stream (array) uniformly at random.
 */
export function reservoirSample<T>(stream: T[], k: number, prng?: PRNG): T[] {
  const rand = prng ? () => prng.next() : Math.random;
  const reservoir = stream.slice(0, k);
  for (let i = k; i < stream.length; i++) {
    const j = Math.floor(rand() * (i + 1));
    if (j < k) {
      reservoir[j] = stream[i] as T;
    }
  }
  return reservoir;
}

/**
 * Sample one item by weight.
 * Throws if items is empty or all weights are 0.
 */
export function weightedSample<T>(
  items: Array<{ value: T; weight: number }>,
  prng?: PRNG
): T {
  if (items.length === 0) throw new Error("weightedSample: items array is empty");
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) throw new Error("weightedSample: all weights are 0");
  const rand = prng ? prng.next() : Math.random();
  let r = rand * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return (items[items.length - 1] as { value: T; weight: number }).value;
}

/**
 * Sample n items by weight.
 * Default withReplacement=false.
 */
export function weightedSampleMultiple<T>(
  items: Array<{ value: T; weight: number }>,
  n: number,
  prng?: PRNG,
  withReplacement = false
): T[] {
  if (withReplacement) {
    const result: T[] = [];
    for (let i = 0; i < n; i++) {
      result.push(weightedSample(items, prng));
    }
    return result;
  }

  // Without replacement: sample one at a time, remove it, repeat
  const remaining = items.map((item) => ({ ...item }));
  const result: T[] = [];
  for (let i = 0; i < n; i++) {
    const total = remaining.reduce((sum, item) => sum + item.weight, 0);
    if (total <= 0) break;
    const rand = prng ? prng.next() : Math.random();
    let r = rand * total;
    let idx = 0;
    for (let j = 0; j < remaining.length; j++) {
      r -= (remaining[j] as { value: T; weight: number }).weight;
      if (r <= 0) {
        idx = j;
        break;
      }
      idx = j;
    }
    result.push((remaining[idx] as { value: T; weight: number }).value);
    remaining.splice(idx, 1);
  }
  return result;
}

// ---------------------------------------------------------------------------
// 4. Permutations and combinations
// ---------------------------------------------------------------------------

/**
 * Return a random permutation of [0, 1, ..., n-1].
 */
export function randomPermutation(n: number, prng?: PRNG): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  return shuffle(arr, prng);
}

/**
 * Return a random subset of `arr` of the given size.
 */
export function randomSubset<T>(arr: T[], size: number, prng?: PRNG): T[] {
  return sample(arr, size, prng);
}

/**
 * Partition `arr` into k roughly equal groups.
 */
export function randomPartition<T>(arr: T[], k: number, prng?: PRNG): T[][] {
  const shuffled = shuffle(arr, prng);
  const partitions: T[][] = Array.from({ length: k }, () => []);
  for (let i = 0; i < shuffled.length; i++) {
    (partitions[i % k] as T[]).push(shuffled[i] as T);
  }
  return partitions;
}

/**
 * Return a random derangement of [0, 1, ..., n-1] (no fixed points).
 * n must be >= 2.
 * Uses rejection sampling.
 */
export function randomDerangement(n: number, prng?: PRNG): number[] {
  if (n < 2) throw new RangeError("randomDerangement: n must be >= 2");
  let perm: number[];
  do {
    perm = randomPermutation(n, prng);
  } while (perm.some((v, i) => v === i));
  return perm;
}

// ---------------------------------------------------------------------------
// 5. Monte Carlo utilities
// ---------------------------------------------------------------------------

/**
 * Estimate π using Monte Carlo: points inside unit circle vs total points.
 */
export function monteCarloPi(trials: number, prng?: PRNG): number {
  const rand = prng ? () => prng.next() : Math.random;
  let inside = 0;
  for (let i = 0; i < trials; i++) {
    const x = rand() * 2 - 1;
    const y = rand() * 2 - 1;
    if (x * x + y * y <= 1) inside++;
  }
  return (inside / trials) * 4;
}

/**
 * Estimate integral of f from a to b using Monte Carlo.
 */
export function monteCarloIntegral(
  f: (x: number) => number,
  a: number,
  b: number,
  trials: number,
  prng?: PRNG
): number {
  const rand = prng ? () => prng.next() : Math.random;
  let sum = 0;
  for (let i = 0; i < trials; i++) {
    const x = a + rand() * (b - a);
    sum += f(x);
  }
  return ((b - a) * sum) / trials;
}

/**
 * Bootstrap confidence interval for the mean.
 * Returns { mean, ci95Low, ci95High }.
 */
export function bootstrapMean(
  data: number[],
  iterations = 1000,
  prng?: PRNG
): { mean: number; ci95Low: number; ci95High: number } {
  const { estimate, ci95Low, ci95High } = bootstrapStatistic(
    data,
    (s) => s.reduce((a, b) => a + b, 0) / s.length,
    iterations,
    prng
  );
  return { mean: estimate, ci95Low, ci95High };
}

/**
 * Generic bootstrap: compute statistic on resampled data, return estimate and 95% CI.
 */
export function bootstrapStatistic(
  data: number[],
  statFn: (sample: number[]) => number,
  iterations = 1000,
  prng?: PRNG
): { estimate: number; ci95Low: number; ci95High: number } {
  const estimates: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const resample = sampleWithReplacement(data, data.length, prng);
    estimates.push(statFn(resample));
  }
  estimates.sort((a, b) => a - b);
  const lo = Math.floor(0.025 * iterations);
  const hi = Math.floor(0.975 * iterations);
  return {
    estimate: statFn(data),
    ci95Low: estimates[lo] as number,
    ci95High: estimates[hi] as number,
  };
}

/**
 * Jackknife estimator (leave-one-out).
 * Returns { estimate, bias, variance }.
 */
export function jackknife(
  data: number[],
  statFn: (sample: number[]) => number
): { estimate: number; bias: number; variance: number } {
  const n = data.length;
  const theta = statFn(data);
  const leaveOneOuts: number[] = [];
  for (let i = 0; i < n; i++) {
    const subset = data.filter((_, idx) => idx !== i);
    leaveOneOuts.push(statFn(subset));
  }
  const meanLOO = leaveOneOuts.reduce((a, b) => a + b, 0) / n;
  const bias = (n - 1) * (meanLOO - theta);
  const variance =
    ((n - 1) / n) *
    leaveOneOuts.reduce((sum, v) => sum + (v - meanLOO) ** 2, 0);
  return { estimate: theta, bias, variance };
}

// ---------------------------------------------------------------------------
// 6. Sports simulation
// ---------------------------------------------------------------------------

/**
 * Simulate a soccer/football match using two independent Poisson processes.
 */
export function simulatePoissonMatch(
  lambdaHome: number,
  lambdaAway: number,
  prng?: PRNG
): { homeGoals: number; awayGoals: number; result: "home" | "away" | "draw" } {
  const p: PRNG = prng ?? createPRNG(Date.now() ^ Math.floor(Math.random() * 0xffffffff));
  const homeGoals = poissonSample(p, lambdaHome);
  const awayGoals = poissonSample(p, lambdaAway);
  const result: "home" | "away" | "draw" =
    homeGoals > awayGoals ? "home" : homeGoals < awayGoals ? "away" : "draw";
  return { homeGoals, awayGoals, result };
}

/**
 * Simulate an NFL game. Total varies ±20% around avgTotal.
 * Split proportional to homeWinProb. Scores are integers.
 */
export function simulateNFLGame(
  homeWinProb: number,
  avgTotal: number,
  prng?: PRNG
): { homeScore: number; awayScore: number; winner: "home" | "away" } {
  const p: PRNG = prng ?? createPRNG(Date.now() ^ Math.floor(Math.random() * 0xffffffff));
  const variation = 1 + (p.next() * 0.4 - 0.2); // ±20%
  const total = Math.round(avgTotal * variation);
  const homeFraction = homeWinProb;
  const homeScore = Math.round(total * homeFraction);
  const awayScore = Math.max(0, total - homeScore);
  const winner: "home" | "away" = homeScore >= awayScore ? "home" : "away";
  return { homeScore, awayScore, winner };
}

/**
 * Simulate a season: n games each with independent win probability.
 */
export function simulateSeasonRecord(
  winProb: number,
  games: number,
  prng?: PRNG
): { wins: number; losses: number; winPct: number } {
  const p: PRNG = prng ?? createPRNG(Date.now() ^ Math.floor(Math.random() * 0xffffffff));
  let wins = 0;
  for (let i = 0; i < games; i++) {
    if (p.next() < winProb) wins++;
  }
  const losses = games - wins;
  return { wins, losses, winPct: wins / games };
}

/**
 * Single-elimination tournament.
 * teams.length must be a power of 2.
 * Matchup winner probability = strength_a / (strength_a + strength_b).
 * Returns the winner's name.
 */
export function simulateTournament(
  teams: Array<{ name: string; strength: number }>,
  prng?: PRNG
): string {
  const n = teams.length;
  if (n < 1 || (n & (n - 1)) !== 0) {
    throw new Error("simulateTournament: teams.length must be a power of 2");
  }
  const p: PRNG = prng ?? createPRNG(Date.now() ^ Math.floor(Math.random() * 0xffffffff));
  let bracket = teams.slice();
  while (bracket.length > 1) {
    const nextRound: Array<{ name: string; strength: number }> = [];
    for (let i = 0; i < bracket.length; i += 2) {
      const a = bracket[i] as { name: string; strength: number };
      const b = bracket[i + 1] as { name: string; strength: number };
      const probA = a.strength / (a.strength + b.strength);
      nextRound.push(p.next() < probA ? a : b);
    }
    bracket = nextRound;
  }
  return (bracket[0] as { name: string; strength: number }).name;
}

/**
 * Run `trials` simulations of `simFn`, each with a fresh PRNG derived from a seeded sequence.
 * Returns an array of results.
 */
export function runSimulations<T>(
  simFn: (prng: PRNG) => T,
  trials: number,
  seed = 42
): T[] {
  const master = createPRNG(seed);
  const results: T[] = [];
  for (let i = 0; i < trials; i++) {
    // Derive a per-trial seed from the master PRNG
    const trialSeed = Math.floor(master.next() * 4294967296);
    results.push(simFn(createPRNG(trialSeed)));
  }
  return results;
}

// ---------------------------------------------------------------------------
// 7. Randomness testing helpers
// ---------------------------------------------------------------------------

/**
 * Approximate chi-squared CDF using regularized incomplete gamma.
 * Used to get a p-value from chi-squared statistic.
 */
function chiSquaredPValue(chiSq: number, df: number): number {
  // Regularized upper incomplete gamma: P(chi^2/2 | df/2)
  // Use series approximation
  const k = df / 2;
  const x = chiSq / 2;
  if (x <= 0) return 1;
  // Use the complement: p = 1 - gammaLower(k, x) / Gamma(k)
  // Approximation via the Wilson-Hilferty transformation
  const z = Math.pow(x / k, 1 / 3) - (1 - 2 / (9 * k));
  const sigma = Math.sqrt(2 / (9 * k));
  const znorm = z / sigma;
  // Standard normal CDF complement
  return 1 - standardNormalCDF(znorm);
}

function standardNormalCDF(z: number): number {
  // Abramowitz and Stegun approximation
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly =
    t *
    (0.319381530 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const p = 1 - pdf * poly;
  return z >= 0 ? p : 1 - p;
}

/**
 * Chi-squared test for uniformity.
 * Samples should be in [0, 1]. Default bins=10.
 * isUniform if pValue > 0.05.
 */
export function chiSquaredUniformTest(
  samples: number[],
  bins = 10
): { chiSq: number; pValue: number; isUniform: boolean } {
  const n = samples.length;
  const expected = n / bins;
  const counts = new Array<number>(bins).fill(0);
  for (const s of samples) {
    const bin = Math.min(Math.floor(s * bins), bins - 1);
    (counts[bin] as number)++;
  }
  let chiSq = 0;
  for (const count of counts) {
    chiSq += (count - expected) ** 2 / expected;
  }
  const df = bins - 1;
  const pValue = chiSquaredPValue(chiSq, df);
  return { chiSq, pValue, isUniform: pValue > 0.05 };
}

/**
 * Wald-Wolfowitz runs test for randomness.
 * binarySequence should be an array of 0s and 1s.
 * isRandom if |z| < 1.96.
 */
export function runsTest(
  binarySequence: (0 | 1)[]
): { z: number; pValue: number; isRandom: boolean } {
  const n = binarySequence.length;
  const n1 = binarySequence.filter((v) => v === 1).length;
  const n0 = n - n1;

  let runs = 1;
  for (let i = 1; i < n; i++) {
    if (binarySequence[i] !== binarySequence[i - 1]) runs++;
  }

  // If one class is absent (n0 or n1 = 0), there can only be 1 run — clearly not random.
  if (n0 === 0 || n1 === 0) {
    return { z: Infinity, pValue: 0, isRandom: false };
  }

  const expectedRuns = (2 * n1 * n0) / n + 1;
  const varianceRuns =
    (2 * n1 * n0 * (2 * n1 * n0 - n)) / (n * n * (n - 1));

  const z = varianceRuns > 0 ? (runs - expectedRuns) / Math.sqrt(varianceRuns) : 0;
  const pValue = 2 * (1 - standardNormalCDF(Math.abs(z)));
  return { z, pValue, isRandom: Math.abs(z) < 1.96 };
}

/**
 * Sample autocorrelation at a given lag.
 */
export function autocorrelation(samples: number[], lag: number): number {
  const n = samples.length;
  const m = samples.reduce((a, b) => a + b, 0) / n;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    const xi = (samples[i] ?? 0) - m;
    denominator += xi * xi;
    if (i + lag < n) {
      const xj = (samples[i + lag] ?? 0) - m;
      numerator += xi * xj;
    }
  }
  return denominator === 0 ? 0 : numerator / denominator;
}
