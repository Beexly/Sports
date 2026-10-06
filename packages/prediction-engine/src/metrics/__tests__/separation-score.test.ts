import { describe, expect, it } from "vitest";
import { separationScoreScore } from "../receiving/separation-score.js";
import type { MetricSourcePolicy } from "../core/validation.js";

const sourcePolicy: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "tracking",
  sourceId: "mock-tracking",
  status: "approved",
};

describe("separationScoreScore", () => {
  it("blends target and catch point separation when both are provided", () => {
    const result = separationScoreScore({
      separationAtTarget: 2.0,
      separationAtCatchPoint: 3.0,
      sampleSize: 100,
      sourcePolicy: [sourcePolicy],
    });

    // 2.0 * 0.6 + 3.0 * 0.4 = 1.2 + 1.2 = 2.4
    expect(result.separationScore).toBe(2.4);
    expect(result.status).toBe("SHADOW");
  });

  it("uses only separation at target if catch point is missing", () => {
    const result = separationScoreScore({
      separationAtTarget: 2.5,
      sampleSize: 100,
      sourcePolicy: [sourcePolicy],
    });

    expect(result.separationScore).toBe(2.5);
    expect(result.uncertaintyBand).toBe("MEDIUM"); // proxy count 1
  });

  it("clamps separation score to a maximum of 10", () => {
    const result = separationScoreScore({
      separationAtTarget: 15.0,
      sampleSize: 100,
      sourcePolicy: [sourcePolicy],
    });

    expect(result.separationScore).toBe(10);
  });
});
