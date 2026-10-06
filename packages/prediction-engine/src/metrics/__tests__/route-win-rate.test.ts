import { describe, expect, it } from "vitest";
import { routeWinRateScore } from "../receiving/route-win-rate.js";
import type { MetricSourcePolicy } from "../core/validation.js";

const sourcePolicy: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "charting-data",
  sourceId: "mock-charting",
  status: "approved",
};

describe("routeWinRateScore", () => {
  it("calculates the correct route win rate", () => {
    const result = routeWinRateScore({
      routesWon: 15,
      routesRun: 20,
      sampleSize: 100,
      sourcePolicy: [sourcePolicy],
    });

    expect(result.routeWinRate).toBe(0.75);
    expect(result.status).toBe("SHADOW");
    expect(result.confidenceMeaning).toBe("EVIDENCE_QUALITY_NOT_PLAYER_TALENT");
  });

  it("handles zero routes run safely", () => {
    const result = routeWinRateScore({
      routesWon: 0,
      routesRun: 0,
      sampleSize: 0,
      sourcePolicy: [sourcePolicy],
    });

    expect(result.routeWinRate).toBe(0);
    expect(result.uncertaintyBand).toBe("HIGH"); // small sample
  });

  it("clamps the output to a max of 1.0", () => {
    const result = routeWinRateScore({
      routesWon: 25,
      routesRun: 20, // Data error
      sampleSize: 100,
      sourcePolicy: [sourcePolicy],
    });

    expect(result.routeWinRate).toBe(1.0);
  });
});
