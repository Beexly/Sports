import { describe, expect, it } from "vitest";
import {
  americanToDecimal,
  americanToImpliedProbability,
  combineParlayLegs,
  computeClvBpsTool,
  decimalToAmerican,
  decimalToImpliedProbability,
  expectedValuePerDollar,
  impliedProbabilityToAmerican,
  impliedProbabilityToDecimal,
  isValidAmericanOdds,
  isValidDecimalOdds,
  noVigFairProbabilities,
  NO_VIG_METHOD_NOTE,
  parseOddsInputToDecimal,
  PARLAY_CORRELATION_CAVEAT,
  vigPercentage,
  analyzeLineMovement,
} from "./betting-math";

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

// ───────────────────────────── validity gates ─────────────────────────────

describe("isValidAmericanOdds", () => {
  it("accepts the +/-100 boundary", () => {
    expect(isValidAmericanOdds(100)).toBe(true);
    expect(isValidAmericanOdds(-100)).toBe(true);
  });

  it("accepts typical values on both sides", () => {
    expect(isValidAmericanOdds(150)).toBe(true);
    expect(isValidAmericanOdds(-110)).toBe(true);
    expect(isValidAmericanOdds(-10000)).toBe(true);
  });

  it("rejects 0", () => {
    expect(isValidAmericanOdds(0)).toBe(false);
  });

  it("rejects magnitudes below 100 (e.g. -50, +50, -99, 99)", () => {
    expect(isValidAmericanOdds(-50)).toBe(false);
    expect(isValidAmericanOdds(50)).toBe(false);
    expect(isValidAmericanOdds(-99)).toBe(false);
    expect(isValidAmericanOdds(99)).toBe(false);
    expect(isValidAmericanOdds(-99.9)).toBe(false);
  });

  it("rejects non-finite input", () => {
    expect(isValidAmericanOdds(NaN)).toBe(false);
    expect(isValidAmericanOdds(Infinity)).toBe(false);
    expect(isValidAmericanOdds(-Infinity)).toBe(false);
  });
});

describe("isValidDecimalOdds", () => {
  it("accepts anything finite and > 1", () => {
    expect(isValidDecimalOdds(1.01)).toBe(true);
    expect(isValidDecimalOdds(2)).toBe(true);
    expect(isValidDecimalOdds(1000)).toBe(true);
  });

  it("rejects <= 1, non-finite, and negative values", () => {
    expect(isValidDecimalOdds(1)).toBe(false);
    expect(isValidDecimalOdds(0.5)).toBe(false);
    expect(isValidDecimalOdds(0)).toBe(false);
    expect(isValidDecimalOdds(-2)).toBe(false);
    expect(isValidDecimalOdds(NaN)).toBe(false);
    expect(isValidDecimalOdds(Infinity)).toBe(false);
  });
});

// ───────────────────── American <-> decimal <-> implied probability ─────────────────────

describe("americanToDecimal", () => {
  it("converts the +100 / -100 boundary to decimal 2.0 both ways", () => {
    expect(americanToDecimal(100)).toBeCloseTo(2.0, 10);
    expect(americanToDecimal(-100)).toBeCloseTo(2.0, 10);
  });

  it("converts a positive (underdog) price", () => {
    // +150 -> 1 + 150/100 = 2.5
    expect(americanToDecimal(150)).toBeCloseTo(2.5, 10);
    // +200 -> 3.0
    expect(americanToDecimal(200)).toBeCloseTo(3.0, 10);
  });

  it("converts a negative (favorite) price", () => {
    // -110 -> 1 + 100/110 = 1.909090...
    expect(americanToDecimal(-110)).toBeCloseTo(1.9090909091, 8);
    // -200 -> 1 + 100/200 = 1.5
    expect(americanToDecimal(-200)).toBeCloseTo(1.5, 10);
  });

  it("rejects invalid American odds (0, sub-100 magnitude, non-finite)", () => {
    expect(americanToDecimal(0)).toBeNull();
    expect(americanToDecimal(-50)).toBeNull();
    expect(americanToDecimal(50)).toBeNull();
    expect(americanToDecimal(NaN)).toBeNull();
    expect(americanToDecimal(Infinity)).toBeNull();
  });
});

describe("decimalToAmerican", () => {
  it("resolves the decimal-2.0 boundary to the canonical +100 form", () => {
    expect(decimalToAmerican(2.0)).toBe(100);
  });

  it("converts decimal >= 2.0 to the plus form", () => {
    expect(decimalToAmerican(2.5)).toBe(150);
    expect(decimalToAmerican(3.0)).toBe(200);
  });

  it("converts decimal < 2.0 to the minus form", () => {
    expect(decimalToAmerican(1.5)).toBe(-200);
    // 1.9090909... -> -100 / 0.909090... = -110
    expect(decimalToAmerican(1.909090909)).toBe(-110);
  });

  it("rejects invalid decimal odds (<= 1, non-finite)", () => {
    expect(decimalToAmerican(1)).toBeNull();
    expect(decimalToAmerican(0.5)).toBeNull();
    expect(decimalToAmerican(NaN)).toBeNull();
    expect(decimalToAmerican(Infinity)).toBeNull();
  });

  it("round-trips cleanly for values away from the +/-100 boundary", () => {
    for (const american of [150, 200, 300, -110, -150, -200, -500]) {
      const decimal = americanToDecimal(american)!;
      expect(decimalToAmerican(decimal)).toBe(american);
    }
  });

  it("documents the +100/-100 boundary is NOT a round trip (both collapse to +100)", () => {
    expect(decimalToAmerican(americanToDecimal(-100)!)).toBe(100);
    expect(decimalToAmerican(americanToDecimal(100)!)).toBe(100);
  });
});

describe("decimalToImpliedProbability / impliedProbabilityToDecimal", () => {
  it("inverts a decimal price", () => {
    expect(decimalToImpliedProbability(2)).toBeCloseTo(0.5, 10);
    expect(decimalToImpliedProbability(4)).toBeCloseTo(0.25, 10);
  });

  it("rejects invalid decimal input", () => {
    expect(decimalToImpliedProbability(1)).toBeNull();
    expect(decimalToImpliedProbability(0)).toBeNull();
    expect(decimalToImpliedProbability(-1.5)).toBeNull();
    expect(decimalToImpliedProbability(NaN)).toBeNull();
  });

  it("round-trips probability -> decimal -> probability", () => {
    for (const p of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const decimal = impliedProbabilityToDecimal(p)!;
      expect(decimalToImpliedProbability(decimal)).toBeCloseTo(p, 10);
    }
  });

  it("rejects probability outside the open interval (0, 1)", () => {
    expect(impliedProbabilityToDecimal(0)).toBeNull();
    expect(impliedProbabilityToDecimal(1)).toBeNull();
    expect(impliedProbabilityToDecimal(-0.1)).toBeNull();
    expect(impliedProbabilityToDecimal(1.1)).toBeNull();
    expect(impliedProbabilityToDecimal(NaN)).toBeNull();
  });
});

describe("americanToImpliedProbability / impliedProbabilityToAmerican", () => {
  it("matches decimal-composed values", () => {
    expect(americanToImpliedProbability(-110)).toBeCloseTo(1 / americanToDecimal(-110)!, 10);
    expect(americanToImpliedProbability(150)).toBeCloseTo(1 / americanToDecimal(150)!, 10);
  });

  it("+100/-100 both imply exactly 0.5", () => {
    expect(americanToImpliedProbability(100)).toBeCloseTo(0.5, 10);
    expect(americanToImpliedProbability(-100)).toBeCloseTo(0.5, 10);
  });

  it("round-trips probability -> American -> probability", () => {
    for (const p of [0.2, 0.4, 0.6, 0.8]) {
      const american = impliedProbabilityToAmerican(p)!;
      expect(americanToImpliedProbability(american)).toBeCloseTo(p, 2);
    }
  });

  it("propagates invalid input as null through the composition", () => {
    expect(americanToImpliedProbability(0)).toBeNull();
    expect(americanToImpliedProbability(-50)).toBeNull();
    expect(impliedProbabilityToAmerican(0)).toBeNull();
    expect(impliedProbabilityToAmerican(1)).toBeNull();
  });
});

describe("parseOddsInputToDecimal", () => {
  it("parses a valid American string", () => {
    expect(parseOddsInputToDecimal("-110", "american")).toBeCloseTo(1.909090909, 8);
    expect(parseOddsInputToDecimal("+150", "american")).toBeCloseTo(2.5, 10);
    expect(parseOddsInputToDecimal("150", "american")).toBeCloseTo(2.5, 10);
  });

  it("parses a valid decimal string", () => {
    expect(parseOddsInputToDecimal("1.91", "decimal")).toBeCloseTo(1.91, 10);
    expect(parseOddsInputToDecimal("2", "decimal")).toBeCloseTo(2, 10);
  });

  it("trims surrounding whitespace", () => {
    expect(parseOddsInputToDecimal("  -110  ", "american")).toBeCloseTo(1.909090909, 8);
  });

  it("returns null for empty or whitespace-only input", () => {
    expect(parseOddsInputToDecimal("", "american")).toBeNull();
    expect(parseOddsInputToDecimal("   ", "decimal")).toBeNull();
  });

  it("returns null for non-numeric garbage", () => {
    expect(parseOddsInputToDecimal("abc", "american")).toBeNull();
    expect(parseOddsInputToDecimal("--110", "american")).toBeNull();
    expect(parseOddsInputToDecimal("1.5.5", "decimal")).toBeNull();
  });

  it("returns null for a value invalid in the given format", () => {
    // -50 is not valid American notation (magnitude < 100).
    expect(parseOddsInputToDecimal("-50", "american")).toBeNull();
    // 1 is not a valid decimal price (must be > 1).
    expect(parseOddsInputToDecimal("1", "decimal")).toBeNull();
    expect(parseOddsInputToDecimal("0.5", "decimal")).toBeNull();
  });
});

// ───────────────────────────── expected value ─────────────────────────────

describe("expectedValuePerDollar", () => {
  it("is zero at the market's own implied probability (no edge)", () => {
    for (const decimal of [1.5, 1.91, 2.0, 2.5, 3.2]) {
      const impliedP = decimalToImpliedProbability(decimal)!;
      expect(expectedValuePerDollar(impliedP, decimal)).toBeCloseTo(0, 8);
    }
  });

  it("is positive when your probability estimate beats the implied probability", () => {
    // decimal 2.0 implies 0.5; believing 0.6 is a positive-EV bet.
    expect(expectedValuePerDollar(0.6, 2.0)).toBeCloseTo(0.2, 10);
  });

  it("is negative when your probability estimate is worse than implied", () => {
    // decimal 2.0 implies 0.5; believing 0.4 is a negative-EV bet.
    expect(expectedValuePerDollar(0.4, 2.0)).toBeCloseTo(-0.2, 10);
  });

  it("matches the hand-computed worked example: p=0.55, decimal=2.10", () => {
    // EV = 0.55 * 2.10 - 1 = 1.155 - 1 = 0.155
    expect(expectedValuePerDollar(0.55, 2.1)).toBeCloseTo(0.155, 10);
  });

  it("rejects probability outside [0, 1] and invalid decimal price", () => {
    expect(expectedValuePerDollar(-0.1, 2.0)).toBeNull();
    expect(expectedValuePerDollar(1.1, 2.0)).toBeNull();
    expect(expectedValuePerDollar(0.5, 1)).toBeNull();
    expect(expectedValuePerDollar(0.5, NaN)).toBeNull();
  });

  it("accepts the probability boundaries 0 and 1", () => {
    expect(expectedValuePerDollar(0, 2.0)).toBeCloseTo(-1, 10);
    expect(expectedValuePerDollar(1, 2.0)).toBeCloseTo(1, 10);
  });
});

// ───────────────── no-vig fair probability — PARITY with devig.ts proportionalDevig ─────────────────
//
// Fixture values copied from
// packages/prediction-engine/src/edge-lab/__tests__/devig.test.ts so a drift
// between this reimplementation and the engine's own convention fails here.

describe("noVigFairProbabilities — devig.ts proportionalDevig parity", () => {
  it("splits a balanced two-way book 50/50 (fixture: [1.91, 1.91])", () => {
    const probs = noVigFairProbabilities([1.91, 1.91]);
    expect(probs).not.toBeNull();
    expect(probs![0]!).toBeCloseTo(0.5, 6);
    expect(probs![1]!).toBeCloseTo(0.5, 6);
    expect(sum(probs!)).toBeCloseTo(1, 10);
  });

  it("sums to 1 and preserves ordering on an unbalanced book (fixture: [1.87, 1.95])", () => {
    const probs = noVigFairProbabilities([1.87, 1.95]);
    expect(probs).not.toBeNull();
    expect(sum(probs!)).toBeCloseTo(1, 10);
    expect(probs![0]!).toBeGreaterThan(probs![1]!);
    // Exact parity fixture from devig.test.ts.
    expect(probs![0]!).toBeCloseTo(1 / 1.87 / (1 / 1.87 + 1 / 1.95), 10);
  });

  it("computes each fair prob as raw implied / overround (fixture: [1.87, 1.95])", () => {
    const decimalOdds = [1.87, 1.95];
    const overround = 1 / decimalOdds[0]! + 1 / decimalOdds[1]!;
    expect(overround).toBeGreaterThan(1);
    const probs = noVigFairProbabilities(decimalOdds)!;
    expect(probs[0]!).toBeCloseTo(1 / decimalOdds[0]! / overround, 10);
    expect(probs[1]!).toBeCloseTo(1 / decimalOdds[1]! / overround, 10);
  });

  it("refuses a sub-vig (crossed/stale) market — same fixture as devig.test.ts ([2.1, 2.1])", () => {
    expect(noVigFairProbabilities([2.1, 2.1])).toBeNull();
  });

  it("refuses invalid prices — same fixtures as devig.test.ts", () => {
    expect(noVigFairProbabilities([1, 2])).toBeNull();
    expect(noVigFairProbabilities([0.5, 2])).toBeNull();
    expect(noVigFairProbabilities([Infinity, 2])).toBeNull();
    expect(noVigFairProbabilities([NaN, 2])).toBeNull();
    expect(noVigFairProbabilities([])).toBeNull();
  });

  it("handles a 3-way market (fixture: [2.5, 3.2, 2.9])", () => {
    const probs = noVigFairProbabilities([2.5, 3.2, 2.9]);
    expect(probs).not.toBeNull();
    expect(sum(probs!)).toBeCloseTo(1, 10);
    expect(probs!.every((p) => p > 0 && p < 1)).toBe(true);
  });

  it("exposes the proportional-method honesty note", () => {
    expect(NO_VIG_METHOD_NOTE.toLowerCase()).toContain("proportional");
    expect(NO_VIG_METHOD_NOTE.toLowerCase()).toContain("shin");
  });
});

// ───────────────────────────── vig / hold percentage ─────────────────────────────

describe("vigPercentage", () => {
  it("is 0 for a perfectly fair book", () => {
    // 1/1.20 + 1/6.00 = 1 exactly.
    expect(vigPercentage([1.2, 6.0])).toBeCloseTo(0, 8);
  });

  it("is positive for a normal vigged book (fixture: [1.91, 1.91])", () => {
    const expected = (1 / 1.91 + 1 / 1.91 - 1) * 100;
    expect(vigPercentage([1.91, 1.91])).toBeCloseTo(expected, 8);
    expect(vigPercentage([1.91, 1.91])!).toBeGreaterThan(0);
  });

  it("is negative (not refused) for a sub-vig/crossed market, unlike noVigFairProbabilities", () => {
    const result = vigPercentage([2.1, 2.1]);
    expect(result).not.toBeNull();
    expect(result!).toBeLessThan(0);
    // Confirms the deliberate divergence from the no-vig refusal guard.
    expect(noVigFairProbabilities([2.1, 2.1])).toBeNull();
  });

  it("rejects structurally invalid prices", () => {
    expect(vigPercentage([1, 2])).toBeNull();
    expect(vigPercentage([NaN, 2])).toBeNull();
    expect(vigPercentage([])).toBeNull();
  });

  it("handles a 3-way market", () => {
    const decimalOdds = [2.5, 3.2, 2.9];
    const expected = (1 / 2.5 + 1 / 3.2 + 1 / 2.9 - 1) * 100;
    expect(vigPercentage(decimalOdds)).toBeCloseTo(expected, 8);
  });
});

// ───────────────────────────── parlay ─────────────────────────────

describe("combineParlayLegs", () => {
  it("multiplies decimal prices and derives the implied probability", () => {
    const result = combineParlayLegs([2.0, 2.0]);
    expect(result).not.toBeNull();
    expect(result!.combinedDecimal).toBeCloseTo(4.0, 10);
    expect(result!.impliedProbability).toBeCloseTo(0.25, 10);
    expect(result!.combinedAmerican).toBe(300); // decimal 4.0 -> (4-1)*100
  });

  it("matches the product of each leg's own implied probability", () => {
    const legs = [1.91, 2.5, 1.8];
    const result = combineParlayLegs(legs)!;
    const productOfImplied = legs.reduce((acc, d) => acc * (1 / d), 1);
    expect(result.impliedProbability).toBeCloseTo(productOfImplied, 10);
  });

  it("handles a 3-leg parlay with mixed favorites/underdogs", () => {
    // -110, -110, +150 -> decimals 1.9090909..., 1.9090909..., 2.5
    const legs = [americanToDecimal(-110)!, americanToDecimal(-110)!, americanToDecimal(150)!];
    const result = combineParlayLegs(legs)!;
    const expectedDecimal = legs[0]! * legs[1]! * legs[2]!;
    expect(result.combinedDecimal).toBeCloseTo(expectedDecimal, 10);
  });

  it("rejects fewer than 2 legs", () => {
    expect(combineParlayLegs([])).toBeNull();
    expect(combineParlayLegs([2.0])).toBeNull();
  });

  it("rejects if any leg has an invalid decimal price", () => {
    expect(combineParlayLegs([2.0, 1])).toBeNull();
    expect(combineParlayLegs([2.0, NaN])).toBeNull();
    expect(combineParlayLegs([2.0, 0.5])).toBeNull();
  });

  it("exposes the independence/correlation-not-modeled caveat", () => {
    expect(PARLAY_CORRELATION_CAVEAT.toLowerCase()).toContain("independent");
    expect(PARLAY_CORRELATION_CAVEAT.toLowerCase()).toContain("correlat");
    expect(PARLAY_CORRELATION_CAVEAT.toLowerCase()).toContain("same-game");
  });
});

// ───────────────────── CLV — PARITY with ledger-chain.ts computeClvBps ─────────────────────
//
// Fixture values copied from
// packages/prediction-engine/src/edge-lab/__tests__/ledger-chain.test.ts
// ("computeClvBps — sign convention") so a drift in formula or sign fails here.

describe("computeClvBpsTool — ledger-chain.ts computeClvBps parity", () => {
  it("decision 2.10, close 1.95 -> POSITIVE (beat the close): +366.30", () => {
    const bps = computeClvBpsTool(2.1, 1.95);
    expect(bps).toBeCloseTo(366.3, 2);
    expect(bps!).toBeGreaterThan(0);
  });

  it("decision 1.90, close 1.95 -> NEGATIVE (lost value to the close): -134.95", () => {
    const bps = computeClvBpsTool(1.9, 1.95);
    expect(bps).toBeCloseTo(-134.95, 2);
    expect(bps!).toBeLessThan(0);
  });

  it("is exactly zero when decision price equals closing price", () => {
    expect(computeClvBpsTool(1.95, 1.95)).toBeCloseTo(0, 8);
  });

  it("returns null (not a throw) for non-finite or sub-1 decimal prices", () => {
    expect(computeClvBpsTool(1, 1.95)).toBeNull();
    expect(computeClvBpsTool(2.1, 0)).toBeNull();
    expect(computeClvBpsTool(NaN, 1.95)).toBeNull();
    expect(computeClvBpsTool(2.1, Infinity)).toBeNull();
  });

  it("rounds to 2 decimal places, same as the engine's round(value, 2)", () => {
    const bps = computeClvBpsTool(2.05, 1.98)!;
    expect(bps).toBe(Math.round(10000 * (1 / 1.98 - 1 / 2.05) * 100) / 100);
  });
});


describe("analyzeLineMovement", () => {
  it("classifies moneyline shortening (favorite)", () => {
    const m = analyzeLineMovement({ openOdds: -140, closeOdds: -160 });
    expect(m?.moneyline?.direction).toBe("shortened");
    expect(m?.moneyline?.movedToward).toBe("favorite");
    expect(m?.moneyline?.probShift).toBeGreaterThan(0);
  });

  it("classifies spread move toward favorite", () => {
    const m = analyzeLineMovement({
      openLine: -6.5,
      closeLine: -7.5,
      marketType: "spread",
    });
    expect(m?.line?.direction).toBe("moved toward favorite");
  });

  it("returns null without usable inputs", () => {
    expect(analyzeLineMovement({})).toBeNull();
    expect(analyzeLineMovement({ openOdds: -50, closeOdds: -60 })).toBeNull();
  });
});
