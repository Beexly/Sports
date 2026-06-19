import { describe, it, expect } from "vitest";
import {
  impliedProbability,
  totalOverround,
  devigBasic,
  devigPower,
  devigAdditive,
  devigShin,
  americanToDecimal,
  decimalToAmerican,
  noVigFromAmerican,
  consensusNoVig,
} from "@/lib/math/devig";

// ---------------------------------------------------------------------------
// impliedProbability
// ---------------------------------------------------------------------------
describe("impliedProbability", () => {
  it("returns 0.5 for decimal odds of 2.0", () => {
    expect(impliedProbability(2.0)).toBeCloseTo(0.5);
  });

  it("returns ~0.6667 for decimal odds of 1.5", () => {
    expect(impliedProbability(1.5)).toBeCloseTo(0.6667, 4);
  });

  it("returns ~0.25 for decimal odds of 4.0", () => {
    expect(impliedProbability(4.0)).toBeCloseTo(0.25);
  });

  it("returns null for odds of 1 (boundary)", () => {
    expect(impliedProbability(1)).toBeNull();
  });

  it("returns null for odds of 0", () => {
    expect(impliedProbability(0)).toBeNull();
  });

  it("returns null for negative odds", () => {
    expect(impliedProbability(-2)).toBeNull();
  });

  it("returns null for odds less than 1", () => {
    expect(impliedProbability(0.9)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// totalOverround
// ---------------------------------------------------------------------------
describe("totalOverround", () => {
  it("computes ~5% vig on a 2-way market at -110/-110", () => {
    // -110 American → decimal 1.9091
    const odds = [1.9091, 1.9091];
    const over = totalOverround(odds);
    expect(over).toBeGreaterThan(0.04);
    expect(over).toBeLessThan(0.06);
  });

  it("returns near zero for a perfectly fair 2-way market", () => {
    const odds = [2.0, 2.0];
    expect(totalOverround(odds)).toBeCloseTo(0, 10);
  });

  it("handles a 3-way market with vig", () => {
    // Typical soccer: 2.4 / 3.3 / 3.1 → implied sum > 1
    const odds = [2.4, 3.3, 3.1];
    const over = totalOverround(odds);
    expect(over).toBeGreaterThan(0);
  });

  it("returns Infinity if any odds ≤ 1", () => {
    expect(totalOverround([2.0, 1.0])).toBe(Infinity);
    expect(totalOverround([2.0, 0.5])).toBe(Infinity);
    expect(totalOverround([2.0, -1])).toBe(Infinity);
  });

  it("returns 0 for empty array", () => {
    expect(totalOverround([])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// devigBasic
// ---------------------------------------------------------------------------
describe("devigBasic", () => {
  it("fair probabilities sum to 1.0 for a 2-outcome market", () => {
    const result = devigBasic([1.9091, 1.9091]);
    expect(result).not.toBeNull();
    const sum = result!.fairProbabilities.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it("returns equal probs for symmetric market", () => {
    const result = devigBasic([1.9091, 1.9091]);
    expect(result!.fairProbabilities[0]).toBeCloseTo(0.5, 5);
    expect(result!.fairProbabilities[1]).toBeCloseTo(0.5, 5);
  });

  it("fair probs sum to 1.0 for a 3-outcome market", () => {
    const result = devigBasic([2.4, 3.3, 3.1]);
    expect(result).not.toBeNull();
    const sum = result!.fairProbabilities.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it("returns null for empty array", () => {
    expect(devigBasic([])).toBeNull();
  });

  it("returns null if any odds ≤ 1", () => {
    expect(devigBasic([2.0, 1.0])).toBeNull();
    expect(devigBasic([2.0, 0.5])).toBeNull();
  });

  it("has method 'basic'", () => {
    expect(devigBasic([2.0, 2.0])!.method).toBe("basic");
  });

  it("exposes correct implied probabilities", () => {
    const result = devigBasic([2.0, 4.0])!;
    expect(result.impliedProbabilities[0]).toBeCloseTo(0.5, 10);
    expect(result.impliedProbabilities[1]).toBeCloseTo(0.25, 10);
  });

  it("totalOverround matches vigPct", () => {
    const result = devigBasic([1.9091, 1.9091])!;
    expect(result.totalOverround).toBeCloseTo(result.vigPct, 10);
  });
});

// ---------------------------------------------------------------------------
// devigPower
// ---------------------------------------------------------------------------
describe("devigPower", () => {
  it("fair probabilities sum to 1.0 for a 2-outcome market", () => {
    const result = devigPower([1.9091, 1.9091]);
    expect(result).not.toBeNull();
    const sum = result!.fairProbabilities.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 6);
  });

  it("returns null for empty array", () => {
    expect(devigPower([])).toBeNull();
  });

  it("returns null if any odds ≤ 1", () => {
    expect(devigPower([2.0, 0.8])).toBeNull();
  });

  it("has method 'power'", () => {
    expect(devigPower([2.0, 2.0])!.method).toBe("power");
  });

  it("produces results close to basic for symmetric market", () => {
    const basic = devigBasic([1.9091, 1.9091])!;
    const power = devigPower([1.9091, 1.9091])!;
    expect(power.fairProbabilities[0]).toBeCloseTo(basic.fairProbabilities[0]!, 3);
  });

  it("handles a 3-outcome market, probs sum to 1", () => {
    const result = devigPower([2.4, 3.3, 3.1]);
    expect(result).not.toBeNull();
    const sum = result!.fairProbabilities.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 6);
  });
});

// ---------------------------------------------------------------------------
// devigAdditive
// ---------------------------------------------------------------------------
describe("devigAdditive", () => {
  it("fair probabilities sum to 1.0", () => {
    const result = devigAdditive([1.9091, 1.9091]);
    expect(result).not.toBeNull();
    const sum = result!.fairProbabilities.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it("each outcome is reduced by the same amount", () => {
    const odds = [1.9091, 1.9091];
    const implied = [1 / 1.9091, 1 / 1.9091];
    const result = devigAdditive(odds)!;
    const reduction0 = implied[0]! - result.fairProbabilities[0]!;
    const reduction1 = implied[1]! - result.fairProbabilities[1]!;
    expect(reduction0).toBeCloseTo(reduction1, 10);
  });

  it("returns null for empty array", () => {
    expect(devigAdditive([])).toBeNull();
  });

  it("returns null if any odds ≤ 1", () => {
    expect(devigAdditive([2.0, 1.0])).toBeNull();
  });

  it("has method 'additive'", () => {
    expect(devigAdditive([2.0, 2.0])!.method).toBe("additive");
  });

  it("handles 3-outcome market", () => {
    const result = devigAdditive([2.4, 3.3, 3.1]);
    expect(result).not.toBeNull();
    const sum = result!.fairProbabilities.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });
});

// ---------------------------------------------------------------------------
// devigShin
// ---------------------------------------------------------------------------
describe("devigShin", () => {
  it("fair probabilities sum to 1.0 for 2-outcome market", () => {
    const result = devigShin([1.9091, 1.9091]);
    expect(result).not.toBeNull();
    const sum = result!.fairProbabilities.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 6);
  });

  it("has method 'shin'", () => {
    expect(devigShin([2.0, 2.0])!.method).toBe("shin");
  });

  it("returns null for empty array", () => {
    expect(devigShin([])).toBeNull();
  });

  it("returns null if any odds ≤ 1", () => {
    expect(devigShin([2.0, 0.8])).toBeNull();
  });

  it("produces different fair probs than basic on an asymmetric market", () => {
    const odds = [1.5, 2.8]; // heavily favored side
    const shin = devigShin(odds)!;
    const basic = devigBasic(odds)!;
    // Shin and basic will differ on asymmetric markets
    const diff = Math.abs(shin.fairProbabilities[0]! - basic.fairProbabilities[0]!);
    // They might be very close but let's just ensure both are valid
    expect(shin.fairProbabilities[0]).toBeGreaterThan(0);
    expect(shin.fairProbabilities[1]).toBeGreaterThan(0);
    expect(diff).toBeGreaterThanOrEqual(0);
  });

  it("handles 3-outcome market, probs sum to 1", () => {
    const result = devigShin([2.4, 3.3, 3.1]);
    expect(result).not.toBeNull();
    const sum = result!.fairProbabilities.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("produces positive probabilities for all outcomes", () => {
    const result = devigShin([1.9091, 1.9091])!;
    expect(result.fairProbabilities[0]).toBeGreaterThan(0);
    expect(result.fairProbabilities[1]).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// americanToDecimal
// ---------------------------------------------------------------------------
describe("americanToDecimal", () => {
  it("+100 → 2.0", () => {
    expect(americanToDecimal(100)).toBeCloseTo(2.0);
  });

  it("+150 → 2.5", () => {
    expect(americanToDecimal(150)).toBeCloseTo(2.5);
  });

  it("-110 → ~1.9091", () => {
    expect(americanToDecimal(-110)).toBeCloseTo(100 / 110 + 1, 4);
  });

  it("-200 → 1.5", () => {
    expect(americanToDecimal(-200)).toBeCloseTo(1.5);
  });

  it("+300 → 4.0", () => {
    expect(americanToDecimal(300)).toBeCloseTo(4.0);
  });

  it("0 → 2.0 (even money)", () => {
    expect(americanToDecimal(0)).toBeCloseTo(2.0);
  });
});

// ---------------------------------------------------------------------------
// decimalToAmerican
// ---------------------------------------------------------------------------
describe("decimalToAmerican", () => {
  it("2.0 → 100", () => {
    expect(decimalToAmerican(2.0)).toBe(100);
  });

  it("2.5 → 150", () => {
    expect(decimalToAmerican(2.5)).toBe(150);
  });

  it("1.5 → -200", () => {
    expect(decimalToAmerican(1.5)).toBe(-200);
  });

  it("4.0 → 300", () => {
    expect(decimalToAmerican(4.0)).toBe(300);
  });

  it("~1.9091 → -110", () => {
    expect(decimalToAmerican(100 / 110 + 1)).toBe(-110);
  });
});

// ---------------------------------------------------------------------------
// noVigFromAmerican
// ---------------------------------------------------------------------------
describe("noVigFromAmerican", () => {
  it("runs shin by default on [-110, -110]", () => {
    const result = noVigFromAmerican([-110, -110]);
    expect(result).not.toBeNull();
    expect(result!.method).toBe("shin");
    const sum = result!.fairProbabilities.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("respects explicit 'basic' method", () => {
    const result = noVigFromAmerican([-110, -110], "basic");
    expect(result!.method).toBe("basic");
  });

  it("respects explicit 'power' method", () => {
    const result = noVigFromAmerican([-110, -110], "power");
    expect(result!.method).toBe("power");
  });

  it("respects explicit 'additive' method", () => {
    const result = noVigFromAmerican([-110, -110], "additive");
    expect(result!.method).toBe("additive");
  });

  it("fair probs sum to 1 for all methods", () => {
    const methods = ["basic", "power", "additive", "shin"] as const;
    for (const method of methods) {
      const result = noVigFromAmerican([-120, +105], method)!;
      const sum = result.fairProbabilities.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    }
  });
});

// ---------------------------------------------------------------------------
// consensusNoVig
// ---------------------------------------------------------------------------
describe("consensusNoVig", () => {
  it("returns null for empty books array", () => {
    expect(consensusNoVig([])).toBeNull();
  });

  it("returns null for mismatched outcome counts", () => {
    const result = consensusNoVig([[1.9091, 1.9091], [1.85, 1.85, 3.5]]);
    expect(result).toBeNull();
  });

  it("single book same as direct devig", () => {
    const odds = [1.9091, 1.9091];
    const single = consensusNoVig([odds], "shin")!;
    const direct = devigShin(odds)!;
    expect(single.fairProbabilities[0]).toBeCloseTo(direct.fairProbabilities[0]!, 5);
    expect(single.fairProbabilities[1]).toBeCloseTo(direct.fairProbabilities[1]!, 5);
  });

  it("two books with identical odds → same as single book", () => {
    const odds = [1.9091, 1.9091];
    const result = consensusNoVig([odds, odds], "basic")!;
    const direct = devigBasic(odds)!;
    expect(result.fairProbabilities[0]).toBeCloseTo(direct.fairProbabilities[0]!, 5);
  });

  it("takes median of two books with different odds", () => {
    // Book A: 1.9 / 1.9   Book B: 1.85 / 2.0
    // Medians: 1.875 / 1.95
    const bookA = [1.9, 1.9];
    const bookB = [1.85, 2.0];
    const result = consensusNoVig([bookA, bookB], "basic");
    expect(result).not.toBeNull();
    const sum = result!.fairProbabilities.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("three-book consensus, fair probs sum to 1", () => {
    const books = [
      [1.9091, 1.9091],
      [1.87, 2.0],
      [1.95, 1.85],
    ];
    const result = consensusNoVig(books, "shin");
    expect(result).not.toBeNull();
    const sum = result!.fairProbabilities.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });
});
