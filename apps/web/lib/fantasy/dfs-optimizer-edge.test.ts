import { describe, it, expect } from "vitest";
import { benchmark, selectGppLineups, bestStackPair } from "./dfs-optimizer-edge";
import { DFS_SLOTS, SALARY_CAP, DFS_SLATE } from "./dfs-slate";

describe("dfs optimizer edge — benchmark + gpp selection", () => {
  it("cash: the new exact solver agrees with the incumbent exact optimizer", () => {
    const b = benchmark(DFS_SLATE);
    expect(b.cash.exactSalary).toBeLessThanOrEqual(SALARY_CAP);
    // At least ONE side must be a completed search, or "they agree" is two
    // guesses landing together. Measured 2026-09-18 on the shipped 36-player
    // slate: dfs-exact completes, and the incumbent does NOT — it stops on its
    // own node cap at exactly 400,001 nodes (7.16M work, well inside the cost
    // budget) and needs 481,198 to finish. Same for leverage; gpp completes in
    // 73,418. So this is written as a disjunction rather than asserting both:
    // it is the honest contract today AND it keeps holding if the node cap is
    // later raised, instead of failing on the improvement.
    expect(b.cash.exactOptimal || b.cash.incumbentOptimal).toBe(true);
    expect(b.cash.exactOptimal).toBe(true);
    // Two independently-implemented exact solvers for the same combinatorial
    // optimum must agree — disagreement would expose a real bug in one of them.
    // With one side proven, agreement shows the other REACHED the optimum even
    // where it did not prove it, which is exactly what the incumbent does here:
    // objective 120.5000 on both sides.
    expect(b.cash.exactObjective).toBeCloseTo(b.cash.incumbentObjective, 6);
    expect(b.cash.objectiveGapVsIncumbent).toBeCloseTo(0, 6);
    // And the flag is reported at all, so a reader of the benchmark can see
    // which side was a proof. Before this existed the gap was unreadable: a
    // non-zero value could not be told from a budget stop.
    expect(typeof b.cash.incumbentOptimal).toBe("boolean");
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
