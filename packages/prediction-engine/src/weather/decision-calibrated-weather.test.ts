
import { describe, expect, it } from "vitest";
import { decisionValue, rmse, selectWeatherSource, thresholdDecision } from "./decision-calibrated-weather";

describe("decision-calibrated-weather", () => {
  const actuals = [10, 25, 30, 5, 22];
  const good = { name: "good", forecasts: [9, 26, 29, 6, 21], actuals };
  const bad = { name: "bad", forecasts: [30, 5, 10, 28, 8], actuals };
  it("decisionValue rewards acting correctly at the threshold", () => {
    expect(decisionValue(good, 20)).toBeGreaterThan(decisionValue(bad, 20));
  });
  it("selectWeatherSource picks the decision-best feed", () => {
    expect(selectWeatherSource([bad, good], 20).name).toBe("good");
  });
  it("rmse agrees on the better feed here", () => {
    expect(rmse(good)).toBeLessThan(rmse(bad));
  });
  it("thresholdDecision is a step function", () => {
    expect(thresholdDecision(20, 20)).toBe(1);
    expect(thresholdDecision(19.9, 20)).toBe(0);
  });
  it("edge cases throw", () => {
    expect(() => decisionValue({ name: "x", forecasts: [], actuals: [] }, 20)).toThrow();
    expect(() => selectWeatherSource([], 20)).toThrow();
  });
});
