/**
 * Tests for ./2602-14670v2-alpha-mining (arXiv:2602.14670v2, lane=signal_discovery_alpha_mining).
 *
 * ACCEPTANCE GATE: ADAPT->build if Ralph-Loop mining keeps avg |rho| <= 0.35 as the zoo grows past 100 signals while session-independent mining's |rho| rises above 0.5, with test RankIC at parity or better.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2602-14670v2-alpha-mining";

describe("2602-14670v2 FactorMiner: A Self-Evolving Agent with Skills", () => {
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
