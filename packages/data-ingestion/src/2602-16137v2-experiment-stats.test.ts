/**
 * Tests for ./2602-16137v2-experiment-stats (arXiv:2602.16137v2, lane=experimental).
 *
 * ACCEPTANCE GATE: ADAPT if the synthetic replication matches the paper's best-at-all-data-sizes claim directionally (mean Rand index >= Benson-et-al.-2016 baseline + 0.05) before any GSE-data application.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2602-16137v2-experiment-stats";

describe("2602-16137v2 Experimental Assortments for Choice Estimation and", () => {
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
