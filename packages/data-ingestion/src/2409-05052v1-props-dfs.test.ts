/**
 * Tests for ./2409-05052v1-props-dfs (arXiv:2409.05052v1, lane=props_dfs).
 *
 * ACCEPTANCE GATE: ADOPT snap-APM if, on the 2024 season walk-forward test, adding player APM coefficients improves
 * play-EPA out-of-sample R² by ≥ 0.01 AND the top-decile offensive APM players beat their yardage prop
 * lines at a rate exceeding the baseline model by ≥ 2 percentage points (hit-rate lift on ≥ 200 graded
 * props).
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2409-05052v1-props-dfs";

describe("props/DFS primitives (arXiv:2409.05052v1)", () => {
  const players = [
    { id: "a", salary: 5000, proj: 20 },
    { id: "b", salary: 4000, proj: 15 },
    { id: "c", salary: 3000, proj: 12 },
    { id: "d", salary: 2000, proj: 8 },
  ];

  it("solves the salary-cap knapsack exactly", () => {
    const r = mod.knapsackLineup(players, 7000, 2)!;
    expect(r.lineup).toEqual(["a", "d"]);
    expect(r.totalSalary).toBe(7000);
    expect(r.totalProj).toBe(28);
    // infeasible: cannot fit 3 players under 1000
    expect(mod.knapsackLineup(players, 1000, 3)).toBeNull();
    expect(mod.knapsackLineup(players, 7000, 9)).toBeNull();
  });

  it("blends projection sources with normalized weights", () => {
    expect(mod.blendProjections([[10, 20], [20, 40]], [1, 1])).toEqual([15, 30]);
    expect(mod.blendProjections([[10, 20], [20, 40]], [3, 1])).toEqual([12.5, 25]);
    expect(mod.blendProjections([[10]], [0])).toBeNull();
    expect(mod.blendProjections([[10], [1, 2]], [1, 1])).toBeNull();
  });

  it("scores ownership leverage", () => {
    expect(mod.leverageScore(20, 0.25)).toBeCloseTo(15, 10);
    expect(mod.leverageScore(20, 1)).toBeCloseTo(0, 10);
    expect(mod.leverageScore(20, 1.5)).toBeNull();
  });
});
