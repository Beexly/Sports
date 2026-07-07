import { describe, it, expect } from "vitest";
import { simulateLineups, rankByTournamentScore, mulberry32 } from "./dfs-correlation";
import { DFS_SLATE, type DfsPlayer } from "./dfs-slate";

const byId = (id: string): DfsPlayer => {
  const p = DFS_SLATE.find((x) => x.id === id);
  if (!p) throw new Error(`missing fixture player ${id}`);
  return p;
};

// dqb1 = Silas Hart (QB, PHI) · dwr0 = Quincy Ohm (WR, PHI, his stack) ·
// dwr3 = Emory Banks (WR, LAR — a different game, similar ceiling)
const QB_PHI = byId("dqb1");
const WR_PHI = byId("dwr0");
const WR_LAR = byId("dwr3");

describe("dfs correlation / simulation", () => {
  it("is deterministic under a fixed seed", () => {
    const a = simulateLineups([[QB_PHI, WR_PHI]], { sims: 500, seed: 123 });
    const b = simulateLineups([[QB_PHI, WR_PHI]], { sims: 500, seed: 123 });
    expect(a[0]).toEqual(b[0]);
  });

  it("mulberry32 is a stable stream", () => {
    const r1 = mulberry32(9); const r2 = mulberry32(9);
    expect([r1(), r1(), r1()]).toEqual([r2(), r2(), r2()]);
  });

  it("captures correlation: a same-team stack has a fatter ceiling than an equal-projection off-team pair", () => {
    // Both pairs share the same QB and a WR of near-identical projection/ceiling.
    // The only difference is whether the WR is on the QB's team (correlated) or
    // in a different game (independent). A point-sum sees them as ~equal; the
    // simulation should not — the stack has higher variance and a higher p90.
    const [stack] = simulateLineups([[QB_PHI, WR_PHI]], { sims: 6000, seed: 1 });
    const [split] = simulateLineups([[QB_PHI, WR_LAR]], { sims: 6000, seed: 1 });

    // near-equal means (point-sum's whole view of them)
    expect(Math.abs(stack!.mean - split!.mean)).toBeLessThan(4);
    // but the correlated stack has a wider distribution and a higher ceiling
    expect(stack!.stdev).toBeGreaterThan(split!.stdev);
    expect(stack!.p90).toBeGreaterThan(split!.p90);
  });

  it("ranks candidates by tournament score, highest first", () => {
    const ranked = rankByTournamentScore(
      [[QB_PHI, WR_LAR], [QB_PHI, WR_PHI]],
      { sims: 2000, seed: 5 },
    );
    expect(ranked.length).toBe(2);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1]!.sim.score).toBeGreaterThanOrEqual(ranked[i]!.sim.score);
    }
  });
});
