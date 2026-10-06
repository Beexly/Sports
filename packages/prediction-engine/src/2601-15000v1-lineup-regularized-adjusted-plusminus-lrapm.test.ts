/**
 * Vitest suite for arXiv:2601.15000v1 (Lineup Regularized Adjusted Plus-Minus (L-RAPM): Basketball Lineup Ratings with Informed Priors).
 * Gate: Adopt if on 2021-2024 G-RAPM beats raw group EPA/play on out-of-sample RMSE for sparse groups (<50 plays) in at least 3 of 4 seasons with >=3% relative improvement in the sparse bin and no bin underperforming by >1%.
 */
import { describe, it, expect } from "vitest";
import { groupEpaPerPlay, memberPrior, shrinkEstimate, grapm, rmse, relImprovement } from "./2601-15000v1-lineup-regularized-adjusted-plusminus-lrapm";

describe("2601-15000v1 G-RAPM group ratings", () => {
  it("shrinks sparse groups toward the member prior", () => {
    const sparse = grapm([0.9], [0.1, 0.12, 0.08], 20);
    expect(sparse).toBeLessThan(0.9);
    expect(sparse).toBeGreaterThan(0.1);
    const dense = grapm(new Array(200).fill(0.5), [0.1], 20);
    expect(dense).toBeCloseTo(0.5, 1);
    expect(() => shrinkEstimate(1, 0, 0, 0)).toThrow();
    expect(() => groupEpaPerPlay([])).toThrow();
  });
  it("RMSE and relative improvement", () => {
    expect(rmse([1, 2, 3], [1, 2, 3])).toBe(0);
    expect(relImprovement(1.0, 0.9)).toBeCloseTo(0.1, 10);
    expect(() => rmse([1], [1, 2])).toThrow();
    expect(() => relImprovement(0, 1)).toThrow();
  });
});
