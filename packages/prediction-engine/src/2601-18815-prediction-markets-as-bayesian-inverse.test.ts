/**
 * Vitest suite for arXiv:2601.18815 (Prediction Markets as Bayesian Inverse Problems: Uncertainty Quantification, Identifiability, and Information Gain from Price–Volume Histories under Latent Types).
 * Gate: ADAPT confirmed if IG-weighted CLV beats unweighted CLV on 2025 NFL holdout by >=2% log-loss with the identifiability flag firing on 5-30% of games.
 */
import { describe, it, expect } from "vitest";
import { infoGain, identifiabilityFlag, igWeightedClv } from "./2601-18815-prediction-markets-as-bayesian-inverse";

describe("2601-18815 IG-weighted CLV", () => {
  it("information gain is zero for no move, positive for real moves", () => {
    expect(infoGain(0.5, 0.5)).toBeCloseTo(0, 12);
    expect(infoGain(0.5, 0.6)).toBeGreaterThan(infoGain(0.5, 0.55));
  });
  it("flags low-information games as non-identifiable", () => {
    const flat = [{ gameId: "g1", pBefore: 0.5, pAfter: 0.5001, clv: 0.02 }];
    expect(identifiabilityFlag(flat, 1e-6)).toBe(true);
    const sharp = [{ gameId: "g2", pBefore: 0.5, pAfter: 0.65, clv: 0.02 }];
    expect(identifiabilityFlag(sharp, 1e-6)).toBe(false);
  });
  it("excludes flagged games from the weighted CLV", () => {
    const moves = [
      { gameId: "g1", pBefore: 0.5, pAfter: 0.5001, clv: 0.10 },
      { gameId: "g2", pBefore: 0.5, pAfter: 0.65, clv: 0.02 },
    ];
    const { clv, flagged } = igWeightedClv(moves, 1e-6);
    expect(flagged).toBe(1);
    expect(clv).toBeCloseTo(0.02, 10);
  });
});
