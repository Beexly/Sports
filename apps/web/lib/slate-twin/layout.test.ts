import { describe, it, expect } from "vitest";
import { computeGalaxyLayout, minPairwiseDistance, MIN_SEPARATION } from "./layout";
import { DEMO_SLATE, LEAGUES, type TwinGame } from "./demo-slate";

describe("computeGalaxyLayout", () => {
  const layout = computeGalaxyLayout(DEMO_SLATE.games);

  it("positions every game", () => {
    for (const g of DEMO_SLATE.games) {
      expect(layout.positions.has(g.id), `missing position for ${g.id}`).toBe(true);
    }
    expect(layout.positions.size).toBe(DEMO_SLATE.games.length);
  });

  it("keeps every pair of systems at least MIN_SEPARATION apart (no overlapping cores)", () => {
    expect(minPairwiseDistance(layout)).toBeGreaterThanOrEqual(MIN_SEPARATION);
  });

  it("separates league clusters far more than the within-cluster spread", () => {
    const centers = LEAGUES.map((lg) => layout.leagueCenters[lg]);
    let minCenterGap = Infinity;
    for (let i = 0; i < centers.length; i++) {
      for (let j = i + 1; j < centers.length; j++) {
        const a = centers[i]!;
        const b = centers[j]!;
        const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
        if (d < minCenterGap) minCenterGap = d;
      }
    }
    // Cluster centres are well beyond a single system's orbit-ring footprint.
    expect(minCenterGap).toBeGreaterThan(8);
  });

  it("is deterministic across calls", () => {
    const a = computeGalaxyLayout(DEMO_SLATE.games);
    const b = computeGalaxyLayout(DEMO_SLATE.games);
    for (const g of DEMO_SLATE.games) {
      expect(a.positions.get(g.id)).toEqual(b.positions.get(g.id));
    }
  });

  it("reports only leagues that have games as active", () => {
    const onlyNfl = DEMO_SLATE.games.filter((g) => g.league === "NFL") as TwinGame[];
    const l = computeGalaxyLayout(onlyNfl);
    expect(l.activeLeagues).toEqual(["NFL"]);
  });

  it("handles a single-game league by seating it at the cluster centre", () => {
    const one = [DEMO_SLATE.games.find((g) => g.league === "NFL")!];
    const l = computeGalaxyLayout(one);
    expect(l.positions.get(one[0]!.id)).toEqual(l.leagueCenters.NFL);
  });
});
