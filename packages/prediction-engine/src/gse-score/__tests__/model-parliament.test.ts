import { describe, expect, it } from "vitest";
import { aggregateModelParliament } from "../model-parliament.js";

describe("aggregateModelParliament", () => {
  it("blocks when no valid model votes exist", () => {
    const result = aggregateModelParliament({ votes: [{ confidence: 0, modelId: "bad", probability: 1.2 }] });

    expect(result.status).toBe("BLOCK");
    expect(result.modeledProbability).toBeNull();
    expect(result.confidenceScore).toBe(0);
  });

  it("discounts stale votes and reports disagreement", () => {
    const result = aggregateModelParliament({
      votes: [
        { confidence: 1, modelId: "fresh", probability: 0.62 },
        { confidence: 1, modelId: "stale", probability: 0.44, stale: true },
      ],
    });

    expect(result.modeledProbability).toBeGreaterThan(0.55);
    expect(result.warnings.join(" ")).toContain("stale");
    expect(result.disagreement).toBeGreaterThan(0);
  });
});
