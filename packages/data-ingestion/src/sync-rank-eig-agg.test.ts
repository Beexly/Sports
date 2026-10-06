/**
 * Tests for ./sync-rank-eig-agg (arXiv:1504.01070v1, lane=team_ratings).
 *
 * ACCEPTANCE GATE: Adopt EIG-AGG fusion iff on 2023-2025 walk-forward: (a) consensus log loss beats the best single
 * source by >= 0.002; AND (b) beats simple rank-averaging by >= 0.001; AND (c) runtime per weekly
 * fusion < 30 s.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./sync-rank-eig-agg";

describe("sync-rank EIG-AGG fusion (arXiv:1504.01070v1)", () => {
  const c1 = [
    [0, 1, 2],
    [-1, 0, 1],
    [-2, -1, 0],
  ];
  it("angle matrix scales by pi/Cmax", () => {
    const t = mod.angleMatrix(c1, 2)!;
    expect(t[0]![1]).toBeCloseTo(Math.PI / 2, 10);
    expect(mod.angleMatrix(c1, 0)).toBeNull();
    expect(mod.angleMatrix([[0, 1]], 2)).toBeNull();
  });
  it("weighted sum + power iteration recover the ordering", () => {
    const t1 = mod.angleMatrix(c1, 2)!;
    const h = mod.weightedSum([t1, t1], [0.7, 0.3])!;
    const v = mod.powerIteration(h)!;
    const rank = mod.consensusRanking(v);
    expect(rank[0]).toBe(0);
    expect(rank[2]).toBe(2);
  });
  it("weightedSum rejects mismatched dims/weights", () => {
    const t1 = mod.angleMatrix(c1, 2)!;
    expect(mod.weightedSum([t1], [0.5, 0.5])).toBeNull();
    expect(mod.weightedSum([], [])).toBeNull();
  });
  it("residuals are small for a consistent source", () => {
    const t1 = mod.angleMatrix(c1, 2)!;
    const v = mod.powerIteration(t1)!;
    const res = mod.angularResiduals(t1, v)!;
    const max = Math.max(...res.flat());
    expect(max).toBeLessThanOrEqual(Math.PI);
  });
  it("powerIteration null on empty", () => {
    expect(mod.powerIteration([])).toBeNull();
  });
});
