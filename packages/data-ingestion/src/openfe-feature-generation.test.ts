/**
 * Tests for ./openfe-feature-generation (arXiv:2211.12507, lane=auto_feature_eng).
 *
 * ACCEPTANCE GATE: ADOPT the discovered feature set iff test log-loss improves by >= 0.003 on the 2024 NFL held-out
 * vs the hand-built baseline, with zero leakage violations (every GroupBy feature provably
 * computable from pre-game data; audit via recomputation on a row-sample); REJECT if gain < 0.003,
 * any surviving feature fails the time-safety audit, or validation-selected features degrade test
 * (selection overfit).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./openfe-feature-generation";

describe("OpenFE feature generation (arXiv:2211.12507)", () => {
  it("binary ops", () => {
    expect(mod.applyBinaryOp([1, 2], [3, 4], "add")).toEqual([4, 6]);
    expect(mod.applyBinaryOp([1, 2], [3, 4], "div")).toEqual([1 / 3, 0.5]);
    expect(mod.applyBinaryOp([1], [0], "div")).toEqual([0]);
    expect(mod.applyBinaryOp([1], [1, 2], "add")).toBeNull();
    expect(mod.applyBinaryOp([1], [1], "groupby-mean")).toBeNull();
  });
  it("groupby mean", () => {
    const m = mod.groupbyMean([1, 2, 3, 4], ["a", "a", "b", "b"])!;
    expect(m.get("a")).toBeCloseTo(1.5, 10);
    expect(m.get("b")).toBeCloseTo(3.5, 10);
    expect(mod.groupbyMean([1], ["a", "b"])).toBeNull();
  });
  it("successive halving", () => {
    const cands = [
      { name: "a", score: 1 },
      { name: "b", score: 3 },
      { name: "c", score: 2 },
      { name: "d", score: 0 },
    ];
    expect(mod.successiveHalving(cands, 1)).toEqual(["b", "c"]);
    expect(mod.successiveHalving(cands, 2)).toEqual(["b"]);
    expect(mod.successiveHalving([], 1)).toBeNull();
  });
  it("candidate names", () => {
    const c = mod.candidateNames(["x", "y"], ["add", "div"]);
    expect(c).toHaveLength(2);
    expect(c[0]!.name).toBe("x_add_y");
  });
});
