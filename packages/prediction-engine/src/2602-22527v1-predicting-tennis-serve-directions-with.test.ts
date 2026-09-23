/**
 * Vitest suite for arXiv:2602.22527v1 (Predicting Tennis Serve Directions with Machine Learning).
 * Gate: ADAPT if grouped-chronological log-loss beats the per-player empirical-frequency baseline by >=5% AND calibration slope on held-out matches is within [0.85, 1.15]; otherwise REJECT the ML layer and use empirical direction frequencies.
 */
import { describe, it, expect } from "vitest";
import { fitBetaBins, applyBetaBins, auc, discriminationOk } from "./2602-22527v1-predicting-tennis-serve-directions-with";

describe("2602-22527v1 BPRP online recalibration", () => {
  const pairs = [
    { score: 0.1, y: 0 as const }, { score: 0.2, y: 0 as const },
    { score: 0.8, y: 1 as const }, { score: 0.9, y: 1 as const },
  ];
  it("calibrates bins toward empirical rates with the beta prior", () => {
    const bins = fitBetaBins(pairs, [0, 0.5, 1], 1, 1);
    expect(bins[0]!.p).toBeCloseTo(1 / 4, 10); // (0+1)/(2+2)
    expect(bins[1]!.p).toBeCloseTo(3 / 4, 10);
    expect(applyBetaBins(bins, 0.3)).toBeCloseTo(1 / 4, 10);
    expect(() => fitBetaBins(pairs, [0, 1], 0, 1)).toThrow();
  });
  it("AUC safety check gates calibration", () => {
    expect(discriminationOk(pairs)).toBe(true);
    const noise = [
      { score: 0.5, y: 0 as const }, { score: 0.5, y: 1 as const },
    ];
    expect(discriminationOk(noise)).toBe(false);
    expect(() => auc([{ score: 0.5, y: 1 as const }])).toThrow();
  });
});
