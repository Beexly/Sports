import { describe, it, expect } from "vitest";
import {
  round,
  roundUp,
  roundDown,
  roundToNearest,
  truncate,
  clamp,
  snap,
  formatWithCommas,
  formatCompact,
  formatCurrency,
  formatPercent,
  formatBytes,
  formatDuration,
  formatOdds,
  toOrdinal,
  scientificNotation,
  isInteger,
  isFiniteNumber,
  isPositive,
  isNegative,
  isEven,
  isOdd,
  isPrime,
  isBetween,
  sum,
  product,
  average,
  geometricMean,
  harmonicMean,
  weightedSum,
  safeDiv,
  safeSqrt,
  safeLog,
  linearInterpolate,
  normalize,
  denormalize,
  americanToDecimal,
  decimalToAmerican,
  impliedProbability,
  vigFromOdds,
  removeVig,
  paretoScore,
  compoundGrowth,
  presentValue,
  roi,
  yardsToFeet,
  feetToYards,
  metersToYards,
  yardsToMeters,
  mphToKph,
  kphToMph,
  poundsToKg,
  kgToPounds,
  inchesToCm,
  cmToInches,
  fahrenheitToCelsius,
  celsiusToFahrenheit,
  range,
  linspace,
  logspace,
  cumsum,
  cumprod,
  diff,
  movingSum,
  countBits,
  isPowerOfTwo,
  nextPowerOfTwo,
  gcd,
  lcm,
} from "@/lib/utils/number-utils";

// ---------------------------------------------------------------------------
// Rounding & precision
// ---------------------------------------------------------------------------

describe("round (banker's rounding)", () => {
  it("rounds 2.5 to 2 (round-half-to-even)", () => {
    expect(round(2.5)).toBe(2);
  });

  it("rounds 3.5 to 4 (round-half-to-even)", () => {
    expect(round(3.5)).toBe(4);
  });

  it("rounds 4.5 to 4 (round-half-to-even)", () => {
    expect(round(4.5)).toBe(4);
  });

  it("rounds 5.5 to 6 (round-half-to-even)", () => {
    expect(round(5.5)).toBe(6);
  });

  it("rounds 2.345 to 2 decimal places — float repr makes it round up to 2.35", () => {
    // 2.345 * 100 = 234.50000000000003 in IEEE 754 (> 234.5), so normal rounding → 2.35
    expect(round(2.345, 2)).toBeCloseTo(2.35, 5);
  });

  it("rounds 2.355 to 2 decimal places (banker's)", () => {
    expect(round(2.355, 2)).toBeCloseTo(2.36, 5);
  });

  it("rounds positive non-tie normally", () => {
    expect(round(2.6)).toBe(3);
  });

  it("rounds 0 to 0", () => {
    expect(round(0)).toBe(0);
  });

  it("handles negative numbers", () => {
    expect(round(-1.5)).toBe(-2);
  });

  it("passes through NaN", () => {
    expect(round(NaN)).toBeNaN();
  });
});

describe("roundUp", () => {
  it("rounds up 1.1 → 2", () => {
    expect(roundUp(1.1)).toBe(2);
  });

  it("rounds up 1.0 → 1", () => {
    expect(roundUp(1.0)).toBe(1);
  });

  it("rounds up 2.345 to 2 decimals → 2.35", () => {
    expect(roundUp(2.345, 2)).toBeCloseTo(2.35, 5);
  });

  it("rounds up negative -1.1 → -1", () => {
    expect(roundUp(-1.1)).toBe(-1);
  });
});

describe("roundDown", () => {
  it("rounds down 1.9 → 1", () => {
    expect(roundDown(1.9)).toBe(1);
  });

  it("rounds down 2.999 to 2 decimals → 2.99", () => {
    expect(roundDown(2.999, 2)).toBe(2.99);
  });

  it("rounds down negative -1.1 → -2", () => {
    expect(roundDown(-1.1)).toBe(-2);
  });
});

describe("roundToNearest", () => {
  it("rounds 7 to nearest 0.5 → 7.0", () => {
    expect(roundToNearest(7, 0.5)).toBe(7.0);
  });

  it("rounds 7.3 to nearest 0.5 → 7.5", () => {
    expect(roundToNearest(7.3, 0.5)).toBe(7.5);
  });

  it("rounds 7.2 to nearest 0.5 → 7.0", () => {
    expect(roundToNearest(7.2, 0.5)).toBe(7.0);
  });

  it("rounds 10 to nearest 3 → 9", () => {
    expect(roundToNearest(10, 3)).toBe(9);
  });

  it("multiple 0 returns n", () => {
    expect(roundToNearest(5, 0)).toBe(5);
  });
});

describe("truncate", () => {
  it("truncates 1.9 → 1", () => {
    expect(truncate(1.9)).toBe(1);
  });

  it("truncates -1.9 → -1 (toward zero)", () => {
    expect(truncate(-1.9)).toBe(-1);
  });

  it("truncates 2.999 to 2 decimals → 2.99", () => {
    expect(truncate(2.999, 2)).toBe(2.99);
  });
});

describe("clamp", () => {
  it("clamps below min", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it("clamps above max", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("returns value within range unchanged", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("returns min when equal to min", () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });

  it("returns max when equal to max", () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe("snap", () => {
  it("snaps to nearest value in array", () => {
    expect(snap(3.2, [1, 2, 3, 4, 5])).toBe(3);
  });

  it("snaps 3.7 to 4", () => {
    expect(snap(3.7, [1, 2, 3, 4, 5])).toBe(4);
  });

  it("snaps exactly on a value", () => {
    expect(snap(2, [1, 2, 3])).toBe(2);
  });

  it("returns n for empty array", () => {
    expect(snap(5, [])).toBe(5);
  });

  it("snaps to nearest in non-uniform array", () => {
    expect(snap(4.9, [0, 3, 10])).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

describe("formatWithCommas", () => {
  it("formats 1000000 → '1,000,000'", () => {
    expect(formatWithCommas(1000000)).toBe("1,000,000");
  });

  it("formats 1234567.89 with 2 decimals → '1,234,567.89'", () => {
    expect(formatWithCommas(1234567.89, 2)).toBe("1,234,567.89");
  });

  it("formats negative number", () => {
    expect(formatWithCommas(-1234)).toBe("-1,234");
  });

  it("formats small number without commas", () => {
    expect(formatWithCommas(999)).toBe("999");
  });

  it("formats 0", () => {
    expect(formatWithCommas(0)).toBe("0");
  });
});

describe("formatCompact", () => {
  it("formats 999 → '999'", () => {
    expect(formatCompact(999)).toBe("999");
  });

  it("formats 1000 → '1.0K'", () => {
    expect(formatCompact(1000)).toBe("1.0K");
  });

  it("formats 1500 → '1.5K'", () => {
    expect(formatCompact(1500)).toBe("1.5K");
  });

  it("formats 1500000 → '1.5M'", () => {
    expect(formatCompact(1500000)).toBe("1.5M");
  });

  it("formats 1000000000 → '1.0B'", () => {
    expect(formatCompact(1000000000)).toBe("1.0B");
  });

  it("formats 12345 → '12.3K'", () => {
    expect(formatCompact(12345)).toBe("12.3K");
  });

  it("formats negative compact", () => {
    expect(formatCompact(-1000)).toBe("-1.0K");
  });
});

describe("formatCurrency", () => {
  it("formats 1234.56 as USD", () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain("1,234.56");
    expect(result).toContain("$");
  });

  it("formats 0 as USD", () => {
    expect(formatCurrency(0)).toContain("0");
  });
});

describe("formatPercent", () => {
  it("formats 0.1234 → '12.3%'", () => {
    expect(formatPercent(0.1234)).toBe("12.3%");
  });

  it("formats 0 → '0.0%'", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });

  it("formats 1 → '100.0%'", () => {
    expect(formatPercent(1)).toBe("100.0%");
  });

  it("formats with 0 decimals", () => {
    expect(formatPercent(0.5, 0)).toBe("50%");
  });
});

describe("formatBytes", () => {
  it("formats 1023 → '1023 B'", () => {
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("formats 1024 → '1.0 KB'", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
  });

  it("formats 1MB", () => {
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
  });

  it("formats 1GB", () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1.0 GB");
  });

  it("formats 0 → '0 B'", () => {
    expect(formatBytes(0)).toBe("0 B");
  });
});

describe("formatDuration", () => {
  it("formats 0ms → '0s'", () => {
    expect(formatDuration(0)).toBe("0s");
  });

  it("formats 1000ms → '1s'", () => {
    expect(formatDuration(1000)).toBe("1s");
  });

  it("formats 60000ms → '1m 0s'", () => {
    expect(formatDuration(60000)).toBe("1m 0s");
  });

  it("formats 90000ms → '1m 30s'", () => {
    expect(formatDuration(90000)).toBe("1m 30s");
  });

  it("formats 3600000ms → '1h 0m'", () => {
    expect(formatDuration(3600000)).toBe("1h 0m");
  });

  it("formats 3660000ms → '1h 1m'", () => {
    expect(formatDuration(3660000)).toBe("1h 1m");
  });

  it("handles negative ms as 0s", () => {
    expect(formatDuration(-5000)).toBe("0s");
  });
});

describe("formatOdds", () => {
  it("formats -110 → '-110'", () => {
    expect(formatOdds(-110)).toBe("-110");
  });

  it("formats +150 → '+150'", () => {
    expect(formatOdds(150)).toBe("+150");
  });

  it("formats 0 → '+0'", () => {
    expect(formatOdds(0)).toBe("+0");
  });

  it("formats -200 → '-200'", () => {
    expect(formatOdds(-200)).toBe("-200");
  });
});

describe("toOrdinal", () => {
  it("1 → '1st'", () => {
    expect(toOrdinal(1)).toBe("1st");
  });

  it("2 → '2nd'", () => {
    expect(toOrdinal(2)).toBe("2nd");
  });

  it("3 → '3rd'", () => {
    expect(toOrdinal(3)).toBe("3rd");
  });

  it("4 → '4th'", () => {
    expect(toOrdinal(4)).toBe("4th");
  });

  it("11 → '11th'", () => {
    expect(toOrdinal(11)).toBe("11th");
  });

  it("12 → '12th'", () => {
    expect(toOrdinal(12)).toBe("12th");
  });

  it("13 → '13th'", () => {
    expect(toOrdinal(13)).toBe("13th");
  });

  it("21 → '21st'", () => {
    expect(toOrdinal(21)).toBe("21st");
  });

  it("22 → '22nd'", () => {
    expect(toOrdinal(22)).toBe("22nd");
  });

  it("100 → '100th'", () => {
    expect(toOrdinal(100)).toBe("100th");
  });

  it("101 → '101st'", () => {
    expect(toOrdinal(101)).toBe("101st");
  });
});

describe("scientificNotation", () => {
  it("formats 0.001234 → '1.23e-3' (3 sig figs)", () => {
    expect(scientificNotation(0.001234)).toBe("1.23e-3");
  });

  it("formats large number 1234000", () => {
    expect(scientificNotation(1234000)).toBe("1.23e+6");
  });

  it("formats 1 → '1.00e+0'", () => {
    expect(scientificNotation(1)).toBe("1.00e+0");
  });

  it("formats with 2 sig figs", () => {
    expect(scientificNotation(0.001234, 2)).toBe("1.2e-3");
  });
});

// ---------------------------------------------------------------------------
// Number checks
// ---------------------------------------------------------------------------

describe("isInteger", () => {
  it("returns true for integers", () => {
    expect(isInteger(5)).toBe(true);
    expect(isInteger(0)).toBe(true);
    expect(isInteger(-3)).toBe(true);
  });

  it("returns false for floats", () => {
    expect(isInteger(5.1)).toBe(false);
    expect(isInteger(-0.5)).toBe(false);
  });
});

describe("isFiniteNumber", () => {
  it("returns true for normal numbers", () => {
    expect(isFiniteNumber(42)).toBe(true);
    expect(isFiniteNumber(0)).toBe(true);
    expect(isFiniteNumber(-1.5)).toBe(true);
  });

  it("returns false for NaN", () => {
    expect(isFiniteNumber(NaN)).toBe(false);
  });

  it("returns false for Infinity", () => {
    expect(isFiniteNumber(Infinity)).toBe(false);
    expect(isFiniteNumber(-Infinity)).toBe(false);
  });
});

describe("isPositive / isNegative", () => {
  it("isPositive: true for > 0", () => {
    expect(isPositive(1)).toBe(true);
    expect(isPositive(0.001)).toBe(true);
  });

  it("isPositive: false for <= 0", () => {
    expect(isPositive(0)).toBe(false);
    expect(isPositive(-1)).toBe(false);
  });

  it("isNegative: true for < 0", () => {
    expect(isNegative(-1)).toBe(true);
  });

  it("isNegative: false for >= 0", () => {
    expect(isNegative(0)).toBe(false);
    expect(isNegative(1)).toBe(false);
  });
});

describe("isEven / isOdd", () => {
  it("isEven: true for even integers", () => {
    expect(isEven(0)).toBe(true);
    expect(isEven(2)).toBe(true);
    expect(isEven(-4)).toBe(true);
  });

  it("isEven: false for odd integers", () => {
    expect(isEven(1)).toBe(false);
    expect(isEven(3)).toBe(false);
  });

  it("isOdd: true for odd integers", () => {
    expect(isOdd(1)).toBe(true);
    expect(isOdd(-3)).toBe(true);
  });

  it("isOdd: false for even integers", () => {
    expect(isOdd(0)).toBe(false);
    expect(isOdd(4)).toBe(false);
  });
});

describe("isPrime", () => {
  it("2 is prime", () => {
    expect(isPrime(2)).toBe(true);
  });

  it("3 is prime", () => {
    expect(isPrime(3)).toBe(true);
  });

  it("5 is prime", () => {
    expect(isPrime(5)).toBe(true);
  });

  it("7 is prime", () => {
    expect(isPrime(7)).toBe(true);
  });

  it("1 is not prime", () => {
    expect(isPrime(1)).toBe(false);
  });

  it("4 is not prime", () => {
    expect(isPrime(4)).toBe(false);
  });

  it("6 is not prime", () => {
    expect(isPrime(6)).toBe(false);
  });

  it("9 is not prime", () => {
    expect(isPrime(9)).toBe(false);
  });

  it("0 is not prime", () => {
    expect(isPrime(0)).toBe(false);
  });

  it("97 is prime", () => {
    expect(isPrime(97)).toBe(true);
  });
});

describe("isBetween", () => {
  it("inclusive: 5 is between 0 and 10", () => {
    expect(isBetween(5, 0, 10)).toBe(true);
  });

  it("inclusive: 0 is between 0 and 10 (boundary)", () => {
    expect(isBetween(0, 0, 10)).toBe(true);
  });

  it("inclusive: 10 is between 0 and 10 (boundary)", () => {
    expect(isBetween(10, 0, 10)).toBe(true);
  });

  it("exclusive: 0 is NOT between 0 and 10", () => {
    expect(isBetween(0, 0, 10, false)).toBe(false);
  });

  it("exclusive: 10 is NOT between 0 and 10", () => {
    expect(isBetween(10, 0, 10, false)).toBe(false);
  });

  it("exclusive: 5 is between 0 and 10", () => {
    expect(isBetween(5, 0, 10, false)).toBe(true);
  });

  it("returns false when outside range", () => {
    expect(isBetween(15, 0, 10)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Math utilities
// ---------------------------------------------------------------------------

describe("sum", () => {
  it("sums an array", () => {
    expect(sum([1, 2, 3, 4, 5])).toBe(15);
  });

  it("returns 0 for empty array", () => {
    expect(sum([])).toBe(0);
  });

  it("handles negatives", () => {
    expect(sum([-1, 1])).toBe(0);
  });
});

describe("product", () => {
  it("computes product", () => {
    expect(product([1, 2, 3, 4])).toBe(24);
  });

  it("returns 1 for empty array", () => {
    expect(product([])).toBe(1);
  });
});

describe("average", () => {
  it("computes average", () => {
    expect(average([1, 2, 3, 4, 5])).toBe(3);
  });

  it("returns NaN for empty array", () => {
    expect(average([])).toBeNaN();
  });
});

describe("geometricMean", () => {
  it("computes geometric mean of [1,4] → 2", () => {
    expect(geometricMean([1, 4])).toBeCloseTo(2, 5);
  });

  it("returns 0 if any value is non-positive", () => {
    expect(geometricMean([1, -1, 4])).toBe(0);
    expect(geometricMean([1, 0, 4])).toBe(0);
  });

  it("returns NaN for empty array", () => {
    expect(geometricMean([])).toBeNaN();
  });
});

describe("harmonicMean", () => {
  it("computes harmonic mean of [1, 2, 4] → ~1.714", () => {
    expect(harmonicMean([1, 2, 4])).toBeCloseTo(12 / 7, 5);
  });

  it("returns 0 if any value is zero", () => {
    expect(harmonicMean([1, 0, 3])).toBe(0);
  });

  it("returns NaN for empty array", () => {
    expect(harmonicMean([])).toBeNaN();
  });
});

describe("weightedSum", () => {
  it("computes weighted sum", () => {
    expect(weightedSum([1, 2, 3], [0.5, 0.3, 0.2])).toBeCloseTo(1.7, 5);
  });

  it("handles empty arrays", () => {
    expect(weightedSum([], [])).toBe(0);
  });
});

describe("safeDiv", () => {
  it("divides normally", () => {
    expect(safeDiv(10, 2)).toBe(5);
  });

  it("returns fallback (default 0) when b=0", () => {
    expect(safeDiv(10, 0)).toBe(0);
  });

  it("returns custom fallback when b=0", () => {
    expect(safeDiv(10, 0, -1)).toBe(-1);
  });
});

describe("safeSqrt", () => {
  it("computes sqrt of positive", () => {
    expect(safeSqrt(9)).toBe(3);
  });

  it("returns 0 for negative", () => {
    expect(safeSqrt(-4)).toBe(0);
  });

  it("returns 0 for 0", () => {
    expect(safeSqrt(0)).toBe(0);
  });
});

describe("safeLog", () => {
  it("computes natural log of positive", () => {
    expect(safeLog(Math.E)).toBeCloseTo(1, 5);
  });

  it("returns -Infinity for 0", () => {
    expect(safeLog(0)).toBe(-Infinity);
  });

  it("returns -Infinity for negative", () => {
    expect(safeLog(-1)).toBe(-Infinity);
  });

  it("computes log base 10", () => {
    expect(safeLog(100, 10)).toBeCloseTo(2, 5);
  });

  it("computes log base 2 of 8 → 3", () => {
    expect(safeLog(8, 2)).toBeCloseTo(3, 5);
  });
});

describe("linearInterpolate", () => {
  it("returns midpoint between (0,0) and (10,10) at x=5", () => {
    expect(linearInterpolate(0, 0, 10, 10, 5)).toBe(5);
  });

  it("extrapolates beyond endpoints", () => {
    expect(linearInterpolate(0, 0, 10, 10, 15)).toBe(15);
  });

  it("returns y0 when x1 === x0", () => {
    expect(linearInterpolate(5, 3, 5, 7, 5)).toBe(3);
  });

  it("interpolates y when x is at x0", () => {
    expect(linearInterpolate(0, 0, 10, 20, 0)).toBe(0);
  });

  it("interpolates y when x is at x1", () => {
    expect(linearInterpolate(0, 0, 10, 20, 10)).toBe(20);
  });
});

describe("normalize", () => {
  it("normalizes [0, 5, 10] → [0, 0.5, 1]", () => {
    expect(normalize([0, 5, 10])).toEqual([0, 0.5, 1]);
  });

  it("all-same values → [0.5, 0.5]", () => {
    expect(normalize([5, 5])).toEqual([0.5, 0.5]);
  });

  it("returns empty for empty array", () => {
    expect(normalize([])).toEqual([]);
  });

  it("uses explicit min/max", () => {
    expect(normalize([2, 5, 8], 0, 10)).toEqual([0.2, 0.5, 0.8]);
  });
});

describe("denormalize", () => {
  it("denormalizes [0, 0.5, 1] from [0, 10] → [0, 5, 10]", () => {
    expect(denormalize([0, 0.5, 1], 0, 10)).toEqual([0, 5, 10]);
  });

  it("roundtrip: normalize then denormalize", () => {
    const original = [2, 5, 8];
    const normalized = normalize(original, 0, 10);
    const back = denormalize(normalized, 0, 10);
    back.forEach((v, i) => expect(v).toBeCloseTo(original[i]!, 5));
  });
});

// ---------------------------------------------------------------------------
// Finance / odds math
// ---------------------------------------------------------------------------

describe("americanToDecimal", () => {
  it("-110 → ~1.909", () => {
    expect(americanToDecimal(-110)).toBeCloseTo(1.9091, 3);
  });

  it("+150 → 2.5", () => {
    expect(americanToDecimal(150)).toBeCloseTo(2.5, 5);
  });

  it("+100 → 2.0", () => {
    expect(americanToDecimal(100)).toBe(2);
  });

  it("-200 → 1.5", () => {
    expect(americanToDecimal(-200)).toBe(1.5);
  });
});

describe("decimalToAmerican", () => {
  it("2.5 → +150", () => {
    expect(decimalToAmerican(2.5)).toBeCloseTo(150, 5);
  });

  it("1.909 → ~-110", () => {
    expect(decimalToAmerican(1.9091)).toBeCloseTo(-110, 0);
  });

  it("2.0 → +100", () => {
    expect(decimalToAmerican(2.0)).toBeCloseTo(100, 5);
  });

  it("roundtrip: -110 → decimal → back to -110", () => {
    const decimal = americanToDecimal(-110);
    const back = decimalToAmerican(decimal);
    expect(back).toBeCloseTo(-110, 1);
  });

  it("roundtrip: +150 → decimal → back to +150", () => {
    const decimal = americanToDecimal(150);
    const back = decimalToAmerican(decimal);
    expect(back).toBeCloseTo(150, 1);
  });
});

describe("impliedProbability", () => {
  it("-110 → ~52.38%", () => {
    expect(impliedProbability(-110)).toBeCloseTo(0.5238, 3);
  });

  it("+150 → ~40%", () => {
    expect(impliedProbability(150)).toBeCloseTo(0.4, 3);
  });

  it("+100 → 50%", () => {
    expect(impliedProbability(100)).toBeCloseTo(0.5, 5);
  });

  it("-200 → ~66.67%", () => {
    expect(impliedProbability(-200)).toBeCloseTo(0.6667, 3);
  });
});

describe("vigFromOdds", () => {
  it("-110 / -110 → ~4.76% vig", () => {
    // Each -110 has implied prob = 110/210 ≈ 52.38%; total overround ≈ 4.76%
    const vig = vigFromOdds(-110, -110);
    expect(vig).toBeCloseTo(4.76, 1);
  });

  it("+100 / +100 → 0% vig (even odds)", () => {
    const vig = vigFromOdds(100, 100);
    expect(vig).toBe(0);
  });
});

describe("removeVig", () => {
  it("fair probs sum to 1 for -110/-110", () => {
    const { homeProb, awayProb } = removeVig(-110, -110);
    expect(homeProb + awayProb).toBeCloseTo(1, 5);
  });

  it("fair probs are 0.5/0.5 for -110/-110 (symmetric)", () => {
    const { homeProb, awayProb } = removeVig(-110, -110);
    expect(homeProb).toBeCloseTo(0.5, 3);
    expect(awayProb).toBeCloseTo(0.5, 3);
  });

  it("fair probs sum to 1 for asymmetric odds", () => {
    const { homeProb, awayProb } = removeVig(-200, +160);
    expect(homeProb + awayProb).toBeCloseTo(1, 5);
  });

  it("returns fair American odds", () => {
    const result = removeVig(-110, -110);
    expect(isFinite(result.homeFair)).toBe(true);
    expect(isFinite(result.awayFair)).toBe(true);
  });
});

describe("paretoScore", () => {
  it("value equals threshold → score of 1.0", () => {
    expect(paretoScore(10, 10)).toBe(1.0);
  });

  it("value exceeds threshold → > 1", () => {
    expect(paretoScore(15, 10)).toBe(1.5);
  });

  it("value below threshold → < 1", () => {
    expect(paretoScore(5, 10)).toBe(0.5);
  });

  it("threshold 0 → returns 0", () => {
    expect(paretoScore(10, 0)).toBe(0);
  });
});

describe("compoundGrowth", () => {
  it("$1000 at 10% for 1 period → $1100", () => {
    expect(compoundGrowth(1000, 0.1, 1)).toBeCloseTo(1100, 5);
  });

  it("$1000 at 10% for 2 periods → $1210", () => {
    expect(compoundGrowth(1000, 0.1, 2)).toBeCloseTo(1210, 5);
  });

  it("no growth for 0 periods", () => {
    expect(compoundGrowth(1000, 0.1, 0)).toBe(1000);
  });
});

describe("presentValue", () => {
  it("$1100 discounted at 10% for 1 period → $1000", () => {
    expect(presentValue(1100, 0.1, 1)).toBeCloseTo(1000, 5);
  });

  it("no discounting for 0 periods", () => {
    expect(presentValue(1000, 0.1, 0)).toBe(1000);
  });
});

describe("roi", () => {
  it("gain=110, cost=100 → ROI of 10%", () => {
    expect(roi(110, 100)).toBeCloseTo(10, 5);
  });

  it("gain=100, cost=100 → ROI of 0%", () => {
    expect(roi(100, 100)).toBe(0);
  });

  it("cost=0 → ROI of 0", () => {
    expect(roi(110, 0)).toBe(0);
  });

  it("gain=50, cost=100 → ROI of -50%", () => {
    expect(roi(50, 100)).toBe(-50);
  });
});

// ---------------------------------------------------------------------------
// Unit conversions
// ---------------------------------------------------------------------------

describe("yardsToFeet / feetToYards", () => {
  it("1 yard = 3 feet", () => {
    expect(yardsToFeet(1)).toBe(3);
  });

  it("100 yards = 300 feet", () => {
    expect(yardsToFeet(100)).toBe(300);
  });

  it("3 feet = 1 yard", () => {
    expect(feetToYards(3)).toBe(1);
  });

  it("roundtrip yards → feet → yards", () => {
    expect(feetToYards(yardsToFeet(50))).toBe(50);
  });
});

describe("metersToYards / yardsToMeters", () => {
  it("1 meter ≈ 1.09361 yards", () => {
    expect(metersToYards(1)).toBeCloseTo(1.09361, 3);
  });

  it("roundtrip meters → yards → meters", () => {
    expect(yardsToMeters(metersToYards(100))).toBeCloseTo(100, 3);
  });
});

describe("mphToKph / kphToMph", () => {
  it("60 mph ≈ 96.56 kph", () => {
    expect(mphToKph(60)).toBeCloseTo(96.56, 1);
  });

  it("roundtrip mph → kph → mph", () => {
    expect(kphToMph(mphToKph(60))).toBeCloseTo(60, 3);
  });
});

describe("poundsToKg / kgToPounds", () => {
  it("10 lbs ≈ 4.536 kg", () => {
    expect(poundsToKg(10)).toBeCloseTo(4.536, 2);
  });

  it("roundtrip", () => {
    expect(kgToPounds(poundsToKg(200))).toBeCloseTo(200, 3);
  });
});

describe("inchesToCm / cmToInches", () => {
  it("1 inch = 2.54 cm", () => {
    expect(inchesToCm(1)).toBe(2.54);
  });

  it("roundtrip", () => {
    expect(cmToInches(inchesToCm(12))).toBeCloseTo(12, 5);
  });
});

describe("fahrenheitToCelsius / celsiusToFahrenheit", () => {
  it("32°F = 0°C", () => {
    expect(fahrenheitToCelsius(32)).toBe(0);
  });

  it("212°F = 100°C", () => {
    expect(fahrenheitToCelsius(212)).toBe(100);
  });

  it("0°C = 32°F", () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
  });

  it("100°C = 212°F", () => {
    expect(celsiusToFahrenheit(100)).toBe(212);
  });

  it("roundtrip", () => {
    expect(fahrenheitToCelsius(celsiusToFahrenheit(37))).toBeCloseTo(37, 5);
  });
});

// ---------------------------------------------------------------------------
// Range / sequence
// ---------------------------------------------------------------------------

describe("range", () => {
  it("[0,5) = [0,1,2,3,4]", () => {
    expect(range(0, 5)).toEqual([0, 1, 2, 3, 4]);
  });

  it("step=2: [0,10) = [0,2,4,6,8]", () => {
    expect(range(0, 10, 2)).toEqual([0, 2, 4, 6, 8]);
  });

  it("negative step: range(5, 0, -1) = [5,4,3,2,1]", () => {
    expect(range(5, 0, -1)).toEqual([5, 4, 3, 2, 1]);
  });

  it("empty when start >= end with positive step", () => {
    expect(range(5, 5)).toEqual([]);
  });

  it("step=0 returns empty", () => {
    expect(range(0, 5, 0)).toEqual([]);
  });
});

describe("linspace", () => {
  it("5 points from 0 to 1 inclusive", () => {
    const result = linspace(0, 1, 5);
    expect(result).toHaveLength(5);
    expect(result[0]).toBeCloseTo(0, 5);
    expect(result[4]).toBeCloseTo(1, 5);
    expect(result[2]).toBeCloseTo(0.5, 5);
  });

  it("n=1 returns [start]", () => {
    expect(linspace(3, 7, 1)).toEqual([3]);
  });

  it("n=0 returns []", () => {
    expect(linspace(0, 1, 0)).toEqual([]);
  });

  it("n=2 returns [start, end]", () => {
    const result = linspace(0, 10, 2);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(10);
  });
});

describe("cumsum", () => {
  it("cumulative sum of [1,2,3,4]", () => {
    expect(cumsum([1, 2, 3, 4])).toEqual([1, 3, 6, 10]);
  });

  it("empty array → empty", () => {
    expect(cumsum([])).toEqual([]);
  });
});

describe("cumprod", () => {
  it("cumulative product of [1,2,3,4]", () => {
    expect(cumprod([1, 2, 3, 4])).toEqual([1, 2, 6, 24]);
  });

  it("empty array → empty", () => {
    expect(cumprod([])).toEqual([]);
  });
});

describe("diff", () => {
  it("first differences of [1,3,6,10]", () => {
    expect(diff([1, 3, 6, 10])).toEqual([2, 3, 4]);
  });

  it("single element → empty", () => {
    expect(diff([5])).toEqual([]);
  });

  it("empty → empty", () => {
    expect(diff([])).toEqual([]);
  });
});

describe("movingSum", () => {
  it("window=2 over [1,2,3,4,5]", () => {
    expect(movingSum([1, 2, 3, 4, 5], 2)).toEqual([3, 5, 7, 9]);
  });

  it("window=3 over [1,2,3,4,5]", () => {
    expect(movingSum([1, 2, 3, 4, 5], 3)).toEqual([6, 9, 12]);
  });

  it("window larger than array → empty", () => {
    expect(movingSum([1, 2], 3)).toEqual([]);
  });

  it("window=0 → empty", () => {
    expect(movingSum([1, 2, 3], 0)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Bit utilities
// ---------------------------------------------------------------------------

describe("countBits", () => {
  it("0 has 0 set bits", () => {
    expect(countBits(0)).toBe(0);
  });

  it("1 has 1 set bit", () => {
    expect(countBits(1)).toBe(1);
  });

  it("7 (0b111) has 3 set bits", () => {
    expect(countBits(7)).toBe(3);
  });

  it("255 has 8 set bits", () => {
    expect(countBits(255)).toBe(8);
  });

  it("4 (0b100) has 1 set bit", () => {
    expect(countBits(4)).toBe(1);
  });
});

describe("isPowerOfTwo", () => {
  it("1 is power of two", () => {
    expect(isPowerOfTwo(1)).toBe(true);
  });

  it("2 is power of two", () => {
    expect(isPowerOfTwo(2)).toBe(true);
  });

  it("4 is power of two", () => {
    expect(isPowerOfTwo(4)).toBe(true);
  });

  it("1024 is power of two", () => {
    expect(isPowerOfTwo(1024)).toBe(true);
  });

  it("3 is not power of two", () => {
    expect(isPowerOfTwo(3)).toBe(false);
  });

  it("0 is not power of two", () => {
    expect(isPowerOfTwo(0)).toBe(false);
  });

  it("negative is not power of two", () => {
    expect(isPowerOfTwo(-4)).toBe(false);
  });
});

describe("nextPowerOfTwo", () => {
  it("1 → 1", () => {
    expect(nextPowerOfTwo(1)).toBe(1);
  });

  it("2 → 2", () => {
    expect(nextPowerOfTwo(2)).toBe(2);
  });

  it("3 → 4", () => {
    expect(nextPowerOfTwo(3)).toBe(4);
  });

  it("5 → 8", () => {
    expect(nextPowerOfTwo(5)).toBe(8);
  });

  it("0 → 1", () => {
    expect(nextPowerOfTwo(0)).toBe(1);
  });

  it("1000 → 1024", () => {
    expect(nextPowerOfTwo(1000)).toBe(1024);
  });
});

describe("gcd", () => {
  it("gcd(12, 8) = 4", () => {
    expect(gcd(12, 8)).toBe(4);
  });

  it("gcd(7, 3) = 1 (coprime)", () => {
    expect(gcd(7, 3)).toBe(1);
  });

  it("gcd(0, 5) = 5", () => {
    expect(gcd(0, 5)).toBe(5);
  });

  it("gcd(100, 75) = 25", () => {
    expect(gcd(100, 75)).toBe(25);
  });
});

describe("lcm", () => {
  it("lcm(4, 6) = 12", () => {
    expect(lcm(4, 6)).toBe(12);
  });

  it("lcm(7, 3) = 21", () => {
    expect(lcm(7, 3)).toBe(21);
  });

  it("lcm(0, 5) = 0", () => {
    expect(lcm(0, 5)).toBe(0);
  });

  it("lcm(12, 8) = 24", () => {
    expect(lcm(12, 8)).toBe(24);
  });
});
