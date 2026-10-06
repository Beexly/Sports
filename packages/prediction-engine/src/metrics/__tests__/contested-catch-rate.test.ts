import { describe, expect, it } from "vitest";
import { contestedCatchRateScore } from "../receiving/contested-catch-rate.js";
import type { MetricSourcePolicy } from "../core/validation.js";

const sourcePolicy: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "charting-data",
  sourceId: "mock-charting",
  status: "approved",
};

describe("contestedCatchRateScore", () => {
  it("calculates the correct contested catch rate", () => {
    const result = contestedCatchRateScore({
      contestedCatches: 4,
      contestedTargets: 10,
      sampleSize: 100,
      sourcePolicy: [sourcePolicy],
    });

    expect(result.contestedCatchRate).toBe(0.4);
    expect(result.status).toBe("SHADOW");
  });

  it("handles zero contested targets safely", () => {
    const result = contestedCatchRateScore({
      contestedCatches: 0,
      contestedTargets: 0,
      sampleSize: 100,
      sourcePolicy: [sourcePolicy],
    });

    expect(result.contestedCatchRate).toBe(0);
  });

  it("clamps the output to a max of 1.0", () => {
    const result = contestedCatchRateScore({
      contestedCatches: 12,
      contestedTargets: 10, // Data error
      sampleSize: 100,
      sourcePolicy: [sourcePolicy],
    });

    expect(result.contestedCatchRate).toBe(1.0);
  });
});
