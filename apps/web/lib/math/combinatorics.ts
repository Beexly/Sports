/**
 * Combinatorics and parlay math utilities.
 *
 * Pure TypeScript — no runtime dependencies.
 * All functions are individually exported.
 *
 * Includes: factorial, binomial coefficients, combinations, permutations,
 * power sets, parlay math, round-robin bets, teasers, probability
 * distributions, odds conversions, Kelly criterion, and scenario enumeration.
 */

// ---------------------------------------------------------------------------
// Basic combinatorics
// ---------------------------------------------------------------------------

/**
 * n! (factorial).
 * - 0! = 1
 * - Returns Infinity when n > 170 (exceeds IEEE-754 double precision)
 * - Throws RangeError when n < 0 or n is not an integer
 */
export function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError(
      `factorial: n must be a non-negative integer, got ${n}`,
    );
  }
  if (n > 170) return Infinity;
  if (n <= 20) return FACTORIAL_TABLE[n]!;
  let result = FACTORIAL_TABLE[20]!;
  for (let i = 21; i <= n; i++) result *= i;
  return result;
}

const FACTORIAL_TABLE: number[] = [
  1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800,
  479001600, 6227020800, 87178291200, 1307674368000, 20922789888000,
  355687428096000, 6402373705728000, 121645100408832000, 2432902008176640000,
];

/**
 * Log-factorial ln(n!) using Stirling's approximation for large n.
 * Exact for n ≤ 20.
 * @internal also used by distribution functions
 */
export function logFactorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n <= 20) return Math.log(FACTORIAL_TABLE[n]!);
  // Stirling's series: ln(n!) ≈ n*ln(n) - n + 0.5*ln(2πn) + 1/(12n)
  return (
    n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n) + 1 / (12 * n)
  );
}

/** Internal log-binomial-coefficient for distribution functions */
function logBinomCoeff(n: number, k: number): number {
  if (k === 0 || k === n) return 0;
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
}

/**
 * Binomial coefficient C(n, k) = n! / (k! * (n-k)!).
 * Returns 0 when k > n or k < 0.
 * Uses an iterative multiplicative formula to avoid overflow for large n.
 */
export function binomialCoeff(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k)) return NaN;
  if (k < 0 || k > n || n < 0) return 0;
  if (k === 0 || k === n) return 1;
  if (k > n - k) k = n - k;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.round(result);
}

/**
 * Alias for binomialCoeff — number of ways to choose k items from n.
 * Kept for backward compatibility with existing callers.
 */
export const choose = binomialCoeff;

/**
 * Number of k-permutations of n items: P(n, k) = n! / (n - k)!
 */
export function permutations(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k)) return NaN;
  if (k < 0 || k > n || n < 0) return 0;
  if (k === 0) return 1;
  const logResult = logFactorial(n) - logFactorial(n - k);
  return Math.round(Math.exp(logResult));
}

/**
 * All k-element subsets of arr.
 * Result is in lexicographic order by index.
 * Returns empty array when C(n,k) > 100_000 to prevent memory explosion.
 */
export function combinations<T>(arr: readonly T[], k: number): T[][] {
  if (k < 0 || k > arr.length) return [];
  if (k === 0) return [[]];
  if (k === arr.length) return [[...arr]];
  if (binomialCoeff(arr.length, k) > 100_000) return [];
  const result: T[][] = [];
  function backtrack(start: number, current: T[]): void {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]!);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  backtrack(0, []);
  return result;
}

/**
 * All permutations of arr using Heap's algorithm.
 * Returns empty array when arr.length > 8.
 */
export function permutationList<T>(arr: T[]): T[][] {
  if (arr.length > 8) return [];
  const result: T[][] = [];
  const a = [...arr];
  const n = a.length;
  const c = new Array<number>(n).fill(0);
  result.push([...a]);
  let i = 0;
  while (i < n) {
    if (c[i] < i) {
      if (i % 2 === 0) {
        [a[0], a[i]] = [a[i], a[0]];
      } else {
        [a[c[i]], a[i]] = [a[i], a[c[i]]];
      }
      result.push([...a]);
      c[i]++;
      i = 0;
    } else {
      c[i] = 0;
      i++;
    }
  }
  return result;
}

/**
 * All subsets of arr including the empty set (2^n subsets).
 */
export function powerSet<T>(arr: T[]): T[][] {
  const result: T[][] = [[]];
  for (const item of arr) {
    const len = result.length;
    for (let i = 0; i < len; i++) {
      result.push([...result[i]!, item]);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Parlay math
// ---------------------------------------------------------------------------

export interface ParlayLeg {
  /** American odds */
  odds: number;
  /** True win probability 0–1; if omitted, derived from implied probability of odds */
  winProbability?: number;
}

export interface ParlayResult {
  legs: number;
  combinedOdds: number;
  combinedDecimalOdds: number;
  winProbability: number;
  expectedValue: number;
  impliedProbabilityOdds: number;
  vig: number;
  breakEvenProb: number;
}

/**
 * Implied probability from American odds (no vig removal).
 * Positive odds: 100 / (odds + 100)
 * Negative odds: -odds / (-odds + 100)
 */
export function impliedProbability(odds: number): number {
  if (odds >= 0) return 100 / (odds + 100);
  return -odds / (-odds + 100);
}

/**
 * Convert American odds to decimal odds.
 * Positive: 1 + odds / 100
 * Negative: 1 + 100 / |odds|
 */
export function americanToDecimal(odds: number): number {
  if (odds >= 0) return 1 + odds / 100;
  return 1 + 100 / Math.abs(odds);
}

/**
 * Convert decimal odds to American odds (rounded to integer).
 * >= 2: (decimal - 1) * 100
 * < 2:  -100 / (decimal - 1)
 */
export function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}

/**
 * Full parlay analysis across all legs.
 */
export function parlayOdds(legs: ParlayLeg[]): ParlayResult {
  if (legs.length === 0) {
    return {
      legs: 0,
      combinedOdds: 0,
      combinedDecimalOdds: 1,
      winProbability: 1,
      expectedValue: 0,
      impliedProbabilityOdds: 1,
      vig: 0,
      breakEvenProb: 1,
    };
  }

  const decimals = legs.map((l) => americanToDecimal(l.odds));
  const combinedDecimal = decimals.reduce((acc, d) => acc * d, 1);
  const combinedOdds = decimalToAmerican(combinedDecimal);

  // True probability = product of each leg's win probability
  const winProbability = legs.reduce((acc, l) => {
    const p =
      l.winProbability !== undefined
        ? l.winProbability
        : impliedProbability(l.odds);
    return acc * p;
  }, 1);

  // Profit per unit if parlay hits = combinedDecimalOdds - 1
  const profit = combinedDecimal - 1;
  const expectedValue = winProbability * profit - (1 - winProbability) * 1;

  const impliedProbabilityOdds = 1 / combinedDecimal;
  const vig = impliedProbabilityOdds - winProbability;
  const breakEvenProb = impliedProbabilityOdds;

  return {
    legs: legs.length,
    combinedOdds,
    combinedDecimalOdds: combinedDecimal,
    winProbability,
    expectedValue,
    impliedProbabilityOdds,
    vig,
    breakEvenProb,
  };
}

/**
 * Multiply decimal odds together to get the combined decimal odds.
 */
export function parlayOddsFromDecimal(legs: number[]): number {
  return legs.reduce((acc, d) => acc * d, 1);
}

/**
 * Net profit from a parlay wager.
 * = stake * (combinedDecimalOdds - 1), rounded to 2 decimal places.
 */
export function profitFromParlay(stake: number, legs: ParlayLeg[]): number {
  const result = parlayOdds(legs);
  return Math.round(stake * (result.combinedDecimalOdds - 1) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Round-robin bets
// ---------------------------------------------------------------------------

export interface RoundRobinBet {
  /** Legs per mini-parlay */
  size: number;
  /** Number of mini-parlays = C(totalLegs, size) */
  count: number;
  /** stakePerBet * count */
  totalStake: number;
  /** Maximum profit if all mini-parlays win */
  maxProfit: number;
  /** Minimum number of winning mini-parlays needed to break even */
  minBreakevenWins: number;
}

/**
 * Compute round-robin structure for a set of legs.
 */
export function roundRobin(
  legs: ParlayLeg[],
  size: number,
  stakePerBet = 1,
): RoundRobinBet {
  const count = binomialCoeff(legs.length, size);
  const totalStake = stakePerBet * count;

  const combos = combinations(legs, size);
  let maxProfit = 0;
  let totalDecimalForAvg = 0;
  for (const combo of combos) {
    const result = parlayOdds(combo);
    maxProfit += stakePerBet * (result.combinedDecimalOdds - 1);
    totalDecimalForAvg += result.combinedDecimalOdds;
  }
  maxProfit = Math.round(maxProfit * 100) / 100;

  const avgDecimal = combos.length > 0 ? totalDecimalForAvg / combos.length : 1;
  const perWin = stakePerBet * (avgDecimal - 1);
  const minBreakevenWins =
    perWin > 0 ? Math.ceil(totalStake / perWin) : count;

  return { size, count, totalStake, maxProfit, minBreakevenWins };
}

/**
 * Sum of EV across all mini-parlays in a round-robin.
 */
export function roundRobinEv(
  legs: ParlayLeg[],
  size: number,
  stakePerBet = 1,
): number {
  const combos = combinations(legs, size);
  let totalEv = 0;
  for (const combo of combos) {
    const result = parlayOdds(combo);
    totalEv += stakePerBet * result.expectedValue;
  }
  return Math.round(totalEv * 1e8) / 1e8;
}

// ---------------------------------------------------------------------------
// Teasers
// ---------------------------------------------------------------------------

export interface TeaserConfig {
  /** Points added to spread (e.g., 6 for NFL 6-point teaser) */
  points: number;
  /** Number of legs */
  legs: number;
  /** Standard American odds for this teaser structure (e.g., -110) */
  odds: number;
}

/**
 * Expected value of a teaser bet.
 * legProbabilities: true win probability for each leg AFTER teaser-point adjustment.
 */
export function teaserEv(
  legProbabilities: number[],
  config: TeaserConfig,
): number {
  const winProb = legProbabilities.reduce((acc, p) => acc * p, 1);
  const decimal = americanToDecimal(config.odds);
  const profit = decimal - 1;
  return winProb * profit - (1 - winProb) * 1;
}

// ---------------------------------------------------------------------------
// Probability distributions
// ---------------------------------------------------------------------------

/**
 * Binomial PMF: P(X = k) using log-space arithmetic to avoid underflow for large n.
 * Signature: binomialPmf(n, k, p)
 */
export function binomialPmf(n: number, k: number, p: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k)) return NaN;
  if (k < 0 || k > n || n < 0 || p < 0 || p > 1) return 0;
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  const logProb =
    logBinomCoeff(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p);
  return Math.exp(logProb);
}

/**
 * Binomial CDF: P(X <= k) = sum of binomialPmf for 0..k
 * Signature: binomialCdf(n, k, p)
 */
export function binomialCdf(n: number, k: number, p: number): number {
  if (!Number.isInteger(n) || n < 0 || k < 0) return 0;
  let cdf = 0;
  for (let i = 0; i <= Math.min(k, n); i++) cdf += binomialPmf(n, i, p);
  return Math.min(cdf, 1);
}

/**
 * Negative binomial PMF: P(k failures before r successes).
 * = C(k+r-1, r-1) * p^r * (1-p)^k
 * Signature: negativeBinomialPmf(r, k, p)
 */
export function negativeBinomialPmf(r: number, k: number, p: number): number {
  if (
    !Number.isInteger(k) ||
    !Number.isInteger(r) ||
    k < 0 ||
    r < 1 ||
    p <= 0 ||
    p > 1
  )
    return 0;
  const logP =
    logBinomCoeff(k + r - 1, r - 1) + r * Math.log(p) + k * Math.log(1 - p);
  return Math.exp(logP);
}

/**
 * Hypergeometric PMF: P(X = k) when drawing n items from N total, K of which are successes.
 * = C(K, k) * C(N-K, n-k) / C(N, n)
 * Signature: hypergeometricPmf(N, K, n, k)
 */
export function hypergeometricPmf(
  N: number,
  K: number,
  n: number,
  k: number,
): number {
  if (
    !Number.isInteger(N) ||
    !Number.isInteger(K) ||
    !Number.isInteger(n) ||
    !Number.isInteger(k)
  )
    return NaN;
  if (k < Math.max(0, n - (N - K)) || k > Math.min(n, K)) return 0;
  const logP =
    logBinomCoeff(K, k) +
    logBinomCoeff(N - K, n - k) -
    logBinomCoeff(N, n);
  return Math.exp(logP);
}

// ---------------------------------------------------------------------------
// Poisson (retained from original, frequently used in soccer/hockey models)
// ---------------------------------------------------------------------------

/**
 * Poisson PMF: P(X = k) = e^(-λ) * λ^k / k!
 */
export function poissonPmf(k: number, lambda: number): number {
  if (!Number.isInteger(k) || k < 0 || lambda < 0) return 0;
  if (lambda === 0) return k === 0 ? 1 : 0;
  const logP = -lambda + k * Math.log(lambda) - logFactorial(k);
  return Math.exp(logP);
}

/**
 * Poisson CDF: P(X ≤ k)
 */
export function poissonCdf(k: number, lambda: number): number {
  if (!Number.isInteger(k) || k < 0 || lambda < 0) return 0;
  let cumulative = 0;
  for (let i = 0; i <= k; i++) cumulative += poissonPmf(i, lambda);
  return Math.min(1, cumulative);
}

/**
 * Poisson distribution: array of PMF values [P(0), P(1), ..., P(maxK)].
 */
export function poissonDistribution(lambda: number, maxK = 20): number[] {
  return Array.from({ length: maxK + 1 }, (_, k) => poissonPmf(k, lambda));
}

// ---------------------------------------------------------------------------
// Multinomial (retained from original)
// ---------------------------------------------------------------------------

/**
 * Multinomial coefficient: n! / (n1! * n2! * ... * nk!)
 */
export function multinomialCoefficient(counts: readonly number[]): number {
  const n = counts.reduce((a, b) => a + b, 0);
  if (!counts.every(Number.isInteger) || counts.some((c) => c < 0)) return NaN;
  const logResult =
    logFactorial(n) -
    counts.reduce((acc, c) => acc + logFactorial(c), 0);
  return Math.round(Math.exp(logResult));
}

// ---------------------------------------------------------------------------
// Dixon-Coles adjustment (retained from original)
// ---------------------------------------------------------------------------

/**
 * Dixon-Coles adjustment for Poisson independence in low-scoring games.
 */
export function dixonColesAdjustment(
  homeGoals: number,
  awayGoals: number,
  lambdaHome: number,
  lambdaAway: number,
  rho = -0.13,
): number {
  if (homeGoals === 0 && awayGoals === 0) return 1 - lambdaHome * lambdaAway * rho;
  if (homeGoals === 1 && awayGoals === 0) return 1 + lambdaAway * rho;
  if (homeGoals === 0 && awayGoals === 1) return 1 + lambdaHome * rho;
  if (homeGoals === 1 && awayGoals === 1) return 1 - rho;
  return 1;
}

// ---------------------------------------------------------------------------
// Win-rate analysis
// ---------------------------------------------------------------------------

/**
 * Minimum win rate for positive EV at the given American odds.
 * Equivalent to impliedProbability(odds).
 */
export function requiredWinRate(odds: number): number {
  return impliedProbability(odds);
}

// ---------------------------------------------------------------------------
// Multi-leg correlated probability
// ---------------------------------------------------------------------------

/**
 * Parlay probability accounting for leg correlation.
 * correlation = 0 → product of independent probabilities.
 * Positive correlation increases the joint probability (first-order approximation).
 * Result clamped to [0, 1].
 */
export function correlatedParlayProb(
  probabilities: number[],
  correlation = 0,
): number {
  if (probabilities.length === 0) return 1;
  const product = probabilities.reduce((acc, p) => acc * p, 1);
  if (correlation === 0) return product;
  const n = probabilities.length;
  const meanVar =
    probabilities.reduce((acc, p) => acc + p * (1 - p), 0) / n;
  const adjustment = (correlation * (n * (n - 1))) / 2 * meanVar;
  return Math.max(0, Math.min(1, product + adjustment));
}

// ---------------------------------------------------------------------------
// Scenario enumeration
// ---------------------------------------------------------------------------

/**
 * All bit-pattern arrays of length legCount with at least minWins ones.
 * 1 = win, 0 = loss.
 */
export function winningScenarios(legCount: number, minWins: number): number[][] {
  const results: number[][] = [];
  const total = 1 << legCount;
  for (let mask = 0; mask < total; mask++) {
    const bits: number[] = [];
    let wins = 0;
    for (let b = legCount - 1; b >= 0; b--) {
      const bit = (mask >> b) & 1;
      bits.push(bit);
      wins += bit;
    }
    if (wins >= minWins) results.push(bits);
  }
  return results;
}

/**
 * Expected number of wins (linearity of expectation).
 */
export function expectedWins(probabilities: number[]): number {
  return probabilities.reduce((acc, p) => acc + p, 0);
}

/**
 * P(exactly k wins) from independent legs with heterogeneous probabilities.
 * Dynamic programming: dp[j] = prob of exactly j wins after processing each leg.
 */
export function exactlyKWins(probabilities: number[], k: number): number {
  if (k < 0 || k > probabilities.length) return 0;
  const dp = new Array<number>(probabilities.length + 1).fill(0);
  dp[0] = 1;
  for (const p of probabilities) {
    for (let j = probabilities.length; j >= 1; j--) {
      dp[j] = dp[j]! * (1 - p) + dp[j - 1]! * p;
    }
    dp[0] = dp[0]! * (1 - p);
  }
  return dp[k] ?? 0;
}

/**
 * P(at least k wins) from independent legs.
 */
export function atLeastKWins(probabilities: number[], k: number): number {
  let sum = 0;
  for (let j = k; j <= probabilities.length; j++) {
    sum += exactlyKWins(probabilities, j);
  }
  return Math.min(sum, 1);
}

// ---------------------------------------------------------------------------
// Odds conversion utilities
// ---------------------------------------------------------------------------

/**
 * Remove vig from an array of probabilities by normalizing to sum to 1.
 */
export function removeVig(probabilities: number[]): number[] {
  const total = probabilities.reduce((acc, p) => acc + p, 0);
  if (total === 0) return probabilities.map(() => 0);
  return probabilities.map((p) => p / total);
}

/**
 * Remove vig from an array of American odds and return de-vigged American odds.
 */
export function noVigOdds(odds: number[]): number[] {
  const implied = odds.map(impliedProbability);
  const devigged = removeVig(implied);
  return devigged.map((p) => {
    // Convert devigged probability to decimal then to American
    const decimal = p > 0 ? 1 / p : Infinity;
    return decimalToAmerican(decimal);
  });
}

// ---------------------------------------------------------------------------
// Kelly criterion
// ---------------------------------------------------------------------------

/**
 * Full Kelly fraction from American odds.
 * b = americanToDecimal(odds) - 1
 * f = (b * winProb - (1-winProb)) / b; clamped to [0, 1].
 */
export function kellyFraction(winProb: number, odds: number): number {
  const b = americanToDecimal(odds) - 1;
  if (b <= 0) return 0;
  const f = (b * winProb - (1 - winProb)) / b;
  return Math.max(0, Math.min(1, f));
}

/**
 * Fractional Kelly (default: quarter Kelly).
 */
export function fractionalKelly(
  winProb: number,
  odds: number,
  fraction = 0.25,
): number {
  return fraction * kellyFraction(winProb, odds);
}

// ---------------------------------------------------------------------------
// Legacy helpers (retained for backward compatibility with existing callers)
// ---------------------------------------------------------------------------

/**
 * Expected value of a bet given true win probability and decimal odds.
 * EV = prob * (decimalOdds - 1) - (1 - prob)
 * @deprecated Prefer parlayOdds().expectedValue or teaserEv()
 */
export function betEv(winProb: number, decimalOdds: number): number {
  return winProb * (decimalOdds - 1) - (1 - winProb);
}

/**
 * Number of ways to have exactly W wins and L losses (treating orderings as distinct).
 */
export function waysToWinLoss(wins: number, losses: number): number {
  return binomialCoeff(wins + losses, wins);
}

/**
 * Probability of hitting exactly W wins out of N independent bets with win prob p.
 * Delegates to binomialPmf(n, k, p).
 */
export function exactWinProb(wins: number, n: number, p: number): number {
  return binomialPmf(n, wins, p);
}

/**
 * Probability of hitting AT LEAST minWins out of N bets with win prob p.
 * Uses complement: 1 - P(X ≤ minWins - 1).
 */
export function atLeastWinsProb(minWins: number, n: number, p: number): number {
  if (minWins <= 0) return 1;
  return 1 - binomialCdf(n, minWins - 1, p);
}

// ---------------------------------------------------------------------------
// Combinatorial utilities
// ---------------------------------------------------------------------------

/**
 * The nth combination (0-indexed) in lexicographic order.
 * Computed without generating all combinations (useful for large spaces).
 */
export function nthCombination<T>(arr: T[], k: number, n: number): T[] {
  const result: T[] = [];
  let remaining = n;
  let start = 0;
  for (let i = 0; i < k; i++) {
    for (let j = start; j < arr.length; j++) {
      const count = binomialCoeff(arr.length - j - 1, k - i - 1);
      if (remaining < count) {
        result.push(arr[j]!);
        start = j + 1;
        break;
      }
      remaining -= count;
    }
  }
  return result;
}

/**
 * Alias for binomialCoeff — separate export for clarity at call sites.
 */
export function combinationCount(n: number, k: number): number {
  return binomialCoeff(n, k);
}
