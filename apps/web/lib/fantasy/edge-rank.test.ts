import { describe, it, expect } from "vitest";
import { rankLineupsByEdge } from "./edge-rank";
import { kBest } from "./dfs-exact";
import { DFS_SLATE } from "./dfs-slate";

// The fixture is passed EXPLICITLY: `activeDfsSlate()` no longer defaults to
// the sample pool (it returns the real slate or an explicit empty slate), and
// a ranking test must name its fixture rather than inherit whichever pool the
// registry happens to hold.
describe("edge rank (Wave4 #12)", () => {
  it("ranks k-best lineups 1..k with components attached", () => {
    const pools = kBest({ mode: "gpp" }, 5, DFS_SLATE);
    const ranked = rankLineupsByEdge(pools);
    expect(ranked).toHaveLength(5);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5]);
    for (const r of ranked) {
      expect(r.edgeScore).toBeGreaterThan(0);
      expect(r.meanLeverage).toBeGreaterThan(0);
      expect(r.totalProj).toBeGreaterThan(0);
      expect(r.valuePer1k).toBeGreaterThan(0);
      expect(r.players).toHaveLength(9);
    }
  });

  it("sorts by edgeScore desc and is deterministic", () => {
    const pools = kBest({ mode: "gpp" }, 5, DFS_SLATE);
    const a = rankLineupsByEdge(pools);
    const b = rankLineupsByEdge([...pools].reverse());
    expect(a.map((r) => r.edgeScore)).toEqual(b.map((r) => r.edgeScore));
    for (let i = 1; i < a.length; i++) expect(a[i - 1].edgeScore).toBeGreaterThanOrEqual(a[i].edgeScore);
  });
});
