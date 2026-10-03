// Tests for decision/mispricing-monitors.ts (vitest, globals on).
import { describe, it, expect } from "vitest";
import {
  bayesKellyMartingale,
  martingaleStakeMultiplier,
  ftlConsensus,
  bookShadingFlag,
  feedPricingDecision,
  stakingGapDiagnostic,
} from "./mispricing-monitors.js";

describe("bayesKellyMartingale (2402.03035)", () => {
  it("stays near 1 on a well-calibrated stream", () => {
    const probs = new Array(50).fill(0.6);
    const outcomes = Array.from({ length: 50 }, (_, i) => (i % 5 < 3 ? 1 : 0) as 0 | 1);
    const { martingale, crossedL1, crossedL2 } = bayesKellyMartingale(probs, outcomes, 20, 100);
    expect(martingale[0]).toBe(1);
    expect(martingale.length).toBe(51);
    expect(crossedL1).toBe(false);
    expect(crossedL2).toBe(false);
  });
  it("detects an injected miscalibration regime", () => {
    // Engine says 0.6 but the truth is 0.9: persistent positive residuals.
    const probs = new Array(40).fill(0.6);
    const outcomes = Array.from({ length: 40 }, (_, i) => (i % 10 < 9 ? 1 : 0) as 0 | 1);
    const { crossedL1, martingale } = bayesKellyMartingale(probs, outcomes, 5, 50);
    expect(crossedL1).toBe(true);
    expect(martingale[martingale.length - 1]).toBeGreaterThan(1);
  });
  it("handles empty input", () => {
    const res = bayesKellyMartingale([], [], 5, 50);
    expect(res.martingale).toEqual([1]);
    expect(res.crossedL1).toBe(false);
  });
});

describe("martingaleStakeMultiplier", () => {
  it("halves at L1 and abstains at L2", () => {
    expect(martingaleStakeMultiplier(1, 5, 50)).toBe(1);
    expect(martingaleStakeMultiplier(10, 5, 50)).toBe(0.5);
    expect(martingaleStakeMultiplier(60, 5, 50)).toBe(0);
  });
});

describe("ftlConsensus (2406.04062v1)", () => {
  it("returns the common belief under agreement", () => {
    expect(ftlConsensus([0.6, 0.6, 0.6])).toBeCloseTo(0.6, 6);
  });
  it("is the geometric-mean consensus on disagreement", () => {
    const c = ftlConsensus([0.7, 0.5]);
    expect(c).toBeGreaterThan(0.5);
    expect(c).toBeLessThan(0.7);
  });
  it("handles empty input", () => {
    expect(ftlConsensus([])).toBe(0.5);
  });
});

describe("bookShadingFlag (2406.04062v1)", () => {
  it("flags when the line moved with the informed flow past the threshold", () => {
    const res = bookShadingFlag(0.5, 0.55, 0.58, 1, 0.02);
    expect(res.shaded).toBe(true);
    expect(res.bookBeliefG).toBeCloseTo(0.3 * 0.5 + 0.7 * 0.55, 10);
    expect(res.edgeVsBook).toBeCloseTo(0.58 - res.bookBeliefG, 10);
  });
  it("does not flag small moves", () => {
    expect(bookShadingFlag(0.5, 0.505, 0.58, 1, 0.02).shaded).toBe(false);
  });
  it("respects the informed direction", () => {
    // Line moved against the informed direction: not shaded.
    expect(bookShadingFlag(0.5, 0.55, 0.58, -1, 0.02).shaded).toBe(false);
  });
});

describe("feedPricingDecision (2104.14277v1)", () => {
  it("buys when expected lift exceeds cost", () => {
    const { buy, expectedLift } = feedPricingDecision(0.05, 100, 0.5, 2);
    expect(expectedLift).toBeCloseTo(2.5, 10);
    expect(buy).toBe(true);
  });
  it("skips when cost exceeds lift", () => {
    expect(feedPricingDecision(0.01, 100, 0.5, 2).buy).toBe(false);
  });
});

describe("stakingGapDiagnostic", () => {
  it("is positive when staking underperforms the bound", () => {
    expect(stakingGapDiagnostic(0.05, 0.1)).toBeCloseTo(0.05, 10);
  });
  it("is zero on the proportional line", () => {
    expect(stakingGapDiagnostic(0.1, 0.1)).toBeCloseTo(0, 10);
  });
});
