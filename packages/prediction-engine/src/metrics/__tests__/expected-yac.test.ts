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
});
