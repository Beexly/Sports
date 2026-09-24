import { describe, expect, it } from "vitest";

import {
  ENABLED,
  cvarLosses,
  impliedRiskPosture,
  learnSpectrumFromOverrides,
  meanCvarClean,
  spectralRisk,
  tailProtectionGates,
} from "@/lib/calibration/2501-02087v2-spectral-risk-betting";

describe("spectral risk betting", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("CVaR and spectral risk nest correctly", () => {
    const losses = [1, 1, 1, 1, 1, 1, 1, 1, 1, 100];
    expect(cvarLosses(losses, 0.9)).toBe(100); // worst 10%
    expect(cvarLosses(losses, 0.5)).toBeCloseTo((100 + 1 * 4) / 5, 10);
    expect(spectralRisk(losses, [0.9], [1])).toBe(cvarLosses(losses, 0.9));
    expect(meanCvarClean(losses, 0.9, 1)).toBeCloseTo(
      losses.reduce((a, b) => a + b, 0) / losses.length,
      10,
    );
  });

  it("learns the spectrum from operator overrides", () => {
    // Operator de-risks exactly when the tail is fat: posture should correlate.
    const slates = [
      [1, 1, 1, 1],
      [1, 1, 1, 20],
      [2, 2, 2, 2],
      [1, 2, 1, 30],
      [1, 1, 2, 1],
      [5, 5, 5, 50],
    ];
    const overrides = [0, 1, 0, 1, 0, 1];
    const learned = learnSpectrumFromOverrides(slates, overrides);
    expect(learned.correlation).toBeGreaterThan(0.5);
    expect(learned.w).toBeLessThan(1); // puts weight on the tail, not just the mean
    const posture = impliedRiskPosture(slates, [learned.alpha], [1]);
    expect(posture[1]).toBeGreaterThan(posture[0]);
  });

  it("tail protection gates evaluate the three acceptance ratios", () => {
    const base = [-5, -2, 3, 4, 5, 6, 7, 8, 9, 10];
    const policy = [-1, 0, 2, 3, 4, 5, 6, 7, 8, 9]; // thinner left tail
    const g = tailProtectionGates(policy, base);
    expect(g.cvarRatio).toBeLessThan(1);
    expect(g.expectationRatio).toBeGreaterThan(0);
    expect(g.lossProbRatio).toBeLessThanOrEqual(0.8 + 1e-9);
  });
});
