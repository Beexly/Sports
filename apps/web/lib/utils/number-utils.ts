/**
 * number-utils.ts — Pure TypeScript number utilities for Galaxy Sports Edge.
 *
 * No external dependencies. No `any`. Covers:
 *   - Rounding & precision
 *   - Formatting
 *   - Number checks
 *   - Math utilities
 *   - Finance / odds math
 *   - Unit conversions
 *   - Range / sequence
 *   - Bit utilities
 */

// ---------------------------------------------------------------------------
// Rounding & precision
// ---------------------------------------------------------------------------

/**
 * Banker's rounding (round-half-to-even).
 * Ties (e.g. 2.5) round to the nearest even integer at the given decimal.
 */
export function round(n: number, decimals = 0): number {
  if (!isFinite(n)) return n;
  const factor = Math.pow(10, decimals);
  const shifted = n * factor;
  const floor = Math.floor(shifted);
  const diff = shifted - floor;

  // Not a tie — use normal rounding
  if (Math.abs(diff - 0.5) > Number.EPSILON) {
    return Math.round(shifted) / factor;
  }

  // Tie: round to even
  return (floor % 2 === 0 ? floor : floor + 1) / factor;
}

/** Round up (ceiling) to the given number of decimals. */
export function roundUp(n: number, decimals = 0): number {
  if (!isFinite(n)) return n;
  const factor = Math.pow(10, decimals);
  return Math.ceil(n * factor) / factor;
}

/** Round down (floor) to the given number of decimals. */
export function roundDown(n: number, decimals = 0): number {
  if (!isFinite(n)) return n;
  const factor = Math.pow(10, decimals);
  return Math.floor(n * factor) / factor;
}

/** Round n to the nearest multiple of `multiple`. */
export function roundToNearest(n: number, multiple: number): number {
  if (multiple === 0) return n;
  return Math.round(n / multiple) * multiple;
}

/** Truncate (toward zero) to the given number of decimals. */
export function truncate(n: number, decimals = 0): number {
  if (!isFinite(n)) return n;
  const factor = Math.pow(10, decimals);
  return Math.trunc(n * factor) / factor;
}

/** Clamp n to [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/** Snap n to the nearest value in the provided array. Returns n if array is empty. */
export function snap(n: number, values: number[]): number {
  if (values.length === 0) return n;
  return values.reduce((closest, v) =>
    Math.abs(v - n) < Math.abs(closest - n) ? v : closest,
  );
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Format a number with commas as thousands separators.
 *  e.g. 1234567.89 → "1,234,567.89"
 */
export function formatWithCommas(n: number, decimals?: number): string {
  const fixed =
    decimals !== undefined ? Math.abs(n).toFixed(decimals) : String(Math.abs(n));
  const [intPart, decPart] = fixed.split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const result = decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
  return n < 0 ? `-${result}` : result;
}

/** Compact format: 1234567 → "1.2M"; 12345 → "12.3K"; 1000000000 → "1.0B". */
export function formatCompact(n: number, decimals = 1): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(decimals)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(decimals)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(decimals)}K`;
  }
  return `${sign}${abs.toFixed(decimals).replace(/\.0+$/, "") || String(abs)}`;
}

/** Format as currency using Intl.NumberFormat. */
export function formatCurrency(
  n: number,
  currency = "USD",
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(n);
}

/** Format as percentage: 0.1234 → "12.3%". */
export function formatPercent(n: number, decimals = 1): string {
  return `${(n * 100).toFixed(decimals)}%`;
}

/** Format bytes in human-readable form: 1024 → "1.0 KB"; 1048576 → "1.0 MB". */
export function formatBytes(bytes: number, decimals = 1): string {
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let value = Math.abs(bytes);
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  const sign = bytes < 0 ? "-" : "";
  const formatted = unitIndex === 0 ? String(Math.floor(value)) : value.toFixed(decimals);
  return `${sign}${formatted} ${units[unitIndex]}`;
}

/** Format duration in ms: 90000 → "1m 30s"; 3600000 → "1h 0m". */
export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/** Format American odds with explicit sign: -110 → "-110"; +150 → "+150". */
export function formatOdds(americanOdds: number): string {
  return americanOdds >= 0 ? `+${americanOdds}` : `${americanOdds}`;
}

/** Convert integer to ordinal string: 1 → "1st", 11 → "11th", 21 → "21st". */
export function toOrdinal(n: number): string {
  const abs = Math.abs(n);
  const mod100 = abs % 100;
  const mod10 = abs % 10;

  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
}

/** Scientific notation: 0.001234 → "1.23e-3". */
export function scientificNotation(n: number, sig = 3): string {
  if (!isFinite(n)) return String(n);
  return n.toExponential(sig - 1);
}

// ---------------------------------------------------------------------------
// Number checks
// ---------------------------------------------------------------------------

/** Returns true if n is an integer (no fractional part). */
export function isInteger(n: number): boolean {
  return Number.isInteger(n);
}

/** Returns true if n is finite and not NaN. */
export function isFiniteNumber(n: number): boolean {
  return isFinite(n) && !isNaN(n);
}

/** Returns true if n > 0. */
export function isPositive(n: number): boolean {
  return n > 0;
}

/** Returns true if n < 0. */
export function isNegative(n: number): boolean {
  return n < 0;
}

/** Returns true if n is even. */
export function isEven(n: number): boolean {
  return Number.isInteger(n) && n % 2 === 0;
}

/** Returns true if n is odd. */
export function isOdd(n: number): boolean {
  return Number.isInteger(n) && Math.abs(n % 2) === 1;
}

/** Returns true if n is a prime number (n >= 2). */
export function isPrime(n: number): boolean {
  if (!Number.isInteger(n) || n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i <= Math.sqrt(n); i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

/** Check if n is between min and max. Inclusive by default. */
export function isBetween(
  n: number,
  min: number,
  max: number,
  inclusive = true,
): boolean {
  return inclusive ? n >= min && n <= max : n > min && n < max;
}

// ---------------------------------------------------------------------------
// Math utilities
// ---------------------------------------------------------------------------

/** Sum of values array. Returns 0 for empty array. */
export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

/** Product of values array. Returns 1 for empty array. */
export function product(values: number[]): number {
  return values.reduce((acc, v) => acc * v, 1);
}

/** Arithmetic mean. Returns NaN for empty array. */
export function average(values: number[]): number {
  if (values.length === 0) return NaN;
  return sum(values) / values.length;
}

/** Geometric mean: exp(mean(log(v))). Returns 0 if any value is non-positive. */
export function geometricMean(values: number[]): number {
  if (values.length === 0) return NaN;
  if (values.some((v) => v <= 0)) return 0;
  const logSum = values.reduce((acc, v) => acc + Math.log(v), 0);
  return Math.exp(logSum / values.length);
}

/** Harmonic mean: n / sum(1/v). Returns 0 if any value is zero. */
export function harmonicMean(values: number[]): number {
  if (values.length === 0) return NaN;
  if (values.some((v) => v === 0)) return 0;
  const reciprocalSum = values.reduce((acc, v) => acc + 1 / v, 0);
  return values.length / reciprocalSum;
}

/** Weighted sum: sum(values[i] * weights[i]). */
export function weightedSum(values: number[], weights: number[]): number {
  const len = Math.min(values.length, weights.length);
  let total = 0;
  for (let i = 0; i < len; i++) {
    total += (values[i] ?? 0) * (weights[i] ?? 0);
  }
  return total;
}

/** Safe division. Returns fallback (default 0) when b === 0. */
export function safeDiv(a: number, b: number, fallback = 0): number {
  if (b === 0) return fallback;
  return a / b;
}

/** Safe square root. Returns 0 for negative values. */
export function safeSqrt(n: number): number {
  if (n < 0) return 0;
  return Math.sqrt(n);
}

/** Safe logarithm. Returns -Infinity if n <= 0. Defaults to natural log (base e). */
export function safeLog(n: number, base?: number): number {
  if (n <= 0) return -Infinity;
  if (base === undefined) return Math.log(n);
  if (base <= 0 || base === 1) return NaN;
  return Math.log(n) / Math.log(base);
}

/** Linear interpolation: find y at x given two points (x0,y0) and (x1,y1). */
export function linearInterpolate(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x: number,
): number {
  if (x1 === x0) return y0;
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
}

/**
 * Normalize values to [0,1].
 * If all values are identical, returns array of 0.5.
 * Optionally supply explicit min/max.
 */
export function normalize(
  values: number[],
  min?: number,
  max?: number,
): number[] {
  if (values.length === 0) return [];
  const lo = min !== undefined ? min : Math.min(...values);
  const hi = max !== undefined ? max : Math.max(...values);
  if (lo === hi) return values.map(() => 0.5);
  return values.map((v) => (v - lo) / (hi - lo));
}

/** Denormalize values from [0,1] back to [min, max]. */
export function denormalize(
  normalizedValues: number[],
  min: number,
  max: number,
): number[] {
  return normalizedValues.map((v) => v * (max - min) + min);
}

// ---------------------------------------------------------------------------
// Finance / odds math
// ---------------------------------------------------------------------------

/**
 * Convert American odds to decimal odds.
 * Positive: (american / 100) + 1
 * Negative: (100 / |american|) + 1
 */
export function americanToDecimal(american: number): number {
  if (american >= 0) {
    return american / 100 + 1;
  }
  return 100 / Math.abs(american) + 1;
}

/**
 * Convert decimal odds to American odds.
 * decimal >= 2: (decimal - 1) * 100
 * decimal < 2:  -100 / (decimal - 1)
 */
export function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) {
    return (decimal - 1) * 100;
  }
  return -100 / (decimal - 1);
}

/**
 * Implied probability from American odds (no vig removed).
 * Positive: 100 / (american + 100)
 * Negative: |american| / (|american| + 100)
 */
export function impliedProbability(americanOdds: number): number {
  if (americanOdds >= 0) {
    return 100 / (americanOdds + 100);
  }
  const abs = Math.abs(americanOdds);
  return abs / (abs + 100);
}

/**
 * Vig percentage from home and away American odds.
 * vig% = (homeImplied + awayImplied - 1) * 100
 */
export function vigFromOdds(homeOdds: number, awayOdds: number): number {
  return (impliedProbability(homeOdds) + impliedProbability(awayOdds) - 1) * 100;
}

/**
 * Remove vig to get fair (no-vig) probabilities and fair American odds.
 * Fair probs sum to 1.
 */
export function removeVig(
  homeOdds: number,
  awayOdds: number,
): {
  homeProb: number;
  awayProb: number;
  homeFair: number;
  awayFair: number;
} {
  const homeImplied = impliedProbability(homeOdds);
  const awayImplied = impliedProbability(awayOdds);
  const total = homeImplied + awayImplied;

  const homeProb = homeImplied / total;
  const awayProb = awayImplied / total;

  // Convert fair probs to American odds
  const probToAmerican = (p: number): number => {
    if (p >= 0.5) {
      return -(p / (1 - p)) * 100;
    }
    return ((1 - p) / p) * 100;
  };

  return {
    homeProb,
    awayProb,
    homeFair: probToAmerican(homeProb),
    awayFair: probToAmerican(awayProb),
  };
}

/** Pareto score: value / threshold. > 1 means exceeds threshold. */
export function paretoScore(value: number, threshold: number): number {
  if (threshold === 0) return 0;
  return value / threshold;
}

/** Compound growth: initial * (1 + rate)^periods. */
export function compoundGrowth(
  initial: number,
  rate: number,
  periods: number,
): number {
  return initial * Math.pow(1 + rate, periods);
}

/** Present value: futureValue / (1 + rate)^periods. */
export function presentValue(
  futureValue: number,
  rate: number,
  periods: number,
): number {
  return futureValue / Math.pow(1 + rate, periods);
}

/** Return on investment: (gain - cost) / cost * 100. */
export function roi(gain: number, cost: number): number {
  if (cost === 0) return 0;
  return ((gain - cost) / cost) * 100;
}

// ---------------------------------------------------------------------------
// Unit conversions
// ---------------------------------------------------------------------------

export function yardsToFeet(yards: number): number {
  return yards * 3;
}

export function feetToYards(feet: number): number {
  return feet / 3;
}

export function metersToYards(meters: number): number {
  return meters * 1.09361;
}

export function yardsToMeters(yards: number): number {
  return yards / 1.09361;
}

export function mphToKph(mph: number): number {
  return mph * 1.60934;
}

export function kphToMph(kph: number): number {
  return kph / 1.60934;
}

export function poundsToKg(lbs: number): number {
  return lbs * 0.453592;
}

export function kgToPounds(kg: number): number {
  return kg / 0.453592;
}

export function inchesToCm(inches: number): number {
  return inches * 2.54;
}

export function cmToInches(cm: number): number {
  return cm / 2.54;
}

export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

// ---------------------------------------------------------------------------
// Range / sequence
// ---------------------------------------------------------------------------

/**
 * Generate range [start, end) with optional step.
 * Negative step is supported.
 */
export function range(start: number, end: number, step = 1): number[] {
  if (step === 0) return [];
  const result: number[] = [];
  if (step > 0) {
    for (let i = start; i < end; i += step) result.push(i);
  } else {
    for (let i = start; i > end; i += step) result.push(i);
  }
  return result;
}

/** n evenly spaced points from start to end, inclusive. */
export function linspace(start: number, end: number, n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [start];
  const step = (end - start) / (n - 1);
  return Array.from({ length: n }, (_, i) => start + i * step);
}

/** n logarithmically spaced points from 10^start to 10^end, inclusive. */
export function logspace(start: number, end: number, n: number): number[] {
  return linspace(start, end, n).map((v) => Math.pow(10, v));
}

/** Cumulative sum. */
export function cumsum(values: number[]): number[] {
  const result: number[] = [];
  let acc = 0;
  for (const v of values) {
    acc += v;
    result.push(acc);
  }
  return result;
}

/** Cumulative product. */
export function cumprod(values: number[]): number[] {
  const result: number[] = [];
  let acc = 1;
  for (const v of values) {
    acc *= v;
    result.push(acc);
  }
  return result;
}

/** First differences: diff[i] = values[i+1] - values[i]. */
export function diff(values: number[]): number[] {
  const result: number[] = [];
  for (let i = 1; i < values.length; i++) {
    result.push((values[i] ?? 0) - (values[i - 1] ?? 0));
  }
  return result;
}

/** Moving sum over a sliding window of given size. */
export function movingSum(values: number[], window: number): number[] {
  if (window <= 0 || values.length === 0) return [];
  const result: number[] = [];
  for (let i = 0; i <= values.length - window; i++) {
    result.push(sum(values.slice(i, i + window)));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Bit utilities
// ---------------------------------------------------------------------------

/** Count set bits (population count / Hamming weight) in a non-negative integer. */
export function countBits(n: number): number {
  let count = 0;
  let val = Math.abs(Math.floor(n));
  while (val > 0) {
    count += val & 1;
    val >>>= 1;
  }
  return count;
}

/** Returns true if n is a positive power of two. */
export function isPowerOfTwo(n: number): boolean {
  if (!Number.isInteger(n) || n <= 0) return false;
  return (n & (n - 1)) === 0;
}

/** Returns the smallest power of two >= n. */
export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/** Greatest common divisor (Euclidean algorithm). */
export function gcd(a: number, b: number): number {
  a = Math.abs(Math.floor(a));
  b = Math.abs(Math.floor(b));
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

/** Least common multiple. */
export function lcm(a: number, b: number): number {
  const g = gcd(a, b);
  if (g === 0) return 0;
  return Math.abs(Math.floor(a) * Math.floor(b)) / g;
}
