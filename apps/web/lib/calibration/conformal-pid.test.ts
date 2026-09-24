import { describe, it, expect } from "vitest";
import {
  saturatingIntegrator,
  pidStep,
  scorecaster,
  learnedSaturationScale,
  initPidState,
} from "@/lib/calibration/conformal-pid";

// ============================================================
// arXiv 2307.16895 — conformal PID control. Additive only.
// ============================================================

const params = { etaP: 0.02, etaI: 0.01, c: 1 };

describe("conformal PID — 2307.16895", () => {
  it("miscoverage raises the score quantile (P+I both push up)", () => {
    const s = initPidState(1);
    const next = pidStep(s, 1, 0.1, params);
    expect(next.qT).toBeGreaterThan(1);
  });

  it("coverage lowers the score quantile", () => {
    const s = initPidState(1);
    const next = pidStep(s, 0, 0.1, params);
    expect(next.qT).toBeLessThan(1);
  });

  it("saturatingIntegrator bounds runaway integration", () => {
    expect(saturatingIntegrator(1e9, 2)).toBeCloseTo(2, 10);
    expect(saturatingIntegrator(-1e9, 2)).toBeCloseTo(-2, 10);
    expect(saturatingIntegrator(0, 2)).toBe(0);
    expect(saturatingIntegrator(5, 0)).toBe(0);
  });

  it("the I-term alone cannot exceed etaI * c per step asymptotically", () => {
    // After a long miscoverage streak the integrator saturates at c.
    let s = initPidState(0);
    for (let i = 0; i < 500; i++) s = pidStep(s, 1, 0.1, params);
    const before = s.qT;
    s = pidStep(s, 1, 0.1, params);
    const step = s.qT - before;
    // P-term 0.02*0.9=0.018 plus saturated I-term 0.01*1=0.01.
    expect(step).toBeCloseTo(0.018 + 0.01, 6);
  });

  it("scorecaster evaluates the linear model", () => {
    expect(scorecaster([1, 2], [0.5, -0.25], 1)).toBeCloseTo(1, 10);
    expect(scorecaster([], [])).toBe(0);
  });

  it("scorecast shifts the quantile (additive feed-forward)", () => {
    const s = initPidState(1);
    const withCast = pidStep(s, 0, 0.1, params, 0.5);
    const without = pidStep(s, 0, 0.1, params, 0);
    expect(withCast.qT - without.qT).toBeCloseTo(0.5, 10);
  });

  it("learnedSaturationScale adapts c to regime", () => {
    expect(learnedSaturationScale(1, true, false)).toBe(2);
    expect(learnedSaturationScale(1, false, true)).toBe(0.5);
    expect(learnedSaturationScale(1, false, false)).toBe(1);
  });

  it("initPidState starts the integrator at zero", () => {
    expect(initPidState(2)).toEqual({ qT: 2, integralSum: 0 });
  });
});
