/**
 * Tests for ./2103-14430-weather (arXiv:2103.14430, lane=weather).
 *
 * ACCEPTANCE GATE: ADOPT the distribution-head pattern if it beats the Gaussian baseline on 2024 CRPS with no
 * degradation in calibration (PIT histogram uniformity); REJECT if the binning produces worse CRPS
 * than the simple Gaussian or if the stacking layer overfits the single stack-training season (check
 * 2022-as-stack-train sensitivity).
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2103-14430-weather";

describe("weather adjustment factors (arXiv:2103.14430)", () => {
  it("discounts passing for wind", () => {
    expect(mod.windPassingFactor(0)).toBeCloseTo(1, 10);
    expect(mod.windPassingFactor(25)).toBeCloseTo(0.8, 10);
    expect(mod.windPassingFactor(1000)).toBeCloseTo(0.5, 10);
    expect(mod.windPassingFactor(-1)).toBeNull();
  });

  it("penalizes temperature extremes", () => {
    expect(mod.tempFactor(70)).toBeCloseTo(1, 10);
    expect(mod.tempFactor(32)).toBeCloseTo(1, 10);
    expect(mod.tempFactor(0)).toBeCloseTo(1 - 32 * 0.002, 10);
    expect(mod.tempFactor(100)).toBeCloseTo(1 - 10 * 0.002, 10);
  });

  it("discounts for precipitation", () => {
    expect(mod.precipFactor(0)).toBeCloseTo(1, 10);
    expect(mod.precipFactor(1)).toBeCloseTo(0.95, 10);
    expect(mod.precipFactor(5)).toBeCloseTo(0.9, 10);
    expect(mod.precipFactor(-1)).toBeNull();
  });

  it("combines multiplicatively", () => {
    expect(mod.combinedWeatherFactor({ windMph: 0, tempF: 70, precipInches: 0 })).toBeCloseTo(1, 10);
    const w = mod.combinedWeatherFactor({ windMph: 25, tempF: 70, precipInches: 0 })!;
    expect(w).toBeCloseTo(0.8, 10);
  });
});
