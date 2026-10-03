/**
 * Vitest suite for arXiv:2606.16356v1 (Simulation-Augmented Multi-Step Split Conformal Prediction for Aggregated Forecasts).
 * Gate: ADOPT SA-MSCP for season-total intervals if, on the 2023–2024 holdout, empirical coverage of realised win totals is ≥80% at nominal 90% AND mean interval width is no more than 1.5x the naive baseline width.
 */
import { describe, it, expect } from "vitest";
import { blockBootstrapPaths, quantile, saMscpInterval, conformalPidUpdate } from "./2606-16356v1-simulationaugmented-multistep-split-conformal-prediction";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
describe("2606-16356v1 simulation-augmented multi-step split conformal", () => {
  it("block bootstrap produces full-length paths", () => {
    const rng = lcg(61);
    const resid = Array.from({ length: 40 }, (_, i) => (i % 5) - 2);
    const paths = blockBootstrapPaths(resid, 4, 50, 10, rng);
    expect(paths.length).toBe(50);
    expect(paths[0]!.length).toBe(10);
    expect(() => blockBootstrapPaths([1, 2], 4, 10, 5, rng)).toThrow();
  });
  it("interval covers the simulated totals symmetrically", () => {
    const rng = lcg(62);
    const resid = Array.from({ length: 40 }, () => (rng() - 0.5) * 4);
    const paths = blockBootstrapPaths(resid, 4, 2000, 8, rng);
    const { lower, upper } = saMscpInterval(100, paths, 0.9);
    expect(lower).toBeLessThan(100);
    expect(upper).toBeGreaterThan(100);
    expect(upper - lower).toBeGreaterThan(0);
    expect(quantile([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5, 10);
  });
  it("PID widens the level after a miss", () => {
    expect(conformalPidUpdate(0.9, true)).toBeGreaterThan(0.9);
    expect(conformalPidUpdate(0.9, false)).toBeLessThan(0.9);
  });
});
