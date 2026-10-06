/**
 * Vitest suite for arXiv:2608.09824 (Longitudinal Bayesian networks for assessing team performance in the National Basketball Association).
 * Gate: ADOPT the dynamic-LBN-with-AR-usage pattern and the participation submodel if the AR variant beats static on 2025 held-out log-likelihood AND predictive intervals calibrate; REJECT the hidden-Markov variant unless it beats the AR variant on LOO; REJECT literal replication of the 1M-iteration MCMC — use modern scalable inference.
 */
import { describe, it, expect } from "vitest";
import { forecastUsage, participationProb, fantasyPointMean } from "./2608-09824-longitudinal-bayesian-networks-for-assessing";

describe("2608-09824 dynamic longitudinal Bayesian network", () => {
  const p = { phi: 0.7, sigmaU: 1, sigmaPlayer: 0.5, partIntercept: 2.5, partInjuryLoading: -4 };
  it("AR(1) usage mean-reverts with persistence", () => {
    expect(forecastUsage(p, 10, 1)).toBeCloseTo(8, 10);
    expect(forecastUsage(p, 0, 0)).toBe(0);
  });
  it("participation drops with injury news", () => {
    expect(participationProb(p, 0)).toBeGreaterThan(0.9);
    expect(participationProb(p, 1)).toBeLessThan(0.5);
    expect(() => participationProb(p, 2)).toThrow();
  });
  it("fantasy mean gates usage by participation", () => {
    const healthy = fantasyPointMean(p, 10, 1, 2, 0);
    const hurt = fantasyPointMean(p, 10, 1, 2, 1);
    expect(healthy).toBeGreaterThan(hurt);
    expect(healthy).toBeCloseTo(participationProb(p, 0) * 8 * 2, 10);
  });
});
