import { describe, expect, it } from "vitest";
import { fitTrajectory, predictForm, mse, formDecompGatePasses, GSE_FORM_DECOMP_ENABLED } from "./form-decomposition-2405.js";

const weeks = [1, 2, 3, 4, 5, 6].map((week) => ({
  team: "KC", season: 2024, week, value: 0.1 * week, opponentAdjustment: 0,
}));

describe("form decomposition", () => {
  it("recovers the level and slope of a linear trend", () => {
    const d = fitTrajectory(weeks);
    expect(d.level).toBeCloseTo(0.35, 6);
    expect(d.slope).toBeGreaterThan(0);
  });
  it("predicts on the fitted line", () => {
    const d = fitTrajectory(weeks);
    expect(predictForm(d, 18, 0)).toBeCloseTo(0.1 * 18, 4);
  });
  it("handles empty and single-week input", () => {
    expect(fitTrajectory([]).level).toBe(0);
    expect(fitTrajectory(weeks.slice(0, 1))).toMatchObject({ slope: 0 });
  });
  it("gate needs >=5% MSE reduction", () => {
    expect(formDecompGatePasses(0.9, 1.0)).toBe(true);
    expect(formDecompGatePasses(0.96, 1.0)).toBe(false);
    expect(mse([], [])).toBe(Infinity);
  });
  it("stays off until the MSE gate clears", () => {
    expect(GSE_FORM_DECOMP_ENABLED).toBe(false);
  });
});

