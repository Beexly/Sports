import { describe, expect, it } from "vitest";
import { yprrScore } from "../receiving/yprr.js";
import type { MetricSourcePolicy } from "../core/validation.js";

const sourcePolicy: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "play-by-play",
  sourceId: "mock-pbp",
  status: "approved",
};

describe("yprrScore", () => {
  it("calculates correct YPRR", () => {
    const result = yprrScore({
      receivingYards: 50,
      routesRun: 20,
      sampleSize: 100,
      sourcePolicy: [sourcePolicy],
    });

    expect(result.yprr).toBe(2.5);
    expect(result.status).toBe("SHADOW");
  });

  it("handles zero routes run safely", () => {
    const result = yprrScore({
      receivingYards: 0,
      routesRun: 0,
      sampleSize: 0,
      sourcePolicy: [sourcePolicy],
    });

    expect(result.yprr).toBe(0);
    expect(result.uncertaintyBand).toBe("HIGH"); // small sample
  });

  it("supports negative yardage", () => {
    const result = yprrScore({
      receivingYards: -5,
      routesRun: 10,
      sampleSize: 100,
      sourcePolicy: [sourcePolicy],
    });

    expect(result.yprr).toBe(-0.5);
  });
});
