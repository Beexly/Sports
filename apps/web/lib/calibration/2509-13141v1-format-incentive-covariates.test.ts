import { describe, expect, it } from "vitest";

import {
  ENABLED,
  goalMarginalValue,
  incentiveTier,
  incentiveValidityTest,
} from "@/lib/calibration/2509-13141v1-format-incentive-covariates";

const T = (over: Record<string, number | string> = {}) => ({
  team: "X",
  points: 10,
  goalDiff: 2,
  position: 8,
  ...over,
});

describe("format-aware incentive covariates", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("tiers late near-cutoff matches high and dead rubbers low", () => {
    const crunch = {
      matchday: 7,
      totalMatchdays: 8,
      home: T({}),
      away: T({}),
      homeCutoffGap: 1,
      awayCutoffGap: -2,
    };
    expect(incentiveTier(crunch)).toBe("high");
    const dead = {
      matchday: 2,
      totalMatchdays: 8,
      home: T({}),
      away: T({}),
      homeCutoffGap: 12,
      awayCutoffGap: -15,
    };
    expect(incentiveTier(dead)).toBe("low");
  });

  it("goal marginal value peaks at the cutoff", () => {
    expect(goalMarginalValue(0, 0)).toBeGreaterThan(goalMarginalValue(5, 0));
    expect(goalMarginalValue(0, 0)).toBeLessThanOrEqual(1);
    expect(goalMarginalValue(10, 20)).toBe(0);
  });

  it("validity test passes when incentive predicts goals within strength buckets", () => {
    const rows = [];
    for (let b = 0; b < 3; b++) {
      for (let i = 0; i < 20; i++) {
        rows.push({ tier: "high" as const, goalSupremacy: 0.4, strengthBucket: b });
        rows.push({ tier: "low" as const, goalSupremacy: -0.1, strengthBucket: b });
      }
    }
    const res = incentiveValidityTest(rows);
    expect(res.pass).toBe(true);
    expect(res.highMean).toBeGreaterThan(res.lowMean);
    expect(res.bucketsTested).toBe(3);
    const flipped = rows.map((r) =>
      r.tier === "high" ? { ...r, tier: "low" as const } : { ...r, tier: "high" as const },
    );
    expect(incentiveValidityTest(flipped).pass).toBe(false);
  });
});
