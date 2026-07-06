import { describe, expect, it } from "vitest";
import { rushOverExpectedGse } from "../rushing/rush-over-expected.js";
import type { MetricSourcePolicy } from "../core/validation.js";

const sourcePolicy: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "nflverse-derived",
  sourceId: "nflverse-pbp",
  status: "approved",
};

describe("rushOverExpectedGse", () => {
  it("rises when actual rush yards clear the GSE expected rush baseline", () => {
    const stuffed = rushOverExpectedGse({
      actualRushYards: -1,
      brokenTackleProxy: 0,
      expectedRushYards: 4.8,
      rusherRushOverExpectedPrior: -1.2,
      sampleSize: 360,
      sourcePolicy: [sourcePolicy],
      yardsAfterContactProxy: 0.4,
    });
    const created = rushOverExpectedGse({
      actualRushYards: 16,
      brokenTackleProxy: 0.75,
      expectedRushYards: 4.6,
      rusherRushOverExpectedPrior: 2.2,
      sampleSize: 360,
      sourcePolicy: [sourcePolicy],
      yardsAfterContactProxy: 5.6,
    });

    expect(created.rushYardsOverExpected).toBeGreaterThan(stuffed.rushYardsOverExpected);
    expect(created.creationIndex).toBeGreaterThan(stuffed.creationIndex);
    expect(created.status).toBe("SHADOW");
    expect(created.confidenceMeaning).toBe("EVIDENCE_QUALITY_NOT_REPEATABLE_RUSH_TALENT");
    expect(Object.prototype.hasOwnProperty.call(created.drivers[0], "weight")).toBe(false);
  });

  it("keeps confidence separate from the residual score", () => {
    const smallSample = rushOverExpectedGse({
      actualRushYards: 11,
      expectedRushYards: 4,
      sampleSize: 10,
      sourcePolicy: [sourcePolicy],
    });
    const largeSample = rushOverExpectedGse({
      actualRushYards: 11,
      expectedRushYards: 4,
      sampleSize: 900,
      sourcePolicy: [sourcePolicy],
    });

    expect(smallSample.creationIndex).toBe(largeSample.creationIndex);
    expect(largeSample.confidenceScore).toBeGreaterThan(smallSample.confidenceScore);
  });
});
