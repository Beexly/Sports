/**
 * Vitest suite for arXiv:2409.01874 (Partial Membership Models for Soft Clustering of Multivariate Football Player Performance Data).
 * Gate: Gate (ADAPT): WAICm 99/100 correct-K recovery; PM yields true archetypes where MM maxes at 0.686 membership. Improvement success = WAICm improvement ≥ 2% on the same Serie A data and archetype stability (same 4 archetypes) with runtime ≤ 12 h.
 */
import { describe, it, expect } from "vitest";
import { projectToSimplex, negBinomLogPmf, randomWalkPriorLogDens, archetypeStability } from "./2409-01874-partial-membership-models-for-soft";

describe("2409-01874 partial-membership soft clustering", () => {
  it("projects onto the simplex", () => {
    const m = projectToSimplex([0.5, 0.3, 0.4]);
    expect(m.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(Math.min(...m)).toBeGreaterThanOrEqual(0);
    expect(() => projectToSimplex([])).toThrow();
  });
  it("NB log-pmf peaks near the mean and penalizes overdispersion", () => {
    const at5 = negBinomLogPmf(5, 5, 2);
    expect(negBinomLogPmf(0, 5, 2)).toBeLessThan(at5);
    expect(negBinomLogPmf(20, 5, 2)).toBeLessThan(at5);
    expect(() => negBinomLogPmf(-1, 5, 2)).toThrow();
  });
  it("random-walk prior prefers smooth membership paths", () => {
    const smooth = [[0.6, 0.4], [0.61, 0.39], [0.6, 0.4]];
    const jumpy = [[0.6, 0.4], [0.1, 0.9], [0.6, 0.4]];
    expect(randomWalkPriorLogDens(smooth, 0.01)).toBeGreaterThan(randomWalkPriorLogDens(jumpy, 0.01));
    expect(archetypeStability(smooth)).toBeCloseTo(1, 10);
    expect(() => randomWalkPriorLogDens(smooth, 0)).toThrow();
  });
});
