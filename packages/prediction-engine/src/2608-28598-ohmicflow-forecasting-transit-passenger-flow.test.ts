/**
 * Vitest suite for arXiv:2608.28598 (OhmicFlow: Forecasting transit passenger flow under extreme weather disruptions via Ohm's law).
 * Gate: ADOPT weather-neutral ratings if counterfactual ratings predict next-game margin with >= 0.3 points lower MAE than factual ratings on 2024 holdout (stability win) AND the weather-edge term has the correct sign on >= 60% of extreme-weather games; REJECT if the counterfactual pass just reproduces the no-weather model.
 */
import { describe, it, expect } from "vitest";
import { NEUTRAL_WEATHER, predictMargin, weatherCounterfactual } from "./2608-28598-ohmicflow-forecasting-transit-passenger-flow";

describe("2608-28598 weather counterfactual inference", () => {
  const m = { baseStrength: 3, windLoading: -0.15, tempLoading: -0.02, precipLoading: -1.5, domeLoading: 0.5 };
  it("neutral weather reproduces base strength", () => {
    const r = weatherCounterfactual(m, { ...NEUTRAL_WEATHER });
    expect(r.neutral).toBeCloseTo(3, 10);
    expect(r.weatherEdge).toBeCloseTo(0, 10);
  });
  it("extreme weather creates a signed weather edge", () => {
    const r = weatherCounterfactual(m, { tempF: 20, windMph: 25, precipIn: 0.3, dome: false });
    expect(r.weatherEdge).toBeLessThan(0);
    expect(r.factual).toBeCloseTo(r.neutral + r.weatherEdge, 10);
  });
  it("dome is a positive edge vs neutral outdoor", () => {
    const r = weatherCounterfactual(m, { tempF: 70, windMph: 5, precipIn: 0, dome: true });
    expect(r.weatherEdge).toBeCloseTo(0.5, 10);
  });
});
