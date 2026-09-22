/**
 * Dominance pruning — tests (arXiv 2211.02417v3).
 *
 * ACCEPTANCE GATE: the Pareto filter keeps non-dominated players per
 * bucket; the dominance prune drops strictly dominated peers; the
 * pruned pool reproduces the unpruned brute-force optimum exactly on
 * synthetic slates while shrinking the pool.
 */
import { describe, expect, it } from "vitest";
import {
  bruteForceOptimal,
  dominancePrune,
  paretoFilter,
  prunePool,
  verifyPruning,
  type DfsPlayer,
} from "./dominance-pruning";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const p = (id: string, position: string, salary: number, projection: number): DfsPlayer => ({
  id,
  position,
  salary,
  projection,
});

describe("paretoFilter", () => {
  it("keeps only Pareto-optimal players per bucket", () => {
    const players = [
      p("a", "QB", 7000, 20),
      p("b", "QB", 7000, 18), // dominated by a (same bucket)
      p("c", "QB", 6500, 19), // not dominated: cheaper
      p("d", "RB", 7000, 15), // different position bucket
    ];
    const kept = paretoFilter(players, 1000);
    const ids = kept.map((x) => x.id);
    expect(ids).toContain("a");
    expect(ids).toContain("c");
    expect(ids).toContain("d");
    expect(ids).not.toContain("b");
    expect(paretoFilter([])).toEqual([]);
  });
});

describe("dominancePrune", () => {
  it("drops strictly dominated same-position peers", () => {
    const players = [
      p("a", "WR", 6000, 16),
      p("b", "WR", 6000, 14), // dominated by a
      p("c", "WR", 5500, 16), // not dominated: cheaper
      p("d", "TE", 6000, 14), // different position: safe
    ];
    const ids = dominancePrune(players).map((x) => x.id);
    expect(ids).not.toContain("b");
    expect(ids).toContain("a");
    expect(ids).toContain("c");
    expect(ids).toContain("d");
  });
});

describe("verifyPruning", () => {
  it("reproduces unpruned optima exactly on synthetic slates", () => {
    const rand = mulberry32(281);
    for (let slate = 0; slate < 20; slate++) {
      const players: DfsPlayer[] = [];
      const positions = ["QB", "RB", "WR", "TE"];
      for (const pos of positions) {
        for (let i = 0; i < 8; i++) {
          const salary = 4000 + Math.floor(rand() * 5000);
          // Projection loosely tied to salary plus noise (dominated
          // players arise naturally).
          players.push(p(`${pos}${i}`, pos, salary, salary / 500 + (rand() - 0.5) * 6));
        }
      }
      const v = verifyPruning(players, positions, 30000, 1000);
      expect(v.optimaMatch).toBe(true);
      expect(v.prunedCount).toBeLessThan(v.originalCount);
    }
  });

  it("bruteForceOptimal respects the cap", () => {
    const players = [p("a", "QB", 9000, 25), p("b", "QB", 5000, 15)];
    const opt = bruteForceOptimal(players, ["QB"], 6000);
    expect(opt?.players[0]?.id).toBe("b");
    expect(bruteForceOptimal(players, ["RB"], 60000)).toBeNull();
  });

  it("prunePool composes both steps", () => {
    const players = [p("a", "QB", 7000, 20), p("b", "QB", 7000, 18)];
    expect(prunePool(players, 1000).map((x) => x.id)).toEqual(["a"]);
  });
});
