/**
 * Vitest suite for arXiv:2601.07980v1 (Modeling Event Dynamics by Self-Exciting Processes with Random Memory).
 * Gate: ADAPT accepted if hot-state multiplier nu_hat is significantly > 0 (Wald p<0.01) with tau mean 1-6 min, Delta-BIC vs homogeneous Poisson > 10, and simulated cluster-size PMF matches empirical within 95% bands.
 */
import { describe, it, expect } from "vitest";
import { hawkesIntensity, hawkesLogLik, waldZ, deltaBicVsPoisson } from "./2601-07980v1-modeling-event-dynamics-by-selfexciting";

describe("2601-07980v1 self-exciting event process", () => {
  const events = [1, 1.5, 2.2, 8, 8.4, 9.1, 20, 35, 35.8];
  const p = { mu: 0.05, alpha: 1.6, beta: 2.0, nu: 0.3 };
  it("intensity spikes right after events and relaxes", () => {
    const hot = hawkesIntensity(p, 9.2, events);
    const cold = hawkesIntensity(p, 60, events);
    expect(hot).toBeGreaterThan(cold);
    expect(cold).toBeCloseTo(0.05 * 1.3, 6);
  });
  it("log-likelihood prefers clustered fits over the homogeneous Poisson", () => {
    const clustered: number[] = [];
    for (const c of [5, 40, 75, 105]) for (let j = 0; j < 6; j++) clustered.push(c + j * 0.45);
    clustered.push(22, 88);
    const T = 120;
    const llH = hawkesLogLik(p, clustered, T);
    const rate = clustered.length / T;
    const llP = clustered.length * Math.log(rate) - rate * T;
    expect(llH).toBeGreaterThan(llP);
    expect(deltaBicVsPoisson(llH, llP, clustered.length)).toBeGreaterThan(0);
    expect(waldZ(0.4, 0.1)).toBeCloseTo(4, 10);
    expect(() => waldZ(0.4, 0)).toThrow();
  });
});
