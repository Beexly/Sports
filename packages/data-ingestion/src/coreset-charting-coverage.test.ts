/**
 * Tests for ./coreset-charting-coverage (arXiv:1708.00489v4, lane=active_learning).
 *
 * ACCEPTANCE GATE: ADOPT as the coverage layer iff k-center-greedy at 20% charting budget beats random at 20%
 * budget by >= 0.005 log-loss on the 2024 holdout.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./coreset-charting-coverage";

describe("core-set charting coverage (arXiv:1708.00489v4)", () => {
  const pts = [[0, 0], [0, 1], [10, 0], [10, 1], [5, 5]];
  it("greedy covers far-apart archetypes", () => {
    const sel = mod.kCenterGreedy(pts, [0], 2);
    expect(sel).toContain(0);
    expect(sel.length).toBe(3);
    const r = mod.coverageRadius(pts, sel)!;
    expect(r).toBeLessThan(mod.coverageRadius(pts, [0])!);
  });
  it("respects seeded set and budget", () => {
    expect(mod.kCenterGreedy(pts, [0, 1], 0)).toEqual([0, 1]);
    expect(mod.kCenterGreedy([], [0], 2)).toEqual([]);
  });
  it("robust variant skips outliers", () => {
    const withOut = [...pts, [1000, 1000]];
    const sel = mod.robustKCenter(withOut, [], 2, 0.2);
    expect(sel).not.toContain(5);
  });
  it("coverageRadius null on empty", () => {
    expect(mod.coverageRadius([], [0])).toBeNull();
    expect(mod.coverageRadius(pts, [])).toBeNull();
  });
});
