import { describe, expect, it } from "vitest";
import { NFLVERSE_CATALOG } from "./nflverse-source.js";
import {
  NFLVERSE_TREND_PLANS,
  datasetsForTrendPlans,
  getNflverseTrendPlan,
  type TrendPlanKey,
} from "./nflverse-trend-plan.js";

describe("nflverse trend ingestion plans", () => {
  it("only references datasets that exist in the nflverse catalog", () => {
    const catalogKeys = new Set(Object.keys(NFLVERSE_CATALOG));
    for (const plan of Object.values(NFLVERSE_TREND_PLANS)) {
      expect(plan.publicUntilReady).toBe("empty-state-only");
      expect(plan.minimumObservations).toBeGreaterThanOrEqual(500);
      for (const dataset of plan.requiredDatasets) {
        expect(catalogKeys.has(dataset)).toBe(true);
      }
      for (const join of plan.joins) {
        expect(catalogKeys.has(join.from)).toBe(true);
        expect(catalogKeys.has(join.to)).toBe(true);
        expect(join.on.length).toBeGreaterThan(0);
      }
    }
  });

  it("defines the QB-age to RB-target-share plan as a real team-week join", () => {
    const plan = getNflverseTrendPlan("qb-age-rb-target-share");
    expect(plan.grain).toBe("team-week");
    expect(plan.metric).toMatch(/RB targets/);
    expect(plan.cohortFeature).toMatch(/qb/i);
    expect(plan.requiredDatasets).toEqual([
      "players",
      "rosters",
      "player_stats_week",
      "snap_counts",
      "schedules",
    ]);
  });

  it("dedupes datasets while preserving first-use order", () => {
    const keys: TrendPlanKey[] = ["qb-age-rb-target-share", "injury-cascade"];
    expect(datasetsForTrendPlans(keys)).toEqual([
      "players",
      "rosters",
      "player_stats_week",
      "snap_counts",
      "schedules",
      "injuries",
      "depth_charts",
    ]);
  });
});
