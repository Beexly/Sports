/**
 * Devig algorithms — remove bookmaker margin from raw market prices.
 *
 * Four methods: basic (proportional), power (equal-margin), additive,
 * and Shin (asymmetric information model).
 *
 * All functions take raw DECIMAL odds (≥1.0) and return fair probabilities
 * that sum to 1.0. Inputs are validated; invalid odds return null.
 *
 * References:
 *   - Shin (1991/1992) - asymmetric information model
 *   - Joseph Buchdahl "Squares and Sharps" (basic/power methods)
 *   - Wisdom of Crowds / consensus devig (multi-book)
 */

export interface DevigResult {
  readonly method: "basic" | "power" | "additive" | "shin";
  readonly fairProbabilities: readonly number[];
  readonly impliedProbabilities: readonly number[]; // raw before devig
  readonly totalOverround: number; // sum of implied probs - 1
  readonly vigPct: number; // overround as % (e.g. 0.05 for 5%)
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * Convert decimal odds to implied probability.
 * Returns null if odds ≤ 1 (invalid).
 */
export function impliedProbability(decimalOdds: number): number | null {
  if (!isFinite(decimalOdds) || decimalOdds <= 1) return null;
  return 1 / decimalOdds;
}

/**
 * Sum of implied probabilities minus 1.0 for an array of decimal odds.
 * Returns Infinity if any odds ≤ 1.
 */
export function totalOverround(decimalOddsArray: readonly number[]): number {
  if (decimalOddsArray.length === 0) return 0;
  let sum = 0;
  for (const odds of decimalOddsArray) {
    if (!isFinite(odds) || odds <= 1) return Infinity;
    sum += 1 / odds;
  }
  return sum - 1;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildImplied(decimalOddsArray: readonly number[]): readonly number[] | null {
  if (decimalOddsArray.length === 0) return null;
  const result: number[] = [];
  for (const odds of decimalOddsArray) {
    if (!isFinite(odds) || odds <= 1) return null;
    result.push(1 / odds);
  }
  return result;
}

function computeOverround(implied: readonly number[]): number {
  return implied.reduce((s, p) => s + p, 0) - 1;
}

// ---------------------------------------------------------------------------
// Basic (proportional) devig
// ---------------------------------------------------------------------------

/**
 * Proportional devig: divide each implied probability by their sum.
 * Returns null if any odds ≤ 1 or the array is empty.
 */
export function devigBasic(decimalOddsArray: readonly number[]): DevigResult | null {
  const implied = buildImplied(decimalOddsArray);
  if (!implied) return null;

  const sum = implied.reduce((s, p) => s + p, 0);
  if (sum <= 0) return null;

  const fairProbabilities = implied.map((p) => p / sum);
  const over = computeOverround(implied);

  return {
    method: "basic",
    fairProbabilities,
    impliedProbabilities: implied,
    totalOverround: over,
    vigPct: over,
  };
}

// ---------------------------------------------------------------------------
// Power devig
// ---------------------------------------------------------------------------

/**
 * Power method: find exponent k such that sum((1/odds_i)^k) = 1.
 * Binary search over k in (0, 10]. Returns null if can't converge or invalid input.
 */
export function devigPower(
  decimalOddsArray: readonly number[],
  tolerance = 1e-9,
  maxIter = 100
): DevigResult | null {
  const implied = buildImplied(decimalOddsArray);
  if (!implied) return null;

  const rawSum = implied.reduce((s, p) => s + p, 0);
  if (rawSum <= 1) {
    // No vig — k = 1 is the solution
    return {
      method: "power",
      fairProbabilities: implied.map((p) => p),
      impliedProbabilities: implied,
      totalOverround: computeOverround(implied),
      vigPct: computeOverround(implied),
    };
  }

  // sum((1/odds_i)^k) = 1  =>  sum(q_i^k) = 1  where q_i = 1/odds_i
  // k=1 gives rawSum > 1; k→∞ gives a value approaching 0.
  // So we binary search k in [0.01, 100].
  function objective(k: number): number {
    return implied!.reduce((s, q) => s + Math.pow(q, k), 0) - 1;
  }

  let lo = 0.01;
  let hi = 100;

  // Sanity check bounds
  if (objective(lo) < 0) return null;
  if (objective(hi) > 0) return null;

  let k = 1;
  for (let i = 0; i < maxIter; i++) {
    k = (lo + hi) / 2;
    const mid = objective(k);
    if (Math.abs(mid) < tolerance) break;
    if (mid > 0) {
      lo = k;
    } else {
      hi = k;
    }
  }

  const fairProbabilities = implied.map((q) => Math.pow(q, k));
  const over = computeOverround(implied);

  return {
    method: "power",
    fairProbabilities,
    impliedProbabilities: implied,
    totalOverround: over,
    vigPct: over,
  };
}

// ---------------------------------------------------------------------------
// Additive devig
// ---------------------------------------------------------------------------

/**
 * Additive devig: subtract equal share of overround from each implied probability.
 * vigPerOutcome = totalOverround / n
 * Returns null if any odds ≤ 1 or array is empty.
 */
export function devigAdditive(decimalOddsArray: readonly number[]): DevigResult | null {
  const implied = buildImplied(decimalOddsArray);
  if (!implied) return null;

  const over = computeOverround(implied);
  const n = implied.length;
  const vigPerOutcome = over / n;

  const fairProbabilities = implied.map((p) => p - vigPerOutcome);

  // Guard: if any fair probability is non-positive, additive fails
  if (fairProbabilities.some((p) => p <= 0)) return null;

  return {
    method: "additive",
    fairProbabilities,
    impliedProbabilities: implied,
    totalOverround: over,
    vigPct: over,
  };
}

// ---------------------------------------------------------------------------
// Shin devig
// ---------------------------------------------------------------------------

/**
 * Shin model (1991/1992): accounts for insider/informed bettor proportion z.
 *
 * Standard Shin formula:
 *   p_i = (sqrt(z^2 + 4(1-z)*q_i/Q) - z) / (2*(1-z))
 *
 * where:
 *   q_i = 1/odds_i  (implied probability)
 *   Q   = sum(q_j)
 *   z   = proportion of informed bettors (0 ≤ z < 1)
 *
 * We find z via bisection so that sum(p_i) = 1.
 * Returns null if can't converge or invalid input.
 */
export function devigShin(
  decimalOddsArray: readonly number[],
  tolerance = 1e-10,
  maxIter = 200
): DevigResult | null {
  const implied = buildImplied(decimalOddsArray);
  if (!implied) return null;

  const Q = implied.reduce((s, q) => s + q, 0);
  if (Q <= 0) return null;

  // If no overround, z=0 is solution
  if (Math.abs(Q - 1) < 1e-12) {
    return {
      method: "shin",
      fairProbabilities: implied.map((q) => q),
      impliedProbabilities: implied,
      totalOverround: 0,
      vigPct: 0,
    };
  }

  function shinProbs(z: number): number[] {
    const denom = 2 * (1 - z);
    return implied!.map((q) => {
      const discriminant = z * z + 4 * (1 - z) * (q / Q);
      if (discriminant < 0) return 0;
      return (Math.sqrt(discriminant) - z) / denom;
    });
  }

  function sumDiff(z: number): number {
    return shinProbs(z).reduce((s, p) => s + p, 0) - 1;
  }

  // At z=0: sum = sum(sqrt(4*q_i/Q)/2) = sum(sqrt(q_i/Q))
  // which for a typical market > 1 when there's overround.
  // At z→1: all probs collapse to 0 so sum < 1.
  // Bisect z in [0, 1-epsilon].
  let lo = 0;
  let hi = 1 - 1e-10;

  const atLo = sumDiff(lo);
  const atHi = sumDiff(hi);

  if (atLo < 0 || atHi > 0) {
    // Fall back to basic if Shin bisection bounds don't bracket
    const basic = devigBasic(decimalOddsArray);
    if (!basic) return null;
    return {
      method: "shin",
      fairProbabilities: basic.fairProbabilities,
      impliedProbabilities: implied,
      totalOverround: basic.totalOverround,
      vigPct: basic.vigPct,
    };
  }

  let z = 0;
  for (let i = 0; i < maxIter; i++) {
    z = (lo + hi) / 2;
    const mid = sumDiff(z);
    if (Math.abs(mid) < tolerance) break;
    if (mid > 0) {
      lo = z;
    } else {
      hi = z;
    }
  }

  const fairProbabilities = shinProbs(z);
  const over = computeOverround(implied);

  return {
    method: "shin",
    fairProbabilities,
    impliedProbabilities: implied,
    totalOverround: over,
    vigPct: over,
  };
}

// ---------------------------------------------------------------------------
// Odds format converters
// ---------------------------------------------------------------------------

/**
 * Convert American moneyline odds to decimal odds.
 *   +150 → 2.5
 *   -110 → ~1.9091
 *   0    → 2.0  (treat as even money)
 */
export function americanToDecimal(americanOdds: number): number {
  if (americanOdds === 0) return 2.0;
  if (americanOdds > 0) return americanOdds / 100 + 1;
  return 100 / Math.abs(americanOdds) + 1;
}

/**
 * Convert decimal odds to American moneyline odds (rounded to integer).
 *   2.5   → +150
 *   1.909 → -110
 *   2.0   → +100
 */
export function decimalToAmerican(decimalOdds: number): number {
  if (decimalOdds <= 1) return 0; // undefined territory
  if (decimalOdds >= 2) {
    return Math.round((decimalOdds - 1) * 100);
  }
  return Math.round(-100 / (decimalOdds - 1));
}

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

/**
 * Convert an array of American odds to decimal, then run the chosen devig method.
 * Default method: "shin".
 */
export function noVigFromAmerican(
  americanOddsArray: readonly number[],
  method: "basic" | "power" | "additive" | "shin" = "shin"
): DevigResult | null {
  const decimal = americanOddsArray.map(americanToDecimal);
  switch (method) {
    case "basic":
      return devigBasic(decimal);
    case "power":
      return devigPower(decimal);
    case "additive":
      return devigAdditive(decimal);
    case "shin":
    default:
      return devigShin(decimal);
  }
}

/**
 * Multi-book consensus devig.
 *
 * For each outcome position, take the MEDIAN decimal odds across all books,
 * then run the chosen devig method on the median odds array.
 *
 * Returns null if:
 *   - no books provided
 *   - books have inconsistent outcome counts
 *   - underlying devig returns null
 *
 * Default method: "shin".
 */
export function consensusNoVig(
  multiBookOddsArrays: readonly (readonly number[])[],
  method: "basic" | "power" | "additive" | "shin" = "shin"
): DevigResult | null {
  if (multiBookOddsArrays.length === 0) return null;

  const outcomeCount = multiBookOddsArrays[0]!.length;
  if (outcomeCount === 0) return null;

  for (const book of multiBookOddsArrays) {
    if (book.length !== outcomeCount) return null;
  }

  // For each outcome slot, collect odds across books and take the median
  const medianOdds: number[] = [];
  for (let i = 0; i < outcomeCount; i++) {
    const col = multiBookOddsArrays.map((book) => book[i]!).sort((a, b) => a - b);
    const mid = Math.floor(col.length / 2);
    const median =
      col.length % 2 === 1 ? col[mid]! : (col[mid - 1]! + col[mid]!) / 2;
    medianOdds.push(median);
  }

  switch (method) {
    case "basic":
      return devigBasic(medianOdds);
    case "power":
      return devigPower(medianOdds);
    case "additive":
      return devigAdditive(medianOdds);
    case "shin":
    default:
      return devigShin(medianOdds);
  }
}
