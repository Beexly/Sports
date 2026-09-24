/**
 * Tests for ./2512-00203v2-experiment-stats (arXiv:2512.00203v2, lane=experimental).
 *
 * ACCEPTANCE GATE: Adopt if on 2025 held-out weeks the aggregated drive-threat metric beats the EPA/play-sum baseline on MAE with a paired week-level test at p<0.05 AND the attempt-generation component alone shows higher week-to-week stability.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2512-00203v2-experiment-stats";

describe("2512-00203v2 Beyond Expected Goals: A Probabilistic Framework", () => {
  it("ablation gap reproduces the paper's ACC delta", () => {
    expect(mod.ablationGap(63.42, 51.08)).toBeCloseTo(12.34, 2);
    expect(mod.ablationGap(0.5, 0.5)).toBeCloseTo(0, 10);
    expect(mod.ablationGap(NaN, 0.5)).toBeNull();
  });
  it("cohen's d is 0 for identical samples, -3 for a shifted pair", () => {
    expect(mod.cohensD([1, 2, 3], [1, 2, 3])).toBeCloseTo(0, 10);
    expect(mod.cohensD([1, 2, 3], [4, 5, 6])).toBeCloseTo(-3, 10);
    expect(mod.cohensD([1], [1, 2])).toBeNull();
  });
  it("sign test detects a 9/10 win split", () => {
    expect(mod.signTestPValue(9, 10)!).toBeLessThan(0.05);
    expect(mod.signTestPValue(5, 10)).toBeCloseTo(1, 5);
    expect(mod.signTestPValue(11, 10)).toBeNull();
  });
  it("mean CI brackets the sample mean", () => {
    const ci = mod.meanCi([1, 2, 3])!;
    expect(ci.mean).toBeCloseTo(2, 10);
    expect(ci.lo).toBeLessThan(2);
    expect(ci.hi).toBeGreaterThan(2);
    expect(mod.meanCi([2, 2, 2])!.lo).toBeCloseTo(2, 10);
  });
});
