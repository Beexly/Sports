import { describe, expect, it } from "vitest";
import { robbedScoreMetric } from "../receiving/robbed-score.js";
import type { MetricSourcePolicy } from "../core/validation.js";

const sourcePolicy: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "charting-data",
  sourceId: "mock-charting",
  status: "approved",
};

describe("robbedScoreMetric", () => {
  it("calculates the correct robbed score from components", () => {
    // (Route Win Rate - TPRR) + uncatchable target percent + (XFPTS - FPTS)
    // (0.8 - 0.2) + 0.15 + (15.0 - 10.0) = 0.6 + 0.15 + 5.0 = 5.75
    const result = robbedScoreMetric({
      routeWinRate: 0.8,
      tprr: 0.2,
      uncatchableTargetPercent: 0.15,
      expectedFantasyPoints: 15.0,
      actualFantasyPoints: 10.0,
      sampleSize: 100,
      sourcePolicy: [sourcePolicy],
    });

    expect(result.robbedScore).toBe(5.75);
    expect(result.status).toBe("SHADOW");
  });

  it("handles negative robbed score when overperforming", () => {
    // (0.5 - 0.4) + 0.05 + (10.0 - 25.0) = 0.1 + 0.05 - 15.0 = -14.85
    const result = robbedScoreMetric({
      routeWinRate: 0.5,
      tprr: 0.4,
      uncatchableTargetPercent: 0.05,
      expectedFantasyPoints: 10.0,
      actualFantasyPoints: 25.0,
      sampleSize: 100,
      sourcePolicy: [sourcePolicy],
    });

    expect(result.robbedScore).toBe(-14.85);
  });
});
