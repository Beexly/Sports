/**
 * Vitest suite for arXiv:2602.19520v2 (Decomposing Crowd Wisdom: Domain-Specific Calibration Dynamics in Prediction Markets).
 * Gate: ADOPT if on the 2025 NFL held-out season p* beats global Platt scaling by >=0.003 log-loss AND >=10% relative ECE reduction, with per-cell theta estimates statistically distinguishable from 1 (95% CI excluding 1 in >=3 sport x horizon cells).
 */
import { describe, it, expect } from "vitest";
import { recalibrate, fitCellRecal } from "./2602-19520v2-decomposing-crowd-wisdom-domainspecific-calibration";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
describe("2602-19520v2 per-cell extremizing recalibration", () => {
  it("extremizes or de-extremizes per the fitted slope", () => {
    expect(recalibrate(0.7, { cell: "c", alpha: 0, beta: 1 })).toBeCloseTo(0.7, 10);
    expect(recalibrate(0.7, { cell: "c", alpha: 0, beta: 1.5 })).toBeGreaterThan(0.7);
    expect(recalibrate(0.3, { cell: "c", alpha: 0, beta: 1.5 })).toBeLessThan(0.3);
    expect(() => recalibrate(0, { cell: "c", alpha: 0, beta: 1 })).toThrow();
  });
  it("recovers a known miscalibration slope", () => {
    const rng = lcg(51);
    const probs: number[] = [];
    const outcomes: (0 | 1)[] = [];
    for (let i = 0; i < 800; i++) {
      const p = 0.2 + rng() * 0.6;
      const q = 1 / (1 + Math.exp(-(0.3 + 1.4 * Math.log(p / (1 - p)))));
      probs.push(p);
      outcomes.push(rng() < q ? 1 : 0);
    }
    const { alpha, beta } = fitCellRecal(probs, outcomes);
    expect(beta).toBeGreaterThan(1.1);
    expect(beta).toBeLessThan(1.8);
    expect(Math.abs(alpha - 0.3)).toBeLessThan(0.25);
    expect(() => fitCellRecal([], [])).toThrow();
  });
});
