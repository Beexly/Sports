import { describe, it, expect } from "vitest";
import {
  empiricalCvar,
  cvarTimeUniformLowerBound,
  testMartingaleUpdate,
  sequentialRejects,
  reliabilityBins,
  firstCrossingWeek,
} from "@/lib/calibration/cvar-confidence-sequence";

// ============================================================
// arXiv 2402.16300 — CVaR confidence sequences. Additive only.
// ============================================================

describe("CVaR confidence sequence — 2402.16300", () => {
  it("empiricalCvar takes the worst tau-fraction", () => {
    expect(empiricalCvar([0.9, 0.1, 0.2, 0.8], 0.25)).toBeCloseTo(0.1, 10);
    expect(empiricalCvar([], 0.25)).toBe(0);
  });

  it("cvarTimeUniformLowerBound sits below the point estimate and tightens with n", () => {
    const s = [0.5, -0.2, 0.3, -0.1, 0.4, 0.1, -0.3, 0.2];
    const lb8 = cvarTimeUniformLowerBound(s, 0.25, 0.05);
    expect(lb8).toBeLessThanOrEqual(empiricalCvar(s, 0.25));
    const lbBig = cvarTimeUniformLowerBound([...s, ...s, ...s, ...s], 0.25, 0.05);
    expect(lbBig).toBeGreaterThan(lb8);
    expect(cvarTimeUniformLowerBound([], 0.25, 0.05)).toBe(Number.NEGATIVE_INFINITY);
  });

  it("testMartingaleUpdate stays nonnegative", () => {
    expect(testMartingaleUpdate(1, -100, 0, 0.5)).toBeGreaterThanOrEqual(0);
    expect(testMartingaleUpdate(2, 0.1, 0, 0.1)).toBeCloseTo(2.02, 10);
  });

  it("sequentialRejects fires at 1/alpha", () => {
    expect(sequentialRejects(20, 0.05)).toBe(true);
    expect(sequentialRejects(19.9, 0.05)).toBe(false);
  });

  it("reliabilityBins bins predictions and reports frequencies", () => {
    const bins = reliabilityBins([0.1, 0.2, 0.8, 0.9], [0, 1, 1, 1], 2);
    expect(bins.length).toBe(2);
    expect(bins[0]!.count).toBe(2);
    expect(bins[0]!.empiricalFreq).toBeCloseTo(0.5, 10);
    expect(bins[1]!.meanPredicted).toBeCloseTo(0.85, 10);
    const empty = reliabilityBins([], [], 3);
    expect(empty[0]!.count).toBe(0);
    expect(empty[0]!.empiricalFreq).toBeNaN();
  });

  it("firstCrossingWeek stops a losing stream early", () => {
    const losing = Array(20).fill(-1);
    const w = firstCrossingWeek(losing, 0.25, 0.05, -0.5, 4);
    expect(w).not.toBeNull();
    expect(w!).toBeGreaterThanOrEqual(4);
  });

  it("firstCrossingWeek returns null for a winning stream", () => {
    const winning = Array(20).fill(1);
    expect(firstCrossingWeek(winning, 0.25, 0.05, -2, 4)).toBeNull();
  });
});
