import { describe, it, expect } from "vitest";
import {
  aciUpdate,
  aciWeeklyStep,
  regimeGamma,
  detectChangepoint,
  aciCoverageBound,
  initAciMarketState,
} from "@/lib/calibration/aci-online-controller";

// ============================================================
// arXiv 2106.00170 — ACI online controller. Additive only.
// ============================================================

describe("ACI online controller — 2106.00170", () => {
  it("miscoverage decreases alpha_t (next interval widens)", () => {
    const next = aciUpdate(0.1, 0.01, 0.1, 1);
    expect(next).toBeLessThan(0.1);
  });

  it("coverage increases alpha_t (next interval narrows)", () => {
    const next = aciUpdate(0.1, 0.01, 0.1, 0);
    expect(next).toBeGreaterThan(0.1);
  });

  it("update matches the paper formula exactly", () => {
    // alpha_{t+1} = alpha_t + gamma*(alpha - err_t)
    expect(aciUpdate(0.2, 0.05, 0.1, 1)).toBeCloseTo(0.2 + 0.05 * (0.1 - 1), 12);
    expect(aciUpdate(0.2, 0.05, 0.1, 0)).toBeCloseTo(0.2 + 0.05 * 0.1, 12);
  });

  it("alpha_t stays in (0,1)", () => {
    expect(aciUpdate(0.001, 1, 0.1, 1)).toBeGreaterThan(0);
    expect(aciUpdate(0.999, 1, 0.1, 0)).toBeLessThan(1);
  });

  it("aciWeeklyStep folds a week of resolutions", () => {
    const s = initAciMarketState("spread", 0.01, 0.1);
    const next = aciWeeklyStep(s, [true, true, false], 0.1);
    // 2 covers (+0.001 each), 1 miscover (-0.009): net down.
    expect(next.alphaT).toBeCloseTo(0.1 + 2 * 0.01 * 0.1 - 0.01 * 0.9, 10);
    expect(next.market).toBe("spread");
  });

  it("aciWeeklyStep handles an empty week", () => {
    const s = initAciMarketState("total", 0.01, 0.1);
    expect(aciWeeklyStep(s, [], 0.1).alphaT).toBe(0.1);
  });

  it("regimeGamma uses the large gamma for 3 weeks post-changepoint", () => {
    expect(regimeGamma(0, 0.001, 0.02)).toBe(0.02);
    expect(regimeGamma(2, 0.001, 0.02)).toBe(0.02);
    expect(regimeGamma(3, 0.001, 0.02)).toBe(0.001);
    expect(regimeGamma(99, 0.001, 0.02)).toBe(0.001);
  });

  it("detectChangepoint flags large trailing deviations", () => {
    expect(detectChangepoint([0.7, 0.72, 0.68], 0.9, 0.05)).toBe(true);
    expect(detectChangepoint([0.89, 0.91, 0.9], 0.9, 0.05)).toBe(false);
    expect(detectChangepoint([], 0.9)).toBe(false);
  });

  it("aciCoverageBound is O(1/(T*gamma))", () => {
    expect(aciCoverageBound(100, 0.01)).toBeCloseTo(1, 10);
    expect(aciCoverageBound(200, 0.01)).toBeCloseTo(0.5, 10);
    expect(aciCoverageBound(0, 0.01)).toBe(Number.POSITIVE_INFINITY);
  });
});
