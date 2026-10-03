// Tests for decision/2109-10814v1-variance-budgeted-kelly.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  estimateSlateVariance,
  varianceBudgetedAlpha,
  varianceBudgetedStakes,
  fixedAlphaStakes,
  growthRiskRatio,
  varianceBudgetedGatePasses,
} from "./2109-10814v1-variance-budgeted-kelly.js";

const SLATE = [
  { id: "a", fFull: 0.2, p: 0.6, odds: 2.0 },
  { id: "b", fFull: 0.16, p: 0.58, odds: 2.0 },
  { id: "c", fFull: 0.12, p: 0.55, odds: 2.1 },
];

describe("varianceBudgetedAlpha (2109.10814v1)", () => {
  it("alpha = sqrt(V_target / V(1)), clipped to [0,1]", () => {
    expect(varianceBudgetedAlpha(0.01, 0.04)).toBeCloseTo(0.5, 10);
    expect(varianceBudgetedAlpha(0.09, 0.04)).toBe(1); // clipped
    expect(varianceBudgetedAlpha(0.01, 0)).toBe(0);
  });
  it("shrinks alpha on high-variance (correlated/risky) slates", () => {
    const calm = estimateSlateVariance(SLATE, 4000, 61);
    const risky = estimateSlateVariance(
      SLATE.map((p) => ({ ...p, fFull: p.fFull * 3 })),
      4000,
      61,
    );
    expect(risky).toBeGreaterThan(calm);
    const vTarget = 0.005;
    expect(varianceBudgetedAlpha(vTarget, risky)).toBeLessThan(varianceBudgetedAlpha(vTarget, calm));
  });
});

describe("varianceBudgetedStakes", () => {
  it("stakes alpha * f_full and reports alpha (auditable)", () => {
    const { stakes, alpha, vFull } = varianceBudgetedStakes(SLATE, 0.005, 4000, 62);
    expect(stakes).toHaveLength(3);
    expect(vFull).toBeGreaterThan(0);
    expect(alpha).toBeGreaterThan(0);
    expect(alpha).toBeLessThanOrEqual(1);
    stakes.forEach((s, i) => {
      expect(s.stake).toBeCloseTo(alpha * SLATE[i]!.fFull, 10);
    });
    const fixed = fixedAlphaStakes(SLATE, 0.25);
    expect(fixed[0]!.stake).toBeCloseTo(0.25 * 0.2, 10);
  });
});

describe("growthRiskRatio", () => {
  it("is mean/variance of log growths", () => {
    expect(growthRiskRatio([0.1, 0.2, 0.3])).toBeCloseTo(0.2 / (0.02 / 3), 8);
    expect(growthRiskRatio([])).toBe(0);
  });
});

describe("varianceBudgetedGatePasses", () => {
  it("encodes the paper risk-profile replication + growth/risk gate", () => {
    expect(varianceBudgetedGatePasses(0.175, 0.42, 576464, 1.5, 1.2)).toBe(true);
    expect(varianceBudgetedGatePasses(0.20, 0.42, 576464, 1.5, 1.2)).toBe(false); // SD out of band
    expect(varianceBudgetedGatePasses(0.175, 0.50, 576464, 1.5, 1.2)).toBe(false); // DD out of band
    expect(varianceBudgetedGatePasses(0.175, 0.42, 400000, 1.5, 1.2)).toBe(false); // wealth off
    expect(varianceBudgetedGatePasses(0.175, 0.42, 576464, 1.1, 1.2)).toBe(false); // loses on ratio
  });
});
