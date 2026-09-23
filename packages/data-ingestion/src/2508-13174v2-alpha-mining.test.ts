/**
 * Tests for ./2508-13174v2-alpha-mining (arXiv:2508.13174v2, lane=signal_discovery_alpha_mining).
 *
 * ACCEPTANCE GATE: ADAPT->build if integrated-score selection beats IC-only selection by >=0.002 Brier on 2022-2025 AND evaluation runs >=10x faster than the equivalent walk-forward backtest; REJECT if dimensions are mutually redundant (pairwise |corr|>0.8).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2508-13174v2-alpha-mining";

describe("2508-13174v2 AlphaEval: A Comprehensive and Efficient Evaluation", () => {
  it("pearson IC is 1 for perfect predictions", () => {
    expect(mod.pearsonIc([1, 2, 3, 4], [1, 2, 3, 4])).toBeCloseTo(1, 10);
    expect(mod.pearsonIc([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1, 10);
    expect(mod.pearsonIc([1, 1, 1], [1, 2, 3])).toBeNull();
    expect(mod.pearsonIc([1], [1])).toBeNull();
  });
  it("demean centers the series at zero", () => {
    const d = mod.demean([1, 2, 3, 4])!;
    const m = d.reduce((s, v) => s + v, 0) / d.length;
    expect(m).toBeCloseTo(0, 10);
    expect(mod.demean([])).toBeNull();
  });
  it("walk-forward splits expand the train window", () => {
    const s = mod.walkForwardSplits(10, 2)!;
    expect(s).toEqual([
      { train: [0, 2], test: [3, 5] },
      { train: [0, 5], test: [6, 8] },
    ]);
    expect(mod.walkForwardSplits(10, 10)).toBeNull();
  });
  it("correlation screen keeps strong factors only", () => {
    const keep = mod.correlationScreen(
      [[1, 2, 3, 4], [4, 3, 2, 1], [1, 1, 1, 1]],
      [1, 2, 3, 4],
      0.9,
    );
    expect(keep).toEqual([0, 1]);
  });
});
