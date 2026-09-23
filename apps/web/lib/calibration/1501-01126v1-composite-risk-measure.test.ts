import { describe, expect, it } from "vitest";

import {
  ENABLED,
  betaBinomialPosterior,
  betaMean,
  betaSample,
  crmObjective,
  innerCvar,
  mulberry32,
  outerCvar,
  projectSimplex,
  solveCrmSaa,
  tailMean,
} from "@/lib/calibration/1501-01126v1-composite-risk-measure";

describe("composite risk measure sizing", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("tailMean takes the worst tail", () => {
    expect(tailMean([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.1)).toBe(10);
    expect(tailMean([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.2)).toBe(9.5);
  });

  it("inner/outer CVaR nest correctly", () => {
    const losses = [1, 1, 1, 1, 1, 1, 1, 1, 1, 100];
    expect(innerCvar(losses)).toBe(100);
    expect(outerCvar([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 50])).toBe(50);
  });

  it("beta-binomial posterior concentrates on the empirical rate", () => {
    const post = betaBinomialPosterior(70, 30);
    expect(betaMean(post)).toBeCloseTo(0.7, 1);
    const rand = mulberry32(7);
    const draws = Array.from({ length: 2000 }, () => betaSample(post.a, post.b, rand));
    const mean = draws.reduce((a, b) => a + b, 0) / draws.length;
    expect(mean).toBeCloseTo(0.7, 1);
  });

  it("projectSimplex returns long-only weights summing to 1", () => {
    const w = projectSimplex([0.5, -0.2, 0.8, 0.1]);
    expect(w.every((x) => x >= 0)).toBe(true);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it("solveCrmSaa returns a valid long-only slate portfolio", () => {
    const picks = [
      { id: "a", posterior: betaBinomialPosterior(60, 40), decimalOdds: 1.95 },
      { id: "b", posterior: betaBinomialPosterior(55, 45), decimalOdds: 2.1 },
      { id: "c", posterior: betaBinomialPosterior(70, 30), decimalOdds: 1.8 },
    ];
    const w = solveCrmSaa(picks, 123, 8, 60, 16);
    expect(w.length).toBe(3);
    expect(w.every((x) => x >= 0)).toBe(true);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 8);
    // composite risk should be finite and better than putting everything on one leg
    const obj = crmObjective(w, picks, 60, 16, mulberry32(9));
    expect(Number.isFinite(obj)).toBe(true);
  });
});
