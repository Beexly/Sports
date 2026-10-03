import { describe, expect, it } from "vitest";
import { expectedYacGse } from "../receiving/expected-yac.js";
import type { MetricSourcePolicy } from "../core/validation.js";

const sourcePolicy: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "nflverse-derived",
  sourceId: "nflverse-pbp",
  status: "approved",
};

describe("expectedYacGse", () => {
  it("rises with space, separation, cushion, and receiver prior", () => {
    const low = expectedYacGse({
      airYards: 14,
      defenderLeverageProxy: 0.9,
      inSpaceProxy: 0.15,
      receiverYacPrior: 2.5,
      sampleSize: 300,
      separationYards: 0.7,
      sourcePolicy: [sourcePolicy],
    });
    const high = expectedYacGse({
      airYards: 3,
      cushionYards: 8,
      defenderLeverageProxy: 0.1,
      inSpaceProxy: 0.9,
      receiverYacPrior: 8.5,
      sampleSize: 300,
      separationYards: 5.5,
      sourcePolicy: [sourcePolicy],
    });

    expect(high.expectedYac).toBeGreaterThan(low.expectedYac);
    expect(high.status).toBe("SHADOW");
    expect(high.confidenceMeaning).toBe("EVIDENCE_QUALITY_NOT_YAC_CERTAINTY");
    expect(Object.prototype.hasOwnProperty.call(high.drivers[0], "weight")).toBe(false);
  });

  it("air_yards_depth driver direction matches its contribution sign on a short target", () => {
    const shortTarget = expectedYacGse({
      airYards: 4,
      sampleSize: 300,
      sourcePolicy: [sourcePolicy],
    });
    const depthDriver = shortTarget.drivers.find((driver) => driver.name === "air_yards_depth");
    if (!depthDriver) throw new Error("air_yards_depth driver missing");
    // A short target yields a negative depth penalty, so the contribution is
    // positive; the emitted direction must agree with that sign (UP), not DOWN.
    expect(depthDriver.contribution).toBeGreaterThan(0);
    expect(depthDriver.direction).toBe("UP");
  });

  it("confidence tracks evidence sample size and stays decoupled from the YAC score", () => {
    const base = {
      airYards: 8,
      sourcePolicy: [sourcePolicy],
    } as const;
    const smallSample = expectedYacGse({ ...base, sampleSize: 100 });
    const largeSample = expectedYacGse({ ...base, sampleSize: 900 });

    expect(largeSample.confidenceScore).toBeGreaterThan(smallSample.confidenceScore);
    // Identical modeling inputs => identical expected YAC despite different confidence.
    expect(largeSample.expectedYac).toBe(smallSample.expectedYac);
  });
});
