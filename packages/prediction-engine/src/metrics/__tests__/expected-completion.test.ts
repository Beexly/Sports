import { describe, expect, it } from "vitest";
import { expectedCompletionGse } from "../passing/expected-completion.js";
import type { MetricSourcePolicy } from "../core/validation.js";

const sourcePolicy: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "nflverse-derived",
  sourceId: "nflverse-pbp",
  status: "approved",
};

describe("expectedCompletionGse", () => {
  it("decreases as air yards, pressure, and weather penalty rise", () => {
    const base = {
      airYards: 2,
      pressureProxy: 0,
      sampleSize: 400,
      sourcePolicy: [sourcePolicy],
      weatherPenalty: 0,
      yardsToGo: 2,
    };
    const easy = expectedCompletionGse(base);
    const deeperAirYards = expectedCompletionGse({ ...base, airYards: 35 });
    const pressured = expectedCompletionGse({ ...base, pressureProxy: 0.9 });
    const badWeather = expectedCompletionGse({ ...base, weatherPenalty: 0.8 });
    const hard = expectedCompletionGse({ ...base, airYards: 35, pressureProxy: 0.9, weatherPenalty: 0.8, yardsToGo: 12 });

    expect(deeperAirYards.probability).toBeLessThan(easy.probability);
    expect(pressured.probability).toBeLessThan(easy.probability);
    expect(badWeather.probability).toBeLessThan(easy.probability);
    expect(hard.probability).toBeLessThan(easy.probability);
    expect(hard.difficultyIndex).toBeGreaterThan(easy.difficultyIndex);
    expect(easy.status).toBe("SHADOW");
  });

  it("keeps completion probability separate from confidence", () => {
    const result = expectedCompletionGse({
      airYards: 8,
      pressureProxy: 0.2,
      sampleSize: 25,
      sourcePolicy: [sourcePolicy],
      yardsToGo: 6,
    });

    expect(result.confidenceMeaning).toBe("EVIDENCE_QUALITY_NOT_COMPLETION_PROBABILITY");
    expect(result.confidenceScore).not.toBeCloseTo(result.probability * 100, 2);
    expect(Object.prototype.hasOwnProperty.call(result.drivers[0], "weight")).toBe(false);
  });
});
