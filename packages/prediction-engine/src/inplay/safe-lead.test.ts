import { describe, expect, it } from "vitest";
import {
  diffusionWinProb,
  expectedLeadChangesRemaining,
  leadSafetyFeature,
  normalCdf,
  safeLeadProb,
} from "./safe-lead";

describe("safe-lead", () => {
  it("a big lead late is safe; a thin lead is not", () => {
    const safe = safeLeadProb({ lead: 21, timeRemainingMin: 5, driftPerMin: 0, diffusivity: 2 });
    expect(safe).toBeGreaterThan(0.99);
    // 7-pt lead, 20 min left, σ=1.5/min: Q ≈ 2Φ(1.04) − 1 ≈ 0.70
    const thin = safeLeadProb({ lead: 7, timeRemainingMin: 20, driftPerMin: 0, diffusivity: 1.5 });
    expect(thin).toBeGreaterThan(0.5);
    expect(thin).toBeLessThan(0.9);
  });

  it("symmetry: deficit mirrors the lead with negated drift", () => {
    const up = safeLeadProb({ lead: 7, timeRemainingMin: 15, driftPerMin: 0.05, diffusivity: 2 });
    const down = safeLeadProb({ lead: -7, timeRemainingMin: 15, driftPerMin: 0.05, diffusivity: 2 });
    expect(up + down).toBeCloseTo(1, 6);
  });

  it("zero time resolves the current state", () => {
    expect(safeLeadProb({ lead: 3, timeRemainingMin: 0, driftPerMin: 0, diffusivity: 2 })).toBe(1);
    expect(safeLeadProb({ lead: -3, timeRemainingMin: 0, driftPerMin: 0, diffusivity: 2 })).toBe(0);
    expect(safeLeadProb({ lead: 0, timeRemainingMin: 0, driftPerMin: 0, diffusivity: 2 })).toBe(0.5);
  });

  it("drift from the pregame spread moves the baseline", () => {
    const fav = leadSafetyFeature(0, 30, 7, 2);
    const dog = leadSafetyFeature(0, 30, -7, 2);
    expect(fav).toBeGreaterThan(0.5);
    expect(dog).toBeLessThan(0.5);
    expect(fav + dog).toBeCloseTo(1, 10);
  });

  it("eventual-win form: ties go to the drift", () => {
    expect(diffusionWinProb(0, 30, 0.1, 2)).toBeGreaterThan(0.5);
    expect(diffusionWinProb(0, 30, -0.1, 2)).toBeLessThan(0.5);
    expect(diffusionWinProb(0, 30, 0, 2)).toBeCloseTo(0.5, 8); // A&S approx ±1e-7
    expect(diffusionWinProb(3, 0, 0, 2)).toBe(1);
  });

  it("expected lead changes shrink as the clock dies", () => {
    const early = expectedLeadChangesRemaining(0, 55, 0.08, 4.5);
    const late = expectedLeadChangesRemaining(0, 2, 0.08, 4.5);
    expect(early).toBeGreaterThan(late);
    expect(expectedLeadChangesRemaining(0, 0, 0.08, 4.5)).toBe(0);
  });

  it("rejects non-positive diffusivity", () => {
    expect(() =>
      safeLeadProb({ lead: 3, timeRemainingMin: 10, driftPerMin: 0, diffusivity: 0 }),
    ).toThrow();
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
  });
});
