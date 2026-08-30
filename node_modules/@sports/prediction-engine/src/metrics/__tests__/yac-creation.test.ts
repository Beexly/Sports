import { describe, expect, it } from "vitest";
import { yacCreationGse } from "../receiving/yac-creation.js";
import type { MetricSourcePolicy } from "../core/validation.js";

const sourcePolicy: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "nflverse-derived",
  sourceId: "nflverse-pbp",
  status: "approved",
};

describe("yacCreationGse", () => {
  it("rises when actual YAC clears the GSE expected YAC baseline", () => {
    const belowExpectation = yacCreationGse({
      actualYardsAfterCatch: 2.1,
      brokenTackleProxy: 0,
      contactBalanceProxy: 0.1,
      expectedYac: 7.8,
      receiverYacOverExpectedPrior: -1,
      sampleSize: 320,
      sourcePolicy: [sourcePolicy],
    });
    const aboveExpectation = yacCreationGse({
      actualYardsAfterCatch: 13.6,
      brokenTackleProxy: 0.8,
      contactBalanceProxy: 0.7,
      expectedYac: 5.2,
      receiverYacOverExpectedPrior: 2.4,
      sampleSize: 320,
      sourcePolicy: [sourcePolicy],
    });

    expect(aboveExpectation.yacOverExpected).toBeGreaterThan(belowExpectation.yacOverExpected);
    expect(aboveExpectation.creationIndex).toBeGreaterThan(belowExpectation.creationIndex);
    expect(aboveExpectation.status).toBe("SHADOW");
    expect(aboveExpectation.confidenceMeaning).toBe("EVIDENCE_QUALITY_NOT_REPEATABLE_SKILL");
    expect(Object.prototype.hasOwnProperty.call(aboveExpectation.drivers[0], "weight")).toBe(false);
  });

  it("keeps confidence separate from the residual score", () => {
    const smallSample = yacCreationGse({
      actualYardsAfterCatch: 14,
      expectedYac: 4,
      sampleSize: 10,
      sourcePolicy: [sourcePolicy],
    });
    const largeSample = yacCreationGse({
      actualYardsAfterCatch: 14,
      expectedYac: 4,
      sampleSize: 900,
      sourcePolicy: [sourcePolicy],
    });

    expect(smallSample.creationIndex).toBe(largeSample.creationIndex);
    expect(largeSample.confidenceScore).toBeGreaterThan(smallSample.confidenceScore);
  });

  it("fails closed to HIGH uncertainty and floored confidence when the source policy is empty", () => {
    const cleared = yacCreationGse({
      actualYardsAfterCatch: 14,
      expectedYac: 4,
      sampleSize: 900,
      sourcePolicy: [sourcePolicy],
    });
    const blockedSource = yacCreationGse({
      actualYardsAfterCatch: 14,
      expectedYac: 4,
      sampleSize: 900,
      sourcePolicy: [],
    });

    expect(blockedSource.uncertaintyBand).toBe("HIGH");
    // HIGH band floors confidence to base 34 (+ capped sample bonus), well below a cleared source.
    expect(blockedSource.confidenceScore).toBe(43);
    expect(blockedSource.confidenceScore).toBeLessThan(cleared.confidenceScore);
  });

  it("marks the residual driver DOWN and reports negative creation when actual YAC trails expected", () => {
    const belowBaseline = yacCreationGse({
      actualYardsAfterCatch: 2,
      expectedYac: 10,
      sampleSize: 320,
      sourcePolicy: [sourcePolicy],
    });

    const residualDriver = belowBaseline.drivers.find((driver) => driver.name === "yac_residual");
    expect(residualDriver?.direction).toBe("DOWN");
    expect(residualDriver?.contribution).toBeLessThan(0);
    expect(belowBaseline.yacOverExpected).toBeLessThan(0);
  });
});
