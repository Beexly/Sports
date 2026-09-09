import { describe, expect, it } from "vitest";
import { americanToDecimal, deVigFairProbs } from "../galaxy-devig.js";

describe("americanToDecimal", () => {
  it("converts favorites and dogs", () => {
    expect(americanToDecimal(-150)).toBeCloseTo(1.6667, 4);
    expect(americanToDecimal(130)).toBeCloseTo(2.3, 4);
  });

  it("refuses zero and non-finite input", () => {
    expect(americanToDecimal(0)).toBeNull();
    expect(americanToDecimal(Number.NaN)).toBeNull();
    expect(americanToDecimal(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("deVigFairProbs", () => {
  it("normalises a two-way quote so the sides sum to 1", () => {
    const fair = deVigFairProbs([
      { name: "Away", price: 122 },
      { name: "Home", price: -146 },
    ]);
    expect(fair["Home"]).toBeGreaterThan(0.5);
    expect(fair["Away"]).toBeLessThan(0.5);
    expect((fair["Home"] ?? 0) + (fair["Away"] ?? 0)).toBeCloseTo(1, 3);
  });

  it("returns nothing when fewer than two sides are priced (never invents a complement)", () => {
    expect(deVigFairProbs([{ name: "Home", price: -146 }, { name: "Away" }])).toEqual({});
    expect(deVigFairProbs([])).toEqual({});
  });
});
