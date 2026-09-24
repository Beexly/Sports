import { describe, it, expect } from "vitest";
import {
  normalCdf,
  normalQuantile,
  gaussianCrps,
  gaussianIntervalWidth,
  crpsmodLoss,
  shouldRollbackPenalty,
} from "@/lib/calibration/crpsmod-loss";

// ============================================================
// arXiv 2606.08587v1 — CRPSmod sharpness. Additive only.
// ============================================================

describe("CRPSmod — 2606.08587v1", () => {
  it("normalCdf/normalQuantile invert each other", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 7);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 4);
    expect(normalQuantile(0.975)).toBeCloseTo(1.96, 3);
    expect(normalQuantile(normalCdf(1.23))).toBeCloseTo(1.23, 4);
  });

  it("gaussianCrps matches the known value at y = mu", () => {
    // CRPS(N(mu,s), mu) = s * (sqrt(2/pi) - 1/sqrt(pi)).
    const expected = 2 * (Math.sqrt(2 / Math.PI) - 1 / Math.sqrt(Math.PI));
    expect(gaussianCrps(0, 0, 2)).toBeCloseTo(expected, 6);
  });

  it("gaussianCrps is non-negative and grows with error", () => {
    expect(gaussianCrps(0, 0, 1)).toBeGreaterThanOrEqual(0);
    expect(gaussianCrps(10, 0, 1)).toBeGreaterThan(gaussianCrps(1, 0, 1));
    expect(gaussianCrps(0, 0, 0)).toBeNaN();
  });

  it("gaussianIntervalWidth is the central width", () => {
    expect(gaussianIntervalWidth(0, 1, 0.1)).toBeCloseTo(2 * 1.6449, 3);
  });

  it("crpsmodLoss adds the width penalty", () => {
    const base = gaussianCrps(45, 44, 3);
    const mod = crpsmodLoss(45, 44, 3, 0.1, 0.01);
    expect(mod).toBeGreaterThan(base);
    expect(crpsmodLoss(45, 44, 3, 0.1, 0)).toBeCloseTo(base, 10);
  });

  it("shouldRollbackPenalty fires when coverage drops >1pp below nominal", () => {
    const bad = [...Array(85).fill(true), ...Array(15).fill(false)]; // 85%
    expect(shouldRollbackPenalty(bad, 0.9)).toBe(true);
    const ok = [...Array(89).fill(true), ...Array(11).fill(false)]; // 89%
    expect(shouldRollbackPenalty(ok, 0.9)).toBe(false);
    expect(shouldRollbackPenalty([], 0.9)).toBe(false);
  });
});
