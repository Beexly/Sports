import { describe, expect, it } from "vitest";
import { knownAnswerSeries, recoverPlantedSlope } from "./known-answer-series.js";

describe("known-answer series", () => {
  it("recovers the planted slope and rejects a short series", () => {
    const noise = [0.1, -0.2, 0.05, 0.0];
    const series = knownAnswerSeries(4, 2, 0.4, noise);
    expect(series.observed[3]).toBeCloseTo(2 + 0.4 * 3 + 0);
    expect(recoverPlantedSlope(series.observed, 2, noise)).toBeCloseTo(0.4);
    expect(() => knownAnswerSeries(1, 0, 0, [0])).toThrow(/at least 2/);
  });
});
