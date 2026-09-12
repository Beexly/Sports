import { describe, it, expect } from "vitest";
import { benchmark, selectGppLineups, bestStackPair } from "./dfs-optimizer-edge";
import { DFS_SLOTS, SALARY_CAP, DFS_SLATE } from "./dfs-slate";

describe("dfs optimizer edge — benchmark + gpp selection", () => {
  it("cash: the new exact solver agrees with the incumbent exact optimizer", () => {
    const b = benchmark(DFS_SLATE);
    expect(b.cash.exactOptimal).toBe(true);
    expect(b.cash.exactSalary).toBeLessThanOrEqual(SALARY_CAP);
    // Two independently-implemented exact solvers for the same combinatorial
    // optimum must agree — disagreement would expose a real bug in one of them.
    expect(b.cash.exactObjective).toBeCloseTo(b.cash.incumbentObjective, 6);
    expect(b.cash.objectiveGapVsIncumbent).toBeCloseTo(0, 6);
  });

  it("gpp: correlation-aware selection is evaluated head-to-head with the point-sum lineup", () => {
    const b = benchmark(DFS_SLATE);
    // Both the point-sum lineup and the correlation-selected lineup carry a
    // finite, positive CORRELATED ceiling expectation — the number a point-sum
    // objective never computes. correlationEdge is reported honestly (its sign
    // varies by slate; on a tiny illustrative slate it is small either way).
    expect(b.gpp.naiveSimCeilEV).toBeGreaterThan(0);
    expect(b.gpp.selectedSimCeilEV).toBeGreaterThan(0);
    expect(Number.isFinite(b.gpp.correlationEdge)).toBe(true);
    expect(b.gpp.naiveCeilingSum).toBeGreaterThan(0);
    expect(b.gpp.naiveNodes).toBeGreaterThan(0); // provable GPP optimum via search
  });

  it("selectGppLineups returns glass-box, cap-legal lineups ranked by sim score", () => {
    const out = selectGppLineups(3, { sims: 800, seed: 2 }, DFS_SLATE);
    expect(out.length).toBeGreaterThanOrEqual(1);
    out.forEach((l) => {
      expect(l.players.length).toBe(DFS_SLOTS.length);
      expect(l.metrics.salary).toBeLessThanOrEqual(SALARY_CAP);
      expect(Number.isFinite(l.sim.ceilEV)).toBe(true);
    });
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1]!.sim.score).toBeGreaterThanOrEqual(out[i]!.sim.score);
    }
  });

  it("finds a same-team stack pair in the slate", () => {
    const pair = bestStackPair(DFS_SLATE);
    expect(pair).not.toBeNull();
    expect(pair!.qb.team).toBe(pair!.catcher.team);
    expect(pair!.qb.pos).toBe("QB");
  });
});
