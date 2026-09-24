/**
 * Vitest suite for arXiv:2607.18009v1 (Bayesian Conway-Maxwell-Poisson model with spike-and-slab priors for dispersed count data with application to football scores).
 * Gate: ADOPT into the GSE totals pipeline if CMP-SAS beats the Poisson-Maher baseline on out-of-sample IGN for totals in >=2 of 3 seasons AND identifies >=3 teams/season with P(Z_i=1)>0.5 (dispersion heterogeneity exists in NFL scoring); REJECT if no team crosses the 0.5 threshold in any season or IGN gains vanish.
 */
import { describe, it, expect } from "vitest";
import { normalizePosterior, posteriorPredictive, honestUncertaintyGate, PosteriorEquation } from "./2607-18009v1-bayesian-conwaymaxwellpoisson-model-with-spikeandslab";

describe("2607-18009v1 P-SR probabilistic symbolic regression", () => {
  const eqs: PosteriorEquation[] = [
    { text: "0.4*epa", prob: 2, coefIntervals: [[0.3, 0.5]] },
    { text: "0.1*epa+0.2*wp", prob: 1, coefIntervals: [[0.05, 0.15], [0.1, 0.3]] },
  ];
  it("normalizes the structure posterior", () => {
    const n = normalizePosterior(eqs);
    expect(n[0]!.prob).toBeCloseTo(2 / 3, 10);
    expect(() => normalizePosterior([])).toThrow();
  });
  it("mixture predictive mean and variance", () => {
    const { mean, variance } = posteriorPredictive(eqs, [0.4, 0.3]);
    expect(mean).toBeCloseTo((2 * 0.4 + 0.3) / 3, 10);
    expect(variance).toBeGreaterThan(0);
    expect(() => posteriorPredictive(eqs, [0.4])).toThrow();
  });
  it("honest-uncertainty gate requires bounded intervals", () => {
    expect(honestUncertaintyGate(eqs)).toBe(true);
    const bad = [{ text: "x", prob: 1, coefIntervals: [[1, 0] as [number, number]] }];
    expect(honestUncertaintyGate(bad)).toBe(false);
  });
});
