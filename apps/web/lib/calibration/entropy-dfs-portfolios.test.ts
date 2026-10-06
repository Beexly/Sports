import { describe, it, expect } from "vitest";
import {
  shannonEntropy,
  opponentEntropyFromOwnership,
  lineupOverlap,
  portfolioDiversity,
  expectedProfit,
  greedyEntropyPortfolio,
  type DfsCandidate,
} from "@/lib/calibration/entropy-dfs-portfolios";

// ============================================================
// arXiv 2308.14339v3 — entropy DFS portfolios. Additive only.
// ============================================================

const mk = (id: string, players: string[], salary: number, proj: number): DfsCandidate => ({
  id,
  players,
  salary,
  projectedPoints: proj,
});

describe("entropy DFS portfolios — 2308.14339v3", () => {
  it("shannonEntropy of uniform is log n, of degenerate is 0", () => {
    expect(shannonEntropy([0.25, 0.25, 0.25, 0.25])).toBeCloseTo(Math.log(4), 10);
    expect(shannonEntropy([1, 0, 0])).toBeCloseTo(0, 10);
    expect(shannonEntropy([])).toBe(0);
  });

  it("opponentEntropyFromOwnership sums binary entropies", () => {
    expect(opponentEntropyFromOwnership({ a: 0.5 })).toBeCloseTo(Math.log(2), 10);
    expect(opponentEntropyFromOwnership({})).toBe(0);
  });

  it("lineupOverlap is Jaccard similarity", () => {
    expect(lineupOverlap(["a", "b"], ["a", "b"])).toBe(1);
    expect(lineupOverlap(["a", "b"], ["c", "d"])).toBe(0);
    expect(lineupOverlap(["a", "b", "c"], ["b", "c", "d"])).toBeCloseTo(0.5, 10);
  });

  it("portfolioDiversity is 1 for disjoint lineups, 0 for identical", () => {
    const d = portfolioDiversity([
      mk("1", ["a", "b"], 40000, 120),
      mk("2", ["c", "d"], 40000, 120),
    ]);
    expect(d).toBeCloseTo(1, 10);
    const z = portfolioDiversity([
      mk("1", ["a", "b"], 40000, 120),
      mk("2", ["a", "b"], 40000, 120),
    ]);
    expect(z).toBeCloseTo(0, 10);
    expect(portfolioDiversity([])).toBe(0);
  });

  it("expectedProfit subtracts the entry fee", () => {
    // Degenerate score: always 100. One tier pays 3x entry at 90+.
    const cdf = (x: number) => (x >= 100 ? 1 : 0);
    const ev = expectedProfit(cdf, [{ minScore: 90, payout: 30 }], 10, 200);
    expect(ev).toBeCloseTo(20, 6);
  });

  it("greedyEntropyPortfolio diversifies under the cap and floor", () => {
    const cands = [
      mk("1", ["a", "b", "c"], 50000, 130),
      mk("2", ["a", "b", "d"], 50000, 128),
      mk("3", ["e", "f", "g"], 50000, 125),
      mk("4", ["h", "i", "j"], 60000, 140), // over cap
      mk("5", ["k", "l", "m"], 50000, 80), // below floor drag
    ];
    const port = greedyEntropyPortfolio(cands, 2, 50000, 120);
    expect(port.length).toBe(2);
    expect(port.every((c) => c.salary <= 50000)).toBe(true);
    const avg = port.reduce((a, c) => a + c.projectedPoints, 0) / 2;
    expect(avg).toBeGreaterThanOrEqual(120);
    // First pick is the highest projection; second is the diverse one.
    expect(port[0]!.id).toBe("1");
    expect(port[1]!.id).toBe("3");
  });

  it("greedyEntropyPortfolio handles degenerate input", () => {
    expect(greedyEntropyPortfolio([], 3, 50000, 100)).toEqual([]);
    expect(greedyEntropyPortfolio([mk("1", ["a"], 1, 1)], 0, 50000, 0)).toEqual([]);
  });
});
