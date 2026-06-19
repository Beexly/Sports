/**
 * Number theory utilities for the Galaxy Sports Edge math layer.
 *
 * Pure TypeScript — zero runtime dependencies (Node built-ins only).
 * All functions are individually exported (named exports).
 *
 * Conventions:
 * - Functions operate on safe integers. Non-integer / out-of-range inputs are
 *   guarded sensibly (typically returning a neutral value, NaN, or empty).
 * - `noUncheckedIndexedAccess` is enabled, so every array index read uses a
 *   `?? 0` (or equivalent) fallback.
 *
 * Sections:
 *  1. Divisibility & GCD
 *  2. Primes
 *  3. Modular arithmetic
 *  4. Special numbers
 *  5. Sequences
 *  6. Totient & arithmetic functions
 *  7. Combinatorial (integer)
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** True when n is a finite safe integer. */
function isInt(n: number): boolean {
  return Number.isInteger(n) && Number.isSafeInteger(n);
}

// ===========================================================================
// 1. Divisibility & GCD
// ===========================================================================

/**
 * Greatest common divisor via the Euclidean algorithm (operates on |a|, |b|).
 * gcd(0, 0) = 0; gcd(n, 0) = |n|.
 */
export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

/**
 * Least common multiple. Returns 0 if either argument is 0.
 * Operates on absolute values.
 */
export function lcm(a: number, b: number): number {
  const x = Math.abs(Math.trunc(a));
  const y = Math.abs(Math.trunc(b));
  if (x === 0 || y === 0) return 0;
  return (x / gcd(x, y)) * y;
}

/** GCD of a list. Returns 0 for an empty list. */
export function gcdMany(nums: number[]): number {
  if (nums.length === 0) return 0;
  let result = Math.abs(Math.trunc(nums[0] ?? 0));
  for (let i = 1; i < nums.length; i++) {
    result = gcd(result, nums[i] ?? 0);
    if (result === 1) return 1;
  }
  return result;
}

/** LCM of a list. Returns 0 for an empty list or if any element is 0. */
export function lcmMany(nums: number[]): number {
  if (nums.length === 0) return 0;
  let result = Math.abs(Math.trunc(nums[0] ?? 0));
  for (let i = 1; i < nums.length; i++) {
    result = lcm(result, nums[i] ?? 0);
    if (result === 0) return 0;
  }
  return result;
}

/**
 * True when a divides b (a | b), i.e. b is an integer multiple of a.
 * Every integer divides 0; only 0 "divides" 0 in this convention.
 */
export function divides(a: number, b: number): boolean {
  const x = Math.trunc(a);
  const y = Math.trunc(b);
  if (x === 0) return y === 0;
  return y % x === 0;
}

/**
 * Sorted-ascending list of positive divisors of n.
 * Returns an empty array for n <= 0 or non-integer n.
 */
export function divisors(n: number): number[] {
  const m = Math.trunc(n);
  if (!isInt(m) || m <= 0) return [];
  const small: number[] = [];
  const large: number[] = [];
  for (let i = 1; i * i <= m; i++) {
    if (m % i === 0) {
      small.push(i);
      const pair = m / i;
      if (pair !== i) large.push(pair);
    }
  }
  large.reverse();
  return small.concat(large);
}

/** Number of positive divisors of n (0 for n <= 0). */
export function divisorCount(n: number): number {
  const m = Math.trunc(n);
  if (!isInt(m) || m <= 0) return 0;
  const factors = primeFactorization(m);
  let count = 1;
  for (const exp of factors.values()) {
    count *= exp + 1;
  }
  return count;
}

/** Sum of positive divisors of n (0 for n <= 0). */
export function divisorSum(n: number): number {
  const m = Math.trunc(n);
  if (!isInt(m) || m <= 0) return 0;
  const factors = primeFactorization(m);
  let sum = 1;
  for (const [prime, exp] of factors) {
    // (p^(e+1) - 1) / (p - 1)
    sum *= (Math.pow(prime, exp + 1) - 1) / (prime - 1);
  }
  return sum;
}

// ===========================================================================
// 2. Primes
// ===========================================================================

/** Primality test (trial division with 6k±1 wheel). */
export function isPrime(n: number): boolean {
  if (!isInt(n)) return false;
  const m = n;
  if (m < 2) return false;
  if (m === 2 || m === 3) return true;
  if (m % 2 === 0 || m % 3 === 0) return false;
  for (let i = 5; i * i <= m; i += 6) {
    if (m % i === 0 || m % (i + 2) === 0) return false;
  }
  return true;
}

/** Sieve of Eratosthenes — all primes <= n. Empty for n < 2. */
export function primesUpTo(n: number): number[] {
  const m = Math.trunc(n);
  if (!isInt(m) || m < 2) return [];
  const sieve: boolean[] = new Array<boolean>(m + 1).fill(true);
  sieve[0] = false;
  sieve[1] = false;
  for (let i = 2; i * i <= m; i++) {
    if (sieve[i] ?? false) {
      for (let j = i * i; j <= m; j += i) {
        sieve[j] = false;
      }
    }
  }
  const primes: number[] = [];
  for (let i = 2; i <= m; i++) {
    if (sieve[i] ?? false) primes.push(i);
  }
  return primes;
}

/** The n-th prime (1-indexed). Returns 0 for n <= 0. */
export function nthPrime(n: number): number {
  const k = Math.trunc(n);
  if (!isInt(k) || k <= 0) return 0;
  let count = 0;
  let candidate = 1;
  while (count < k) {
    candidate++;
    if (isPrime(candidate)) count++;
  }
  return candidate;
}

/**
 * Prime factorization as a Map<prime, exponent>.
 * Empty map for n <= 1.
 */
export function primeFactorization(n: number): Map<number, number> {
  const factors = new Map<number, number>();
  let m = Math.trunc(n);
  if (!isInt(m) || m <= 1) return factors;
  for (let d = 2; d * d <= m; d++) {
    while (m % d === 0) {
      factors.set(d, (factors.get(d) ?? 0) + 1);
      m /= d;
    }
  }
  if (m > 1) {
    factors.set(m, (factors.get(m) ?? 0) + 1);
  }
  return factors;
}

/** Distinct prime factors, sorted ascending. Empty for n <= 1. */
export function primeFactors(n: number): number[] {
  return Array.from(primeFactorization(n).keys()).sort((a, b) => a - b);
}

/** Smallest prime strictly greater than n. */
export function nextPrime(n: number): number {
  let candidate = Math.trunc(n);
  if (!isInt(candidate)) candidate = Math.ceil(n);
  if (candidate < 2) return 2;
  candidate += 1;
  while (!isPrime(candidate)) candidate++;
  return candidate;
}

/** True when gcd(a, b) === 1. */
export function isCoprime(a: number, b: number): boolean {
  return gcd(a, b) === 1;
}

// ===========================================================================
// 3. Modular arithmetic
// ===========================================================================

/**
 * Mathematical modulo — always returns a non-negative result in [0, |m|).
 * Throws RangeError when m === 0.
 */
export function mod(a: number, m: number): number {
  const x = Math.trunc(a);
  const y = Math.trunc(m);
  if (y === 0) {
    throw new RangeError("mod: modulus must be non-zero");
  }
  const abs = Math.abs(y);
  return ((x % abs) + abs) % abs;
}

/**
 * Modular exponentiation (base^exp mod m) via fast (binary) exponentiation.
 * Requires exp >= 0. Result is normalized to [0, |m|).
 * m === 1 yields 0. Throws RangeError when m === 0 or exp < 0.
 */
export function modPow(base: number, exp: number, m: number): number {
  let e = Math.trunc(exp);
  const mm = Math.abs(Math.trunc(m));
  if (mm === 0) {
    throw new RangeError("modPow: modulus must be non-zero");
  }
  if (e < 0) {
    throw new RangeError("modPow: exponent must be non-negative");
  }
  if (mm === 1) return 0;
  let result = 1;
  let b = mod(base, mm);
  while (e > 0) {
    if (e % 2 === 1) {
      result = (result * b) % mm;
    }
    e = Math.floor(e / 2);
    b = (b * b) % mm;
  }
  return result;
}

/**
 * Extended Euclidean algorithm.
 * Returns { gcd, x, y } such that a*x + b*y = gcd(a, b).
 */
export function extendedGcd(
  a: number,
  b: number,
): { gcd: number; x: number; y: number } {
  let old_r = Math.trunc(a);
  let r = Math.trunc(b);
  let old_s = 1;
  let s = 0;
  let old_t = 0;
  let t = 1;
  while (r !== 0) {
    const q = Math.floor(old_r / r);
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
    [old_t, t] = [t, old_t - q * t];
  }
  if (old_r < 0) {
    // Normalize so gcd is non-negative; flip coefficients accordingly.
    return { gcd: -old_r, x: -old_s, y: -old_t };
  }
  return { gcd: old_r, x: old_s, y: old_t };
}

/**
 * Modular multiplicative inverse of a modulo m.
 * Returns NaN when no inverse exists (gcd(a, m) !== 1) or m <= 0.
 * Result is normalized to [0, m).
 */
export function modInverse(a: number, m: number): number {
  const mm = Math.trunc(m);
  if (!isInt(mm) || mm <= 0) return NaN;
  if (mm === 1) return 0;
  const { gcd: g, x } = extendedGcd(mod(a, mm), mm);
  if (g !== 1) return NaN;
  return ((x % mm) + mm) % mm;
}

/**
 * Chinese Remainder Theorem.
 * Solves x ≡ remainders[i] (mod moduli[i]) for pairwise-coprime moduli.
 * Returns the unique solution in [0, product of moduli).
 * Returns NaN on length mismatch, empty input, non-positive modulus,
 * or non-coprime moduli.
 */
export function crt(remainders: number[], moduli: number[]): number {
  if (remainders.length !== moduli.length || remainders.length === 0) {
    return NaN;
  }
  let prod = 1;
  for (let i = 0; i < moduli.length; i++) {
    const mi = Math.trunc(moduli[i] ?? 0);
    if (!isInt(mi) || mi <= 0) return NaN;
    prod *= mi;
  }
  let result = 0;
  for (let i = 0; i < moduli.length; i++) {
    const mi = Math.trunc(moduli[i] ?? 0);
    const ri = Math.trunc(remainders[i] ?? 0);
    const partial = prod / mi;
    const inv = modInverse(partial, mi);
    if (Number.isNaN(inv)) return NaN; // not coprime
    result = (result + ((ri * partial) % prod) * inv) % prod;
  }
  return ((result % prod) + prod) % prod;
}

// ===========================================================================
// 4. Special numbers
// ===========================================================================

/** Sum of proper divisors (divisors excluding n itself). 0 for n <= 0. */
function properDivisorSum(n: number): number {
  const m = Math.trunc(n);
  if (!isInt(m) || m <= 0) return 0;
  return divisorSum(m) - m;
}

/** A perfect number equals the sum of its proper divisors (e.g. 6, 28). */
export function isPerfect(n: number): boolean {
  const m = Math.trunc(n);
  if (!isInt(m) || m <= 1) return false;
  return properDivisorSum(m) === m;
}

/** Abundant: proper-divisor sum exceeds n (e.g. 12). */
export function isAbundant(n: number): boolean {
  const m = Math.trunc(n);
  if (!isInt(m) || m <= 0) return false;
  return properDivisorSum(m) > m;
}

/** Deficient: proper-divisor sum is less than n (e.g. 1, primes). */
export function isDeficient(n: number): boolean {
  const m = Math.trunc(n);
  if (!isInt(m) || m <= 0) return false;
  return properDivisorSum(m) < m;
}

/** True when n is a perfect square (0 and 1 included; negatives false). */
export function isPerfectSquare(n: number): boolean {
  const m = Math.trunc(n);
  if (!isInt(m) || m < 0) return false;
  const r = Math.round(Math.sqrt(m));
  return r * r === m;
}

/**
 * True when n = a^b for integers a >= 1, b >= 2.
 * 0 and 1 are treated as perfect powers (1 = 1^2, 0 = 0^2).
 */
export function isPerfectPower(n: number): boolean {
  const m = Math.trunc(n);
  if (!isInt(m) || m < 0) return false;
  if (m === 0 || m === 1) return true;
  const maxExp = Math.floor(Math.log2(m)) + 1;
  for (let b = 2; b <= maxExp; b++) {
    const base = Math.round(Math.pow(m, 1 / b));
    for (const candidate of [base - 1, base, base + 1]) {
      if (candidate >= 2 && Math.pow(candidate, b) === m) {
        return true;
      }
    }
  }
  return false;
}

/** True when the base-10 digits of |n| read the same forwards and backwards. */
export function isPalindromeNumber(n: number): boolean {
  const m = Math.abs(Math.trunc(n));
  if (!isInt(m)) return false;
  const s = String(m);
  for (let i = 0, j = s.length - 1; i < j; i++, j--) {
    if ((s[i] ?? "") !== (s[j] ?? "")) return false;
  }
  return true;
}

/**
 * Armstrong (narcissistic) number: equals the sum of its own digits each
 * raised to the power of the number of digits (e.g. 153 = 1^3 + 5^3 + 3^3).
 */
export function isArmstrong(n: number): boolean {
  const m = Math.trunc(n);
  if (!isInt(m) || m < 0) return false;
  const s = String(m);
  const power = s.length;
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    const digit = (s.charCodeAt(i) ?? 48) - 48;
    sum += Math.pow(digit, power);
  }
  return sum === m;
}

// ===========================================================================
// 5. Sequences
// ===========================================================================

/** Fibonacci number F(n) (0-indexed: F(0)=0, F(1)=1). Returns 0 for n < 0. */
export function fibonacci(n: number): number {
  const k = Math.trunc(n);
  if (!isInt(k) || k < 0) return 0;
  if (k === 0) return 0;
  let prev = 0;
  let curr = 1;
  for (let i = 2; i <= k; i++) {
    const next = prev + curr;
    prev = curr;
    curr = next;
  }
  return curr;
}

/** First `count` Fibonacci numbers, starting at F(0)=0. Empty for count <= 0. */
export function fibonacciSequence(count: number): number[] {
  const c = Math.trunc(count);
  if (!isInt(c) || c <= 0) return [];
  const seq: number[] = [];
  let prev = 0;
  let curr = 1;
  for (let i = 0; i < c; i++) {
    seq.push(prev);
    const next = prev + curr;
    prev = curr;
    curr = next;
  }
  return seq;
}

/** Factorial n! (1 for n=0). Returns NaN for n < 0 or non-integer n. */
export function factorial(n: number): number {
  const k = Math.trunc(n);
  if (!isInt(k) || k < 0 || k !== n) return NaN;
  let result = 1;
  for (let i = 2; i <= k; i++) {
    result *= i;
  }
  return result;
}

/** n-th triangular number = n(n+1)/2. Returns 0 for n <= 0. */
export function triangularNumber(n: number): number {
  const k = Math.trunc(n);
  if (!isInt(k) || k <= 0) return 0;
  return (k * (k + 1)) / 2;
}

/** n-th Catalan number C(n) = (2n)! / ((n+1)! n!). Returns 0 for n < 0. */
export function catalanNumber(n: number): number {
  const k = Math.trunc(n);
  if (!isInt(k) || k < 0) return 0;
  // Iterative product form avoids large intermediate factorials.
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * 2 * (2 * i + 1)) / (i + 2);
  }
  return Math.round(result);
}

/** Number of Collatz steps to reach 1. Returns 0 for n <= 1. */
export function collatzSteps(n: number): number {
  let m = Math.trunc(n);
  if (!isInt(m) || m <= 1) return 0;
  let steps = 0;
  while (m !== 1) {
    m = m % 2 === 0 ? m / 2 : 3 * m + 1;
    steps++;
  }
  return steps;
}

// ===========================================================================
// 6. Totient & arithmetic functions
// ===========================================================================

/** Euler's totient φ(n): count of integers in [1, n] coprime to n. 0 for n<=0. */
export function eulerTotient(n: number): number {
  const m = Math.trunc(n);
  if (!isInt(m) || m <= 0) return 0;
  if (m === 1) return 1;
  let result = m;
  for (const prime of primeFactorization(m).keys()) {
    result -= result / prime;
  }
  return Math.round(result);
}

/**
 * Möbius function μ(n):
 *  - μ(1) = 1
 *  - 0 if n has a squared prime factor
 *  - (-1)^k where k is the number of distinct prime factors (squarefree)
 * Returns 0 for n <= 0.
 */
export function mobius(n: number): number {
  const m = Math.trunc(n);
  if (!isInt(m) || m <= 0) return 0;
  if (m === 1) return 1;
  const factors = primeFactorization(m);
  for (const exp of factors.values()) {
    if (exp > 1) return 0;
  }
  return factors.size % 2 === 0 ? 1 : -1;
}

/** Sum of base-10 digits of |n|. */
export function digitSum(n: number): number {
  const m = Math.abs(Math.trunc(n));
  if (!isInt(m)) return 0;
  const s = String(m);
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    sum += (s.charCodeAt(i) ?? 48) - 48;
  }
  return sum;
}

/** Digital root of |n| (repeated digit sum down to a single digit). */
export function digitalRoot(n: number): number {
  const m = Math.abs(Math.trunc(n));
  if (!isInt(m)) return 0;
  if (m === 0) return 0;
  return 1 + ((m - 1) % 9);
}

/** Number of base-10 digits of |n| (0 has 1 digit). */
export function numberOfDigits(n: number): number {
  const m = Math.abs(Math.trunc(n));
  if (!isInt(m)) return 0;
  return String(m).length;
}

// ===========================================================================
// 7. Combinatorial (integer)
// ===========================================================================

/**
 * Binomial coefficient C(n, k) = n! / (k!(n-k)!).
 * Returns 0 when k < 0 or k > n. Computed multiplicatively to limit overflow.
 */
export function binomial(n: number, k: number): number {
  const nn = Math.trunc(n);
  let kk = Math.trunc(k);
  if (!isInt(nn) || !isInt(kk) || nn < 0) return 0;
  if (kk < 0 || kk > nn) return 0;
  if (kk > nn - kk) kk = nn - kk; // symmetry
  let result = 1;
  for (let i = 1; i <= kk; i++) {
    result = (result * (nn - kk + i)) / i;
  }
  return Math.round(result);
}

/**
 * Number of k-permutations of n: nPk = n! / (n-k)!.
 * Returns 0 when k < 0 or k > n.
 */
export function permutations(n: number, k: number): number {
  const nn = Math.trunc(n);
  const kk = Math.trunc(k);
  if (!isInt(nn) || !isInt(kk) || nn < 0) return 0;
  if (kk < 0 || kk > nn) return 0;
  let result = 1;
  for (let i = 0; i < kk; i++) {
    result *= nn - i;
  }
  return result;
}

/**
 * Number of integer partitions of n (unordered sums of positive integers).
 * p(0) = 1; returns 0 for n < 0. Dynamic-programming coin-change style.
 */
export function partitions(n: number): number {
  const m = Math.trunc(n);
  if (!isInt(m) || m < 0) return 0;
  if (m === 0) return 1;
  const dp: number[] = new Array<number>(m + 1).fill(0);
  dp[0] = 1;
  for (let part = 1; part <= m; part++) {
    for (let total = part; total <= m; total++) {
      dp[total] = (dp[total] ?? 0) + (dp[total - part] ?? 0);
    }
  }
  return dp[m] ?? 0;
}

/**
 * n-th Bell number: the number of partitions of a set of n elements.
 * B(0) = 1; returns 0 for n < 0. Computed via the Bell triangle.
 */
export function bellNumber(n: number): number {
  const m = Math.trunc(n);
  if (!isInt(m) || m < 0) return 0;
  if (m === 0) return 1;
  let row: number[] = [1];
  for (let i = 1; i <= m; i++) {
    const next: number[] = [row[row.length - 1] ?? 0];
    for (let j = 0; j < row.length; j++) {
      next.push((next[j] ?? 0) + (row[j] ?? 0));
    }
    row = next;
  }
  return row[0] ?? 0;
}
