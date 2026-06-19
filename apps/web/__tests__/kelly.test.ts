import { describe, expect, it } from "vitest";
import {
  americanToDecimal,
  basicDevig,
  breakEvenProb,
  expectedValue,
  fractionalKelly,
  kellyFraction,
  kellyFromAmerican,
} from "../lib/math/kelly";

describe("americanToDecimal", () => {
  it("converts positive American odds correctly", () => {
    expect(americanToDecimal(100)).toBe(2.0);
    expect(americanToDecimal(200)).toBe(3.0);
  });
  it("converts negative American odds correctly", () => {
    expect(americanToDecimal(-110)).toBeCloseTo(1.909, 2);
    expect(americanToDecimal(-200)).toBe(1.5);
  });
});

describe("kellyFraction", () => {
  it("returns 0 for negative expected value", () => {
    // 50% win prob at -110 (55% break-even needed) → no bet
    expect(kellyFraction(0.5, americanToDecimal(-110) - 1)).toBe(0);
  });
  it("returns positive fraction for positive edge", () => {
    // 60% win prob at -110 → strong edge
    const b = americanToDecimal(-110) - 1;
    expect(kellyFraction(0.6, b)).toBeGreaterThan(0);
  });
  it("returns 0 for zero probability", () => {
    expect(kellyFraction(0, 1)).toBe(0);
  });
  it("clamps to 0, never returns negative", () => {
    expect(kellyFraction(0.3, 0.5)).toBe(0);
  });
});

describe("fractionalKelly", () => {
  it("returns half of full Kelly at fraction=0.5", () => {
    const full = kellyFraction(0.6, 0.9);
    expect(fractionalKelly(0.6, 0.9, 0.5)).toBeCloseTo(full * 0.5, 6);
  });
  it("clamps fraction to [0,1]", () => {
    const full = kellyFraction(0.6, 0.9);
    expect(fractionalKelly(0.6, 0.9, 2.0)).toBeCloseTo(full, 6);
  });
});

describe("basicDevig", () => {
  it("returns probabilities that sum to 1", () => {
    const [p1, p2] = basicDevig(-110, -110);
    expect(p1 + p2).toBeCloseTo(1.0, 10);
  });
  it("returns equal probabilities for equal-sided market", () => {
    const [p1, p2] = basicDevig(-110, -110);
    expect(p1).toBeCloseTo(0.5, 3);
    expect(p2).toBeCloseTo(0.5, 3);
  });
  it("returns higher probability for the favorite", () => {
    const [p1] = basicDevig(-200, +170);
    expect(p1).toBeGreaterThan(0.5);
  });
});

describe("expectedValue", () => {
  it("returns negative EV for 50% at -110", () => {
    expect(expectedValue(0.5, -110)).toBeLessThan(0);
  });
  it("returns positive EV for 60% at -110", () => {
    expect(expectedValue(0.6, -110)).toBeGreaterThan(0);
  });
});

describe("breakEvenProb", () => {
  it("returns ~52.4% for -110 (standard juice)", () => {
    expect(breakEvenProb(-110)).toBeCloseTo(0.524, 2);
  });
  it("returns 50% for even money", () => {
    expect(breakEvenProb(100)).toBeCloseTo(0.5, 5);
  });
});

describe("kellyFromAmerican", () => {
  it("is consistent with kellyFraction + americanToDecimal", () => {
    const p = 0.57;
    const american = -110;
    const expected = kellyFraction(p, americanToDecimal(american) - 1);
    expect(kellyFromAmerican(p, american)).toBeCloseTo(expected, 10);
  });
});
