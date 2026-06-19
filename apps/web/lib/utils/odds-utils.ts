/**
 * Odds conversion and formatting utilities — pure math, zero dependencies.
 *
 * Converts between American, Decimal, Fractional, Hong Kong, Malay,
 * and Indonesian odds formats. Includes implied probability, overround,
 * and display formatting helpers.
 */

export type OddsFormat =
  | "american"
  | "decimal"
  | "fractional"
  | "hongkong"
  | "malay"
  | "indonesian";

export interface ConvertedOdds {
  american: number;
  decimal: number;
  fractional: string; // "5/2" format
  hongkong: number; // decimal - 1
  malay: number; // varies by sign
  indonesian: number; // varies by sign
  impliedProb: number; // [0,1] no-vig
}

// ---------------------------------------------------------------------------
// Core conversions
// ---------------------------------------------------------------------------

/**
 * Convert American odds to decimal odds.
 * - american > 0: decimal = american/100 + 1
 * - american < 0: decimal = 100/Math.abs(american) + 1
 * - american = 0: 1 (EV, break-even)
 */
export function americanToDecimal(american: number): number {
  if (american === 0) return 1;
  if (american > 0) return american / 100 + 1;
  return 100 / Math.abs(american) + 1;
}

/**
 * Convert decimal odds to American odds.
 * - decimal >= 2: american = (decimal - 1) * 100
 * - 1 < decimal < 2: american = -100 / (decimal - 1)
 * Rounded to nearest integer.
 */
export function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) {
    return Math.round((decimal - 1) * 100);
  }
  return Math.round(-100 / (decimal - 1));
}

/**
 * Implied probability from decimal odds: 1 / decimal.
 */
export function decimalToImpliedProb(decimal: number): number {
  return 1 / decimal;
}

/**
 * Implied probability from American odds (routes through decimal).
 */
export function americanToImpliedProb(american: number): number {
  return decimalToImpliedProb(americanToDecimal(american));
}

/**
 * Convert implied probability to American odds.
 * - prob >= 0.5: american = -(prob/(1-prob))*100
 * - prob < 0.5:  american = ((1-prob)/prob)*100
 * Rounded to integer.
 */
export function impliedProbToAmerican(prob: number): number {
  if (prob > 0.5) {
    return Math.round(-(prob / (1 - prob)) * 100);
  }
  if (prob === 0.5) {
    return 100; // even money — return positive convention
  }
  return Math.round(((1 - prob) / prob) * 100);
}

/**
 * Convert implied probability to decimal odds: 1 / prob.
 */
export function impliedProbToDecimal(prob: number): number {
  return 1 / prob;
}

// ---------------------------------------------------------------------------
// Fractional odds
// ---------------------------------------------------------------------------

/**
 * Build a lookup table of common fractions (n/d) where d ∈ [1..16], n ∈ [1..100].
 * Stored as { net: number, str: string }.
 */
function buildFractionTable(): Array<{ net: number; str: string }> {
  const seen = new Set<string>();
  const table: Array<{ net: number; str: string }> = [];

  for (let d = 1; d <= 16; d++) {
    for (let n = 1; n <= 100; n++) {
      // Reduce to lowest terms for deduplication
      const g = gcd(n, d);
      const rn = n / g;
      const rd = d / g;
      const key = `${rn}/${rd}`;
      if (!seen.has(key)) {
        seen.add(key);
        table.push({ net: rn / rd, str: key });
      }
    }
  }

  return table;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

const FRACTION_TABLE = buildFractionTable();

/**
 * Convert decimal odds to nearest common fraction string like "5/2", "1/1", "6/4".
 * If the error exceeds 0.01, falls back to the decimal representation like "2.50".
 */
export function decimalToFractional(decimal: number): string {
  const net = decimal - 1;

  if (net <= 0) return "0/1";

  let best: { net: number; str: string } | null = null;
  let bestErr = Infinity;

  for (const frac of FRACTION_TABLE) {
    const err = Math.abs(frac.net - net);
    if (err < bestErr) {
      bestErr = err;
      best = frac;
    }
  }

  if (best === null || bestErr > 0.01) {
    return net.toFixed(2);
  }

  return best.str;
}

/**
 * Parse a fractional string like "5/2" → 2.5, "1/1" → 2.0, "EVENS" → 2.0.
 * Returns null on invalid input.
 */
export function fractionalToDecimal(fractional: string): number | null {
  const trimmed = fractional.trim().toUpperCase();

  if (trimmed === "EVENS" || trimmed === "EVS") {
    return 2.0;
  }

  const parts = trimmed.split("/");
  if (parts.length !== 2) return null;

  const numerator = parseFloat(parts[0]);
  const denominator = parseFloat(parts[1]);

  if (
    !isFinite(numerator) ||
    !isFinite(denominator) ||
    denominator === 0 ||
    isNaN(numerator) ||
    isNaN(denominator)
  ) {
    return null;
  }

  return numerator / denominator + 1;
}

// ---------------------------------------------------------------------------
// Hong Kong odds
// ---------------------------------------------------------------------------

/**
 * Convert decimal odds to Hong Kong odds: decimal - 1.
 */
export function decimalToHongKong(decimal: number): number {
  return decimal - 1;
}

/**
 * Convert Hong Kong odds to decimal: hk + 1.
 */
export function hongKongToDecimal(hk: number): number {
  return hk + 1;
}

// ---------------------------------------------------------------------------
// Malay odds
// ---------------------------------------------------------------------------

/**
 * Convert decimal odds to Malay odds.
 * netOdds = decimal - 1
 * - if netOdds >= 1: malay = netOdds (positive, underdog)
 * - if netOdds < 1:  malay = -(1/netOdds) (negative, favorite)
 */
export function decimalToMalay(decimal: number): number {
  const net = decimal - 1;
  if (net >= 1) return net;
  return -(1 / net);
}

/**
 * Convert Malay odds to decimal.
 * - if malay >= 0: decimal = malay + 1
 * - if malay < 0:  decimal = (-1/malay) + 1
 */
export function malayToDecimal(malay: number): number {
  if (malay >= 0) return malay + 1;
  return -1 / malay + 1;
}

// ---------------------------------------------------------------------------
// Indonesian odds
// ---------------------------------------------------------------------------

/**
 * Convert decimal odds to Indonesian odds.
 * netOdds = decimal - 1
 * - if netOdds >= 1: indonesian = netOdds
 * - if netOdds < 1:  indonesian = -1/netOdds
 */
export function decimalToIndonesian(decimal: number): number {
  const net = decimal - 1;
  if (net >= 1) return net;
  return -1 / net;
}

/**
 * Convert Indonesian odds to decimal.
 * - if indo >= 0: decimal = indo + 1
 * - if indo < 0:  decimal = (-1/indo) + 1
 */
export function indonesianToDecimal(indo: number): number {
  if (indo >= 0) return indo + 1;
  return -1 / indo + 1;
}

// ---------------------------------------------------------------------------
// Aggregate conversion
// ---------------------------------------------------------------------------

/**
 * Convert American odds into all supported formats.
 */
export function convertOdds(american: number): ConvertedOdds {
  const decimal = americanToDecimal(american);
  const impliedProb = decimalToImpliedProb(decimal);

  return {
    american,
    decimal,
    fractional: decimalToFractional(decimal),
    hongkong: decimalToHongKong(decimal),
    malay: decimalToMalay(decimal),
    indonesian: decimalToIndonesian(decimal),
    impliedProb,
  };
}

// ---------------------------------------------------------------------------
// Display formatting
// ---------------------------------------------------------------------------

/**
 * Format American odds for display: "+150", "-110", "EV" (if 0).
 */
export function oddsLabel(american: number): string {
  if (american === 0) return "EV";
  if (american > 0) return `+${american}`;
  return `${american}`;
}

/**
 * Format odds for display in the specified format.
 * - american: "+150" / "-110" / "EV"
 * - decimal: "2.50" (2 decimals)
 * - fractional: "5/2"
 * - hongkong: "1.50" (2 decimals)
 * - malay: "0.50" or "-1.50" (2 decimals)
 * - indonesian: "1.50" or "-0.67" (2 decimals)
 */
export function formatOdds(
  american: number,
  format: OddsFormat = "american"
): string {
  switch (format) {
    case "american":
      return oddsLabel(american);

    case "decimal": {
      const dec = americanToDecimal(american);
      return dec.toFixed(2);
    }

    case "fractional": {
      const dec = americanToDecimal(american);
      return decimalToFractional(dec);
    }

    case "hongkong": {
      const dec = americanToDecimal(american);
      return decimalToHongKong(dec).toFixed(2);
    }

    case "malay": {
      const dec = americanToDecimal(american);
      return decimalToMalay(dec).toFixed(2);
    }

    case "indonesian": {
      const dec = americanToDecimal(american);
      return decimalToIndonesian(dec).toFixed(2);
    }
  }
}

/**
 * Format implied probability as a percentage string: "52.4%".
 */
export function formatImpliedProb(american: number): string {
  const prob = americanToImpliedProb(american);
  return `${(prob * 100).toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Overround / vig
// ---------------------------------------------------------------------------

/**
 * Calculate overround (book margin) from an array of American odds.
 * overround = sum of implied probs - 1.0
 */
export function calculateOverround(americanOdds: readonly number[]): number {
  const sumProbs = americanOdds.reduce(
    (sum, odds) => sum + americanToImpliedProb(odds),
    0
  );
  return sumProbs - 1.0;
}

/**
 * Remove vig using proportional devig.
 * Each implied prob is divided by the sum of all implied probs.
 * Returns fair implied probs as array of numbers [0,1].
 */
export function removeVig(americanOdds: readonly number[]): number[] {
  const probs = americanOdds.map((o) => americanToImpliedProb(o));
  const sum = probs.reduce((a, b) => a + b, 0);
  return probs.map((p) => p / sum);
}

/**
 * Convert fair implied probs to decimal odds (1/prob each).
 */
export function fairDecimalOdds(impliedProbs: readonly number[]): number[] {
  return impliedProbs.map((p) => impliedProbToDecimal(p));
}

// ---------------------------------------------------------------------------
// Spread helpers
// ---------------------------------------------------------------------------

/**
 * For a spread line, both sides are at the same juice (default -110).
 * Returns { favorite: baseJuice, underdog: baseJuice }.
 */
export function spreadLineToOdds(
  _spread: number,
  baseJuice = -110
): { favorite: number; underdog: number } {
  return { favorite: baseJuice, underdog: baseJuice };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate American odds.
 * Valid: finite, abs < 10000 or exactly 0.
 */
export function isValidAmerican(odds: number): boolean {
  if (!isFinite(odds)) return false;
  if (odds === 0) return true;
  return Math.abs(odds) < 10000;
}

/**
 * Validate decimal odds.
 * Valid: finite and strictly > 1.0.
 */
export function isValidDecimal(odds: number): boolean {
  return isFinite(odds) && odds > 1.0;
}
