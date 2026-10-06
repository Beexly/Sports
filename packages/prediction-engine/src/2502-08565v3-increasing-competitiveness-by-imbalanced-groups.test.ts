/**
 * Vitest suite for arXiv:2502.08565v3 (Increasing competitiveness by imbalanced groups: The example of the 48-team FIFA World Cup).
 * Gate: Adopt the incentive-discount adjustment if, on the 2025 test window (Weeks 15–18), the adjusted model beats the baseline by ≥1.5 percentage points of ATS cover rate OR reduces margin MAE by ≥0.4 points, with the stakeless×weight interaction coefficient significant at p<0.05 on the 2020–2024 fit.
 */
import { describe, it, expect } from "vitest";
import { incentiveDiscount, shrinkCoeffs } from "./2502-08565v3-increasing-competitiveness-by-imbalanced-groups";

describe("2502-08565v3 stakeless incentive discount", () => {
  const c = { team: "KC", betaRest: 4.0, betaRestDiff: 0.3, betaMutual: -1.5 };
  it("discount grows with rest share and rest differential", () => {
    const d1 = incentiveDiscount({ restShare: 0.8, restDiffDays: 3, oppStakeless: false }, c);
    const d0 = incentiveDiscount({ restShare: 0.1, restDiffDays: 0, oppStakeless: false }, c);
    expect(d1).toBeGreaterThan(d0);
    expect(d1).toBeCloseTo(4.0 * 0.8 + 0.3 * 3, 10);
  });
  it("mutual stakelessness adds the interaction term", () => {
    const dose = { restShare: 0.5, restDiffDays: 0, oppStakeless: true };
    expect(incentiveDiscount(dose, c)).toBeCloseTo(4.0 * 0.5 - 1.5 * 0.5, 10);
  });
  it("hierarchical shrinkage blends team and global coefficients", () => {
    const g = { betaRest: 2.0, betaRestDiff: 0.1, betaMutual: 0 };
    const s = shrinkCoeffs(c, g, 0.5);
    expect(s.betaRest).toBeCloseTo(3.0, 10);
    expect(shrinkCoeffs(c, g, 1).betaRest).toBeCloseTo(4.0, 10);
    expect(shrinkCoeffs(c, g, 0).betaRest).toBeCloseTo(2.0, 10);
  });
});
