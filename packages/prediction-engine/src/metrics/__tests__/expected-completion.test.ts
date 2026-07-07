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

  it("emits each driver's direction consistent with the sign of its contribution", () => {
    const shallow = expectedCompletionGse({
      airYards: 5,
      pressureProxy: 0.4,
      sampleSize: 400,
      sourcePolicy: [sourcePolicy],
      weatherPenalty: 0.3,
      yardsToGo: 3,
    });

    for (const driver of shallow.drivers) {
      if (driver.contribution > 0) {
        expect(driver.direction).toBe("UP");
      } else if (driver.contribution < 0) {
        expect(driver.direction).toBe("DOWN");
      }
    }

    // A shallow pass raises the air-yard and yards-to-go bases, so those drivers
    // must report a positive contribution with an UP direction (the bug labeled
    // them DOWN despite the positive contribution).
    const shallowAir = shallow.drivers.find((driver) => driver.name === "air_yards_basis");
    const shallowYards = shallow.drivers.find((driver) => driver.name === "yards_to_go_basis");
    expect(shallowAir?.contribution).toBeGreaterThan(0);
    expect(shallowAir?.direction).toBe("UP");
    expect(shallowYards?.contribution).toBeGreaterThan(0);
    expect(shallowYards?.direction).toBe("UP");

    // A deep pass lowers completion expectation, so the air-yard basis driver
    // must report a negative contribution with a DOWN direction.
    const deep = expectedCompletionGse({
      airYards: 40,
      sampleSize: 400,
      sourcePolicy: [sourcePolicy],
      yardsToGo: 15,
    });
    const deepAir = deep.drivers.find((driver) => driver.name === "air_yards_basis");
    expect(deepAir?.contribution).toBeLessThan(0);
    expect(deepAir?.direction).toBe("DOWN");
  });
});
