/**
 * Tests for odds conversion and formatting utilities.
 */
import { describe, it, expect } from "vitest";
import {
  americanToDecimal,
  decimalToAmerican,
  decimalToImpliedProb,
  americanToImpliedProb,
  impliedProbToAmerican,
  impliedProbToDecimal,
  decimalToFractional,
  fractionalToDecimal,
  decimalToHongKong,
  hongKongToDecimal,
  decimalToMalay,
  malayToDecimal,
  decimalToIndonesian,
  indonesianToDecimal,
  convertOdds,
  formatOdds,
  oddsLabel,
  formatImpliedProb,
  calculateOverround,
  removeVig,
  fairDecimalOdds,
  spreadLineToOdds,
  isValidAmerican,
  isValidDecimal,
} from "@/lib/utils/odds-utils";

// ---------------------------------------------------------------------------
// americanToDecimal
// ---------------------------------------------------------------------------
describe("americanToDecimal", () => {
  it("+100 → 2.0", () => {
    expect(americanToDecimal(100)).toBeCloseTo(2.0);
  });

  it("-110 → ~1.9091", () => {
    expect(americanToDecimal(-110)).toBeCloseTo(1.9091, 3);
  });

  it("+150 → 2.5", () => {
    expect(americanToDecimal(150)).toBeCloseTo(2.5);
  });

  it("-200 → 1.5", () => {
    expect(americanToDecimal(-200)).toBeCloseTo(1.5);
  });

  it("0 → 1 (EV)", () => {
    expect(americanToDecimal(0)).toBe(1);
  });

  it("+200 → 3.0", () => {
    expect(americanToDecimal(200)).toBeCloseTo(3.0);
  });

  it("-300 → ~1.333", () => {
    expect(americanToDecimal(-300)).toBeCloseTo(1.3333, 3);
  });
});

// ---------------------------------------------------------------------------
// decimalToAmerican
// ---------------------------------------------------------------------------
describe("decimalToAmerican", () => {
  it("2.0 → 100", () => {
    expect(decimalToAmerican(2.0)).toBe(100);
  });

  it("1.9091 → -110 (approx)", () => {
    // -100 / (1.9091 - 1) = -100 / 0.9091 ≈ -110
    expect(decimalToAmerican(1.9091)).toBe(-110);
  });

  it("2.5 → 150", () => {
    expect(decimalToAmerican(2.5)).toBe(150);
  });

  it("1.5 → -200", () => {
    expect(decimalToAmerican(1.5)).toBe(-200);
  });

  it("3.0 → 200", () => {
    expect(decimalToAmerican(3.0)).toBe(200);
  });

  it("returns integer", () => {
    expect(Number.isInteger(decimalToAmerican(1.9091))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// decimalToImpliedProb
// ---------------------------------------------------------------------------
describe("decimalToImpliedProb", () => {
  it("2.0 → 0.5", () => {
    expect(decimalToImpliedProb(2.0)).toBeCloseTo(0.5);
  });

  it("1.9091 → ~0.524", () => {
    expect(decimalToImpliedProb(1.9091)).toBeCloseTo(0.5238, 3);
  });

  it("4.0 → 0.25", () => {
    expect(decimalToImpliedProb(4.0)).toBeCloseTo(0.25);
  });
});

// ---------------------------------------------------------------------------
// americanToImpliedProb
// ---------------------------------------------------------------------------
describe("americanToImpliedProb", () => {
  it("+100 → 0.5", () => {
    expect(americanToImpliedProb(100)).toBeCloseTo(0.5);
  });

  it("-110 → ~0.5238", () => {
    expect(americanToImpliedProb(-110)).toBeCloseTo(0.5238, 3);
  });

  it("+200 → ~0.333", () => {
    expect(americanToImpliedProb(200)).toBeCloseTo(0.3333, 3);
  });
});

// ---------------------------------------------------------------------------
// impliedProbToAmerican
// ---------------------------------------------------------------------------
describe("impliedProbToAmerican", () => {
  it("0.5 → 100", () => {
    expect(impliedProbToAmerican(0.5)).toBe(100);
  });

  it("0.5238 → ≈-110", () => {
    // prob >= 0.5: -(0.5238/0.4762)*100 ≈ -110
    expect(impliedProbToAmerican(0.5238)).toBeCloseTo(-110, 0);
  });

  it("0.25 → 300", () => {
    expect(impliedProbToAmerican(0.25)).toBe(300);
  });

  it("returns integer", () => {
    expect(Number.isInteger(impliedProbToAmerican(0.5))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// impliedProbToDecimal
// ---------------------------------------------------------------------------
describe("impliedProbToDecimal", () => {
  it("0.5 → 2.0", () => {
    expect(impliedProbToDecimal(0.5)).toBeCloseTo(2.0);
  });

  it("0.25 → 4.0", () => {
    expect(impliedProbToDecimal(0.25)).toBeCloseTo(4.0);
  });
});

// ---------------------------------------------------------------------------
// decimalToFractional
// ---------------------------------------------------------------------------
describe("decimalToFractional", () => {
  it("2.5 → '3/2' (net=1.5=3/2)", () => {
    // net = decimal - 1 = 1.5; nearest fraction is 3/2
    expect(decimalToFractional(2.5)).toBe("3/2");
  });

  it("2.0 → '1/1'", () => {
    expect(decimalToFractional(2.0)).toBe("1/1");
  });

  it("3.0 → '2/1'", () => {
    expect(decimalToFractional(3.0)).toBe("2/1");
  });

  it("4.0 → '3/1'", () => {
    expect(decimalToFractional(4.0)).toBe("3/1");
  });

  it("1.5 → '1/2'", () => {
    // net = 0.5, nearest fraction is 1/2
    expect(decimalToFractional(1.5)).toBe("1/2");
  });

  it("2.75 → '7/4'", () => {
    expect(decimalToFractional(2.75)).toBe("7/4");
  });
});

// ---------------------------------------------------------------------------
// fractionalToDecimal
// ---------------------------------------------------------------------------
describe("fractionalToDecimal", () => {
  it('"5/2" → 3.5 (profit convention: 5/2 net + 1 stake)', () => {
    // Profit/British convention: win 5 for 2 staked → return = 5+2=7 per 2 = 3.5 decimal
    expect(fractionalToDecimal("5/2")).toBeCloseTo(3.5);
  });

  it('"3/2" → 2.5 (profit convention: net=1.5, decimal=2.5)', () => {
    expect(fractionalToDecimal("3/2")).toBeCloseTo(2.5);
  });

  it('"1/1" → 2.0', () => {
    expect(fractionalToDecimal("1/1")).toBeCloseTo(2.0);
  });

  it('"EVENS" → 2.0', () => {
    expect(fractionalToDecimal("EVENS")).toBeCloseTo(2.0);
  });

  it('"2/1" → 3.0', () => {
    expect(fractionalToDecimal("2/1")).toBeCloseTo(3.0);
  });

  it('"bad" → null', () => {
    expect(fractionalToDecimal("bad")).toBeNull();
  });

  it('"abc/def" → null (NaN parts)', () => {
    expect(fractionalToDecimal("abc/def")).toBeNull();
  });

  it('"5/0" → null (division by zero)', () => {
    expect(fractionalToDecimal("5/0")).toBeNull();
  });

  it("handles whitespace ('5/2' → 3.5)", () => {
    expect(fractionalToDecimal("  5/2  ")).toBeCloseTo(3.5);
  });
});

// ---------------------------------------------------------------------------
// Hong Kong
// ---------------------------------------------------------------------------
describe("decimalToHongKong", () => {
  it("2.5 → 1.5", () => {
    expect(decimalToHongKong(2.5)).toBeCloseTo(1.5);
  });

  it("2.0 → 1.0", () => {
    expect(decimalToHongKong(2.0)).toBeCloseTo(1.0);
  });

  it("1.5 → 0.5", () => {
    expect(decimalToHongKong(1.5)).toBeCloseTo(0.5);
  });
});

describe("hongKongToDecimal", () => {
  it("1.5 → 2.5", () => {
    expect(hongKongToDecimal(1.5)).toBeCloseTo(2.5);
  });

  it("1.0 → 2.0", () => {
    expect(hongKongToDecimal(1.0)).toBeCloseTo(2.0);
  });
});

// ---------------------------------------------------------------------------
// Malay odds
// ---------------------------------------------------------------------------
describe("decimalToMalay", () => {
  it("2.5 → 1.5 (underdog, net >= 1)", () => {
    // net = 1.5, so malay = 1.5
    expect(decimalToMalay(2.5)).toBeCloseTo(1.5);
  });

  it("1.5 → -2.0 (favorite, net < 1)", () => {
    // net = 0.5, malay = -(1/0.5) = -2.0
    expect(decimalToMalay(1.5)).toBeCloseTo(-2.0);
  });

  it("2.0 → 1.0 (exactly on the boundary)", () => {
    // net = 1.0, so malay = 1.0
    expect(decimalToMalay(2.0)).toBeCloseTo(1.0);
  });

  it("1.25 → -4.0", () => {
    // net = 0.25, malay = -(1/0.25) = -4.0
    expect(decimalToMalay(1.25)).toBeCloseTo(-4.0);
  });
});

describe("malayToDecimal", () => {
  it("1.5 → 2.5", () => {
    expect(malayToDecimal(1.5)).toBeCloseTo(2.5);
  });

  it("-2.0 → 1.5", () => {
    expect(malayToDecimal(-2.0)).toBeCloseTo(1.5);
  });

  it("0 → 1.0", () => {
    expect(malayToDecimal(0)).toBeCloseTo(1.0);
  });
});

// ---------------------------------------------------------------------------
// Indonesian odds
// ---------------------------------------------------------------------------
describe("decimalToIndonesian", () => {
  it("2.5 → 1.5 (net >= 1)", () => {
    expect(decimalToIndonesian(2.5)).toBeCloseTo(1.5);
  });

  it("1.5 → -2.0 (net < 1)", () => {
    // net = 0.5, indo = -1/0.5 = -2.0
    expect(decimalToIndonesian(1.5)).toBeCloseTo(-2.0);
  });

  it("2.0 → 1.0 (exactly on boundary)", () => {
    expect(decimalToIndonesian(2.0)).toBeCloseTo(1.0);
  });

  it("3.0 → 2.0", () => {
    expect(decimalToIndonesian(3.0)).toBeCloseTo(2.0);
  });
});

describe("indonesianToDecimal", () => {
  it("1.5 → 2.5", () => {
    expect(indonesianToDecimal(1.5)).toBeCloseTo(2.5);
  });

  it("-2.0 → 1.5", () => {
    expect(indonesianToDecimal(-2.0)).toBeCloseTo(1.5);
  });

  it("0 → 1.0", () => {
    expect(indonesianToDecimal(0)).toBeCloseTo(1.0);
  });
});

// ---------------------------------------------------------------------------
// Roundtrip
// ---------------------------------------------------------------------------
describe("roundtrip conversions", () => {
  it("american → decimal → american (+150)", () => {
    const orig = 150;
    expect(decimalToAmerican(americanToDecimal(orig))).toBe(orig);
  });

  it("american → decimal → american (-110)", () => {
    const orig = -110;
    expect(decimalToAmerican(americanToDecimal(orig))).toBe(orig);
  });

  it("american → decimal → american (+300)", () => {
    expect(decimalToAmerican(americanToDecimal(300))).toBe(300);
  });

  it("american → decimal → american (-200)", () => {
    expect(decimalToAmerican(americanToDecimal(-200))).toBe(-200);
  });

  it("decimal → HK → decimal", () => {
    const d = 2.5;
    expect(hongKongToDecimal(decimalToHongKong(d))).toBeCloseTo(d);
  });

  it("decimal → Malay → decimal (underdog)", () => {
    const d = 3.0;
    expect(malayToDecimal(decimalToMalay(d))).toBeCloseTo(d);
  });

  it("decimal → Malay → decimal (favorite)", () => {
    const d = 1.5;
    expect(malayToDecimal(decimalToMalay(d))).toBeCloseTo(d);
  });

  it("decimal → Indonesian → decimal (underdog)", () => {
    const d = 2.5;
    expect(indonesianToDecimal(decimalToIndonesian(d))).toBeCloseTo(d);
  });

  it("decimal → Indonesian → decimal (favorite)", () => {
    const d = 1.667;
    expect(indonesianToDecimal(decimalToIndonesian(d))).toBeCloseTo(d, 2);
  });
});

// ---------------------------------------------------------------------------
// convertOdds
// ---------------------------------------------------------------------------
describe("convertOdds", () => {
  it("+100: american=100, decimal=2.0, impliedProb=0.5", () => {
    const result = convertOdds(100);
    expect(result.american).toBe(100);
    expect(result.decimal).toBeCloseTo(2.0);
    expect(result.impliedProb).toBeCloseTo(0.5);
    expect(result.fractional).toBe("1/1");
  });

  it("+100: hongkong=1.0", () => {
    const result = convertOdds(100);
    expect(result.hongkong).toBeCloseTo(1.0);
  });

  it("+150: decimal=2.5, fractional='3/2' (net=1.5)", () => {
    // net = 1.5 = 3/2 in profit/net fractional convention
    const result = convertOdds(150);
    expect(result.decimal).toBeCloseTo(2.5);
    expect(result.fractional).toBe("3/2");
  });

  it("-200: decimal=1.5, impliedProb≈0.667", () => {
    const result = convertOdds(-200);
    expect(result.decimal).toBeCloseTo(1.5);
    expect(result.impliedProb).toBeCloseTo(0.6667, 3);
  });

  it("all keys present", () => {
    const result = convertOdds(100);
    expect(result).toHaveProperty("american");
    expect(result).toHaveProperty("decimal");
    expect(result).toHaveProperty("fractional");
    expect(result).toHaveProperty("hongkong");
    expect(result).toHaveProperty("malay");
    expect(result).toHaveProperty("indonesian");
    expect(result).toHaveProperty("impliedProb");
  });
});

// ---------------------------------------------------------------------------
// formatOdds
// ---------------------------------------------------------------------------
describe("formatOdds", () => {
  it("+150, american → '+150'", () => {
    expect(formatOdds(150, "american")).toBe("+150");
  });

  it("-110, american → '-110'", () => {
    expect(formatOdds(-110, "american")).toBe("-110");
  });

  it("0, american → 'EV'", () => {
    expect(formatOdds(0, "american")).toBe("EV");
  });

  it("+150, decimal → '2.50'", () => {
    expect(formatOdds(150, "decimal")).toBe("2.50");
  });

  it("-110, decimal → '1.91'", () => {
    // americanToDecimal(-110) = 100/110+1 = 1.9091
    expect(formatOdds(-110, "decimal")).toBe("1.91");
  });

  it("+150, fractional → '3/2' (net=1.5)", () => {
    expect(formatOdds(150, "fractional")).toBe("3/2");
  });

  it("+150, hongkong → '1.50'", () => {
    expect(formatOdds(150, "hongkong")).toBe("1.50");
  });

  it("+150, malay → '1.50'", () => {
    expect(formatOdds(150, "malay")).toBe("1.50");
  });

  it("-200, malay → '-2.00' (favorite)", () => {
    // dec=1.5, net=0.5, malay = -1/0.5 = -2.0
    expect(formatOdds(-200, "malay")).toBe("-2.00");
  });

  it("+150, indonesian → '1.50'", () => {
    expect(formatOdds(150, "indonesian")).toBe("1.50");
  });

  it("-200, indonesian → '-2.00'", () => {
    expect(formatOdds(-200, "indonesian")).toBe("-2.00");
  });

  it("defaults to american format", () => {
    expect(formatOdds(150)).toBe("+150");
  });
});

// ---------------------------------------------------------------------------
// oddsLabel
// ---------------------------------------------------------------------------
describe("oddsLabel", () => {
  it("+150 → '+150'", () => {
    expect(oddsLabel(150)).toBe("+150");
  });

  it("-110 → '-110'", () => {
    expect(oddsLabel(-110)).toBe("-110");
  });

  it("0 → 'EV'", () => {
    expect(oddsLabel(0)).toBe("EV");
  });
});

// ---------------------------------------------------------------------------
// formatImpliedProb
// ---------------------------------------------------------------------------
describe("formatImpliedProb", () => {
  it("-110 → matches /\\d+\\.\\d%/ pattern", () => {
    expect(formatImpliedProb(-110)).toMatch(/\d+\.\d%/);
  });

  it("+100 → '50.0%'", () => {
    expect(formatImpliedProb(100)).toBe("50.0%");
  });

  it("-110 → '52.4%'", () => {
    // 100/210 * 100 = 47.619...%; wait: prob = 110/210 = 0.52381
    expect(formatImpliedProb(-110)).toBe("52.4%");
  });
});

// ---------------------------------------------------------------------------
// calculateOverround
// ---------------------------------------------------------------------------
describe("calculateOverround", () => {
  it("[-110, -110] → ≈0.0476 (positive overround)", () => {
    // Each side: 110/210 = 0.52381; sum = 1.04762; overround = 0.04762
    const result = calculateOverround([-110, -110]);
    expect(result).toBeCloseTo(0.0476, 3);
  });

  it("[+100, -110] has positive overround", () => {
    const result = calculateOverround([100, -110]);
    expect(result).toBeGreaterThan(0);
  });

  it("[+100, +100] → 0 (no vig, balanced market)", () => {
    // Each: 0.5, sum = 1.0, overround = 0
    expect(calculateOverround([100, 100])).toBeCloseTo(0.0);
  });

  it("three-way market has positive overround", () => {
    // 3-way with -115 each: implied > 1/3 each
    const result = calculateOverround([-115, -115, -115]);
    expect(result).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// removeVig
// ---------------------------------------------------------------------------
describe("removeVig", () => {
  it("[-110, -110] → [0.5, 0.5]", () => {
    const [a, b] = removeVig([-110, -110]);
    expect(a).toBeCloseTo(0.5);
    expect(b).toBeCloseTo(0.5);
  });

  it("fair probs sum to 1.0", () => {
    const probs = removeVig([-110, -110]);
    expect(probs.reduce((s, p) => s + p, 0)).toBeCloseTo(1.0);
  });

  it("[+100, -200] devig proportionally", () => {
    const probs = removeVig([100, -200]);
    // raw: 0.5, 0.6667; sum = 1.1667
    // fair: 0.5/1.1667 ≈ 0.4286, 0.6667/1.1667 ≈ 0.5714
    expect(probs[0]).toBeCloseTo(0.4286, 3);
    expect(probs[1]).toBeCloseTo(0.5714, 3);
    expect(probs[0]! + probs[1]!).toBeCloseTo(1.0);
  });
});

// ---------------------------------------------------------------------------
// fairDecimalOdds
// ---------------------------------------------------------------------------
describe("fairDecimalOdds", () => {
  it("[0.5, 0.5] → [2.0, 2.0]", () => {
    const [a, b] = fairDecimalOdds([0.5, 0.5]);
    expect(a).toBeCloseTo(2.0);
    expect(b).toBeCloseTo(2.0);
  });

  it("[0.25, 0.75] → [4.0, 1.333]", () => {
    const [a, b] = fairDecimalOdds([0.25, 0.75]);
    expect(a).toBeCloseTo(4.0);
    expect(b).toBeCloseTo(1.3333, 3);
  });
});

// ---------------------------------------------------------------------------
// spreadLineToOdds
// ---------------------------------------------------------------------------
describe("spreadLineToOdds", () => {
  it("returns default -110/-110", () => {
    const { favorite, underdog } = spreadLineToOdds(3.5);
    expect(favorite).toBe(-110);
    expect(underdog).toBe(-110);
  });

  it("accepts custom juice", () => {
    const { favorite, underdog } = spreadLineToOdds(7, -115);
    expect(favorite).toBe(-115);
    expect(underdog).toBe(-115);
  });
});

// ---------------------------------------------------------------------------
// isValidAmerican
// ---------------------------------------------------------------------------
describe("isValidAmerican", () => {
  it("150 → true", () => {
    expect(isValidAmerican(150)).toBe(true);
  });

  it("-110 → true", () => {
    expect(isValidAmerican(-110)).toBe(true);
  });

  it("0 → true (EV)", () => {
    expect(isValidAmerican(0)).toBe(true);
  });

  it("Infinity → false", () => {
    expect(isValidAmerican(Infinity)).toBe(false);
  });

  it("-Infinity → false", () => {
    expect(isValidAmerican(-Infinity)).toBe(false);
  });

  it("NaN → false", () => {
    expect(isValidAmerican(NaN)).toBe(false);
  });

  it("10001 → false (out of range)", () => {
    expect(isValidAmerican(10001)).toBe(false);
  });

  it("-9999 → true (within range)", () => {
    expect(isValidAmerican(-9999)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isValidDecimal
// ---------------------------------------------------------------------------
describe("isValidDecimal", () => {
  it("2.0 → true", () => {
    expect(isValidDecimal(2.0)).toBe(true);
  });

  it("1.001 → true", () => {
    expect(isValidDecimal(1.001)).toBe(true);
  });

  it("1.0 → false (must be > 1)", () => {
    expect(isValidDecimal(1.0)).toBe(false);
  });

  it("0.5 → false", () => {
    expect(isValidDecimal(0.5)).toBe(false);
  });

  it("Infinity → false", () => {
    expect(isValidDecimal(Infinity)).toBe(false);
  });

  it("NaN → false", () => {
    expect(isValidDecimal(NaN)).toBe(false);
  });
});
