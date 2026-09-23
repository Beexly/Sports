/**
 * Vitest suite for arXiv:2608.28116v1 (Generalized Gibbs Ensemble Weighting).
 * Gate: ADOPT the online Gibbs weighter if it beats plain exponential weighting by >=0.003 log-loss on 2025 walk-forward (DM p<0.05) and beats or ties the batch Gibbs stacker; REJECT entirely if it cannot beat plain exponential weighting; stability veto: UCB-selected (eta,lambda) changing >50% of weeks requires a smoothing fix before shipping.
 */
import { describe, it, expect } from "vitest";
import { egUpdate, normalizeLosses, localUcbPick } from "./2608-28116v1-generalized-gibbs-ensemble-weighting";

describe("2608-28116v1 online Gibbs weighter", () => {
  it("exponentiated gradient shifts weight to low-loss components", () => {
    const w = egUpdate([0.5, 0.5], [0.1, 0.9], 2);
    expect(w[0]).toBeGreaterThan(0.8);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(() => egUpdate([0.5], [0.1, 0.2], 1)).toThrow();
  });
  it("normalizes losses to [0,1]", () => {
    expect(normalizeLosses([2, 4, 6])).toEqual([0, 0.5, 1]);
    expect(normalizeLosses([3, 3])).toEqual([0.5, 0.5]);
  });
  it("Local-UCB explores untried configs then exploits", () => {
    expect(localUcbPick([0.5, 0.9], [0, 10], 10)).toBe(0); // untried -> Infinity
    expect(localUcbPick([0.5, 0.9], [10, 10], 20)).toBe(1);
    expect(() => localUcbPick([], [], 0)).toThrow();
  });
});
