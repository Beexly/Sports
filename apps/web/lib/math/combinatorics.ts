/**
 * Combinatorics utilities — pure math, zero dependencies.
 *
 * Binomial coefficients, combinations, permutations, Poisson and
 * negative binomial distributions, and multinomial helpers.
 * Used for prop betting analysis, multi-game parlays, and
 * distribution-based scoring models.
 */

/**
 * Factorial n! for non-negative integers.
 * Uses a lookup table for n ≤ 20 (exact), BigInt approximation for larger.
 * Returns Infinity for n > 170 (exceeds float64).
 */
const FACTORIAL_TABLE: number[] = [
  1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880,
  3628800, 39916800, 479001600, 6227020800, 87178291200, 1307674368000,
  20922789888000, 355687428096000, 6402373705728000, 121645100408832000,
  2432902008176640000,
];

export function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n <= 20) return FACTORIAL_TABLE[n]!;
  if (n > 170) return Infinity;
  let result = FACTORIAL_TABLE[20]!;
  for (let i = 21; i <= n; i++) {
    result *= i;
  }
  return result;
}

/**
 * Log-factorial ln(n!) using Stirling's approximation for large n.
 * Exact for n ≤ 20.
 */
export function logFactorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n <= 20) return Math.log(FACTORIAL_TABLE[n]!);
  // Stirling's series: ln(n!) ≈ n*ln(n) - n + 0.5*ln(2πn) + 1/(12n)
  return n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n) + 1 / (12 * n);
}

/**
 * Binomial coefficient C(n, k) = n! / (k! * (n-k)!)
 * Returns 0 for invalid inputs.
 */
export function choose(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k)) return NaN;
  if (k < 0 || k > n || n < 0) return 0;
  if (k === 0 || k === n) return 1;
  // Use log-space for large values to avoid overflow
  const logResult = logFactorial(n) - logFactorial(k) - logFactorial(n - k);
  const result = Math.round(Math.exp(logResult));
  return result;
}

/**
 * Permutations P(n, k) = n! / (n-k)!
 * Number of ordered arrangements of k items from n.
 */
export function permutations(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k)) return NaN;
  if (k < 0 || k > n || n < 0) return 0;
  if (k === 0) return 1;
  const logResult = logFactorial(n) - logFactorial(n - k);
  return Math.round(Math.exp(logResult));
}

/**
 * Enumerate all combinations of k items from an array.
 * Returns an array of sub-arrays. Use sparingly for large inputs.
 * Limited to prevent memory issues: returns empty if C(n,k) > 100000.
 */
export function combinations<T>(arr: readonly T[], k: number): T[][] {
  if (k < 0 || k > arr.length) return [];
  if (k === 0) return [[]];
  if (k === arr.length) return [[...arr]];
  if (choose(arr.length, k) > 100000) return []; // guard against explosion
  const result: T[][] = [];
  function backtrack(start: number, current: T[]) {
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
 * Poisson PMF: P(X = k) = e^(-λ) * λ^k / k!
 * Probability of observing k events when the expected rate is λ.
 * Computed in log-space for numerical stability.
 */
export function poissonPmf(k: number, lambda: number): number {
  if (!Number.isInteger(k) || k < 0 || lambda < 0) return 0;
  if (lambda === 0) return k === 0 ? 1 : 0;
  const logP = -lambda + k * Math.log(lambda) - logFactorial(k);
  return Math.exp(logP);
}

/**
 * Poisson CDF: P(X ≤ k) = sum_{i=0}^{k} poissonPmf(i, lambda)
 */
export function poissonCdf(k: number, lambda: number): number {
  if (!Number.isInteger(k) || k < 0 || lambda < 0) return 0;
  let cumulative = 0;
  for (let i = 0; i <= k; i++) {
    cumulative += poissonPmf(i, lambda);
  }
  return Math.min(1, cumulative); // cap at 1 due to floating point
}

/**
 * Poisson distribution: array of PMF values [P(0), P(1), ..., P(maxK)].
 */
export function poissonDistribution(lambda: number, maxK = 20): number[] {
  return Array.from({ length: maxK + 1 }, (_, k) => poissonPmf(k, lambda));
}

/**
 * Binomial PMF: P(X = k | n, p) = C(n,k) * p^k * (1-p)^(n-k)
 * Probability of k successes in n trials each with probability p.
 */
export function binomialPmf(k: number, n: number, p: number): number {
  if (!Number.isInteger(k) || !Number.isInteger(n)) return NaN;
  if (k < 0 || k > n || n < 0 || p < 0 || p > 1) return 0;
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  const logP =
    Math.log(choose(n, k)) + k * Math.log(p) + (n - k) * Math.log(1 - p);
  return Math.exp(logP);
}

/**
 * Binomial CDF: P(X ≤ k | n, p)
 */
export function binomialCdf(k: number, n: number, p: number): number {
  if (!Number.isInteger(n) || n < 0 || k < 0) return 0;
  let cumulative = 0;
  for (let i = 0; i <= Math.min(k, n); i++) {
    cumulative += binomialPmf(i, n, p);
  }
  return Math.min(1, cumulative);
}

/**
 * Negative binomial PMF: P(X = k) given r successes are desired.
 * k = number of failures before the r-th success.
 * P(X=k) = C(k+r-1, k) * p^r * (1-p)^k
 */
export function negativeBinomialPmf(k: number, r: number, p: number): number {
  if (!Number.isInteger(k) || !Number.isInteger(r) || k < 0 || r < 1 || p <= 0 || p > 1) return 0;
  const logP = Math.log(choose(k + r - 1, k)) + r * Math.log(p) + k * Math.log(1 - p);
  return Math.exp(logP);
}

/**
 * Hypergeometric PMF: P(X = k)
 * Draws of size n from population N with K successes, without replacement.
 * P(X=k) = C(K,k) * C(N-K, n-k) / C(N, n)
 */
export function hypergeometricPmf(k: number, N: number, K: number, n: number): number {
  if (!Number.isInteger(k) || !Number.isInteger(N) || !Number.isInteger(K) || !Number.isInteger(n)) return NaN;
  if (k < Math.max(0, n - (N - K)) || k > Math.min(n, K)) return 0;
  const logP =
    Math.log(choose(K, k)) +
    Math.log(choose(N - K, n - k)) -
    Math.log(choose(N, n));
  return Math.exp(logP);
}

/**
 * Multinomial coefficient: n! / (n1! * n2! * ... * nk!)
 * Number of ways to partition n items into groups of sizes n1, n2, ...
 */
export function multinomialCoefficient(counts: readonly number[]): number {
  const n = counts.reduce((a, b) => a + b, 0);
  if (!counts.every(Number.isInteger) || counts.some((c) => c < 0)) return NaN;
  const logResult = logFactorial(n) - counts.reduce((acc, c) => acc + logFactorial(c), 0);
  return Math.round(Math.exp(logResult));
}

/**
 * Dixon-Coles adjustment for Poisson independence assumption.
 * Small τ correction for low-scoring games (1-0, 0-0, 1-1, 0-1 scorelines).
 * Used in soccer/hockey expected-goals models.
 *
 * @param homeGoals  Home team goals scored
 * @param awayGoals  Away team goals scored
 * @param lambdaHome Home expected goals
 * @param lambdaAway Away expected goals
 * @param rho Correlation parameter (typically -0.1 to -0.2)
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

/**
 * Expected value of a bet.
 * EV = prob * (decimalOdds - 1) - (1 - prob)
 *
 * @param winProb   True probability of winning [0,1]
 * @param decimalOdds  Payout odds (e.g. 1.91 for -110)
 */
export function betEv(winProb: number, decimalOdds: number): number {
  return winProb * (decimalOdds - 1) - (1 - winProb);
}

/**
 * Kelly criterion: optimal fraction of bankroll to wager.
 *
 * @param winProb   True probability
 * @param decimalOdds  Payout odds
 * @param fraction  Fractional Kelly (default 0.25 = quarter-Kelly)
 * @returns Fraction of bankroll (0 if negative edge)
 */
export function kellyFraction(winProb: number, decimalOdds: number, fraction = 0.25): number {
  const b = decimalOdds - 1; // net odds
  const q = 1 - winProb;
  const k = (b * winProb - q) / b;
  return Math.max(0, k * fraction);
}

/**
 * Number of ways to have exactly W wins and L losses in W+L games —
 * treating all orderings as distinct (useful for parlay approximations).
 */
export function waysToWinLoss(wins: number, losses: number): number {
  return choose(wins + losses, wins);
}

/**
 * Probability of hitting exactly W wins out of N independent bets,
 * each with win probability p.
 */
export function exactWinProb(wins: number, n: number, p: number): number {
  return binomialPmf(wins, n, p);
}

/**
 * Probability of hitting AT LEAST minWins out of N bets with win prob p.
 * Uses complement: 1 - P(X ≤ minWins - 1).
 */
export function atLeastWinsProb(minWins: number, n: number, p: number): number {
  if (minWins <= 0) return 1;
  return 1 - binomialCdf(minWins - 1, n, p);
}
