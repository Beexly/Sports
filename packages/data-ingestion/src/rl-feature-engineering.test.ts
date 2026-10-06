/**
 * Tests for ./rl-feature-engineering (arXiv:1709.07150, lane=auto_feature_eng).
 *
 * ACCEPTANCE GATE: ADAPT the policy layer iff (a) 2024 held-out log-loss improves >= 0.003, AND (b) the learned
 * policy reaches the baseline+0.003 gain in <= 40 steps while BFS needs > 100, AND (c) zero
 * leakage-audit failures on rolling transforms.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./rl-feature-engineering";

describe("RL feature engineering (arXiv:1709.07150)", () => {
  it("rollingMean is causal", () => {
    expect(mod.rollingMean([1, 2, 3, 4], 2)).toEqual([1, 1.5, 2.5, 3.5]);
    expect(mod.rollingMean([1, 2], 0)).toBeNull();
    expect(mod.rollingMean([], 2)).toBeNull();
  });
  it("rollingStd", () => {
    const s = mod.rollingStd([1, 1, 1, 1], 2)!;
    expect(s.every((v) => v === 0)).toBe(true);
  });
  it("zscore/sigmoid/week", () => {
    expect(mod.zscoreVsLeague(10, 5, 2.5)).toBeCloseTo(2, 10);
    expect(mod.zscoreVsLeague(10, 5, 0)).toBeNull();
    expect(mod.sigmoidSpread(0)).toBeCloseTo(0.5, 10);
    const w = mod.weekCyclical(9, 18)!;
    expect(w.sin).toBeCloseTo(0, 8);
    expect(w.cos).toBeCloseTo(-1, 8);
  });
  it("applyTransform dispatches", () => {
    const series = new Map([["epa", [0.1, 0.2, 0.3]]]);
    const node = { id: "n1", op: "rolling_mean" as const, params: { k: 2 }, parents: ["epa"] };
    const out = mod.applyTransform(node, series)!;
    expect(out).toHaveLength(3);
    expect(out[0]).toBeCloseTo(0.1, 10);
    expect(out[1]).toBeCloseTo(0.15, 10);
    expect(out[2]).toBeCloseTo(0.25, 10);
    expect(mod.applyTransform({ ...node, op: "zscore_vs_league" as never }, series)).toBeNull();
  });
  it("recipePath renders the composition", () => {
    const nodes = [
      { id: "raw", op: "rolling_mean" as const, params: {}, parents: [] as string[] },
      { id: "f1", op: "sigmoid_spread" as const, params: {}, parents: ["raw"] },
    ];
    expect(mod.recipePath(nodes, "f1")).toEqual(["rolling_mean(raw)", "sigmoid_spread(f1)"]);
  });
});
