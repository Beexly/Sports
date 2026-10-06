// Tests for decision/2409-18645v1-mc-dropout-cer.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  mcDropoutStats,
  cerReject,
  fitGammaPerMarket,
  cerSelect,
  aurcc,
  selectedRoi,
  cerGatePasses,
} from "./2409-18645v1-mc-dropout-cer.js";

describe("mcDropoutStats (2409.18645v1)", () => {
  it("computes mean/variance/certainty over stochastic passes", () => {
    const s = mcDropoutStats([0.7, 0.72, 0.68, 0.71, 0.69]);
    expect(s.mean).toBeCloseTo(0.7, 10);
    expect(s.variance).toBeGreaterThan(0);
    expect(s.certainty).toBeLessThan(s.mean);
    const tight = mcDropoutStats([0.7, 0.7, 0.7]);
    expect(tight.certainty).toBeCloseTo(0.7, 10);
  });
  it("diffuse passes score lower certainty than tight ones at the same mean", () => {
    const tight = mcDropoutStats([0.6, 0.62, 0.58]);
    const diffuse = mcDropoutStats([0.9, 0.3, 0.6]);
    expect(tight.certainty).toBeGreaterThan(diffuse.certainty);
  });
});

describe("fitGammaPerMarket / cerSelect", () => {
  it("learns per-market gammas reproducing target coverage", () => {
    const certs = {
      spread: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
      total: [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95],
    };
    const gammas = fitGammaPerMarket(certs, 0.7);
    expect(gammas["spread"]).toBeCloseTo(0.4, 10); // floor(0.3*10)=3 -> 0.4
    expect(gammas["total"]).toBeCloseTo(0.35, 10);
    const picks = Object.entries(certs).flatMap(([market, cs]) =>
      cs.map((c, i) => ({
        id: `${market}-${i}`,
        market,
        passProbs: [c],
        won: i % 2 === 0,
        odds: 2.0,
      })),
    );
    const { selected, rejected } = cerSelect(picks, gammas);
    // ~70% selected per market (gamma is the 30th percentile; reject certainty < gamma).
    expect(selected.length).toBe(14);
    expect(rejected.length).toBe(6);
  });
});

describe("aurcc / selectedRoi", () => {
  it("informative certainty ordering lowers AURCC", () => {
    const picks = [
      { id: "a", market: "spread", passProbs: [0.9], won: true, odds: 2 },
      { id: "b", market: "spread", passProbs: [0.85], won: true, odds: 2 },
      { id: "c", market: "spread", passProbs: [0.4], won: false, odds: 2 },
      { id: "d", market: "spread", passProbs: [0.35], won: false, odds: 2 },
    ];
    const good = aurcc(picks, [0.9, 0.85, 0.4, 0.35]);
    const bad = aurcc(picks, [0.35, 0.4, 0.85, 0.9]);
    expect(good).toBeLessThan(bad);
    expect(selectedRoi([picks[0]!, picks[1]!])).toBeCloseTo(1, 10);
    expect(selectedRoi([])).toBe(0);
  });
});

describe("cerGatePasses", () => {
  it("adopts selection only when metrics AND ROI move", () => {
    expect(cerGatePasses(0.3, 0.4, 0.1, 0.05)).toEqual({ adoptSelection: true, adoptMonitoring: false });
    expect(cerGatePasses(0.3, 0.4, 0.04, 0.05)).toEqual({ adoptSelection: false, adoptMonitoring: true });
    expect(cerGatePasses(0.45, 0.4, 0.1, 0.05)).toEqual({ adoptSelection: false, adoptMonitoring: false });
  });
});
