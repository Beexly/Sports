import { describe, expect, it } from "vitest";

import {
  ENABLED,
  RESEARCH_ONLY,
  accumulatorEdge,
  singlesVsAccumulator,
  stochasticDiffusionSearch,
} from "@/lib/calibration/2004-08607-accumulator-diffusion-search";

describe("accumulator diffusion search (research only)", () => {
  it("is permanently research-only, never product", () => {
    expect(ENABLED).toBe(false);
    expect(RESEARCH_ONLY).toBe(true);
  });

  it("accumulatorEdge compounds probability and odds", () => {
    const legs = [
      { id: "a", p: 0.6, decimalOdds: 1.8 },
      { id: "b", p: 0.55, decimalOdds: 2.0 },
    ];
    const e = accumulatorEdge(legs);
    expect(e.pHit).toBeCloseTo(0.33, 10);
    expect(e.payout).toBeCloseTo(3.6, 10);
    expect(e.ev).toBeCloseTo(0.33 * 3.6 - 1, 10);
    expect(Number.isFinite(e.kellyLogGrowth)).toBe(true);
  });

  it("SDS finds a valid multi-leg hypothesis deterministically", () => {
    const legs = Array.from({ length: 12 }, (_, i) => ({
      id: "leg" + i,
      p: 0.5 + (i % 4) * 0.05,
      decimalOdds: 1.9 + (i % 3) * 0.1,
    }));
    const r1 = stochasticDiffusionSearch(legs, 40, 25, 7);
    const r2 = stochasticDiffusionSearch(legs, 40, 25, 7);
    expect(r1.best.legs.length).toBeGreaterThanOrEqual(2);
    expect(r1.fitness).toBe(r2.fitness);
    expect(r1.best.legs).toEqual(r2.best.legs);
  });

  it("replicates the negative-control pattern: singles beat accumulators risk-adjusted", () => {
    // Fair-ish legs with a small edge: accumulator headline EV can look fine,
    // but risk-adjusted (Sharpe) and drawdown proxy are far worse.
    const legs = [
      { id: "a", p: 0.55, decimalOdds: 1.95 },
      { id: "b", p: 0.55, decimalOdds: 1.95 },
      { id: "c", p: 0.55, decimalOdds: 1.95 },
      { id: "d", p: 0.55, decimalOdds: 1.95 },
    ];
    const cmp = singlesVsAccumulator(legs);
    expect(cmp.singlesSharpe).toBeGreaterThan(cmp.accumulatorSharpe);
    expect(cmp.accumulatorMaxDrawdownProxy).toBeGreaterThan(0.5);
  });
});
