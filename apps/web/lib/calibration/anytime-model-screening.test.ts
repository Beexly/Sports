import { describe, it, expect } from "vitest";
import {
  empiricalKellyLambda,
  onsLambda,
  eProcessUpdate,
  runEProcess,
  anytimeReject,
} from "@/lib/calibration/anytime-model-screening";

// ============================================================
// arXiv 2603.19551v2 — anytime model screening. Additive only.
// ============================================================

describe("anytime model screening — 2603.19551v2", () => {
  it("empiricalKellyLambda is mean/mean-square truncated to [0,1]", () => {
    expect(empiricalKellyLambda([1, 1, 1, 1])).toBe(1); // 1/1 truncated
    expect(empiricalKellyLambda([-1, -1])).toBe(0); // long-only
    expect(empiricalKellyLambda([])).toBe(0);
    expect(empiricalKellyLambda([0.5, -0.5, 0.5, -0.5])).toBe(0);
  });

  it("onsLambda stays in [0,1]", () => {
    const l = onsLambda([0.5, 0.3, -0.1, 0.2]);
    expect(l).toBeGreaterThanOrEqual(0);
    expect(l).toBeLessThanOrEqual(1);
    expect(onsLambda([])).toBe(0);
  });

  it("eProcessUpdate compounds wealth and floors at 0", () => {
    expect(eProcessUpdate(1, 0.1, 0, 0.5)).toBeCloseTo(1.05, 10);
    expect(eProcessUpdate(1, -10, 0, 1)).toBe(0);
  });

  it("runEProcess rejects a strong challenger early", () => {
    const scores = Array(100).fill(0.2); // steady edge over breakeven 0
    const { rejectionTime, wealthPath } = runEProcess(scores, 0, 0.05);
    expect(rejectionTime).not.toBeNull();
    expect(rejectionTime!).toBeLessThan(100);
    expect(wealthPath.length).toBe(100);
  });

  it("runEProcess never rejects pure noise at a strict level", () => {
    const scores = [0.1, -0.1, 0.1, -0.1, 0.1, -0.1];
    const { rejectionTime } = runEProcess(scores, 0, 0.01);
    expect(rejectionTime).toBeNull();
  });

  it("anytimeReject fires at 1/alpha", () => {
    expect(anytimeReject(20, 0.05)).toBe(true);
    expect(anytimeReject(19.9, 0.05)).toBe(false);
  });
});
