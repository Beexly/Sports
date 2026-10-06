import { describe, expect, it } from "vitest";

import {
  ENABLED,
  abstentionLift,
  aleatoricUncertainty,
  epistemicUncertainty,
  evidentialLoss,
  evidentialNLL,
  evidentialRegularizer,
  lgamma,
  trustScore,
} from "@/lib/calibration/1910-02600-evidential-regression-head";

describe("deep evidential regression head", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("lgamma matches known values", () => {
    expect(lgamma(1)).toBeCloseTo(0, 8);
    expect(lgamma(0.5)).toBeCloseTo(0.5 * Math.log(Math.PI), 8);
    expect(lgamma(5)).toBeCloseTo(Math.log(24), 8);
  });

  it("NLL is minimized at the observation and grows with miss", () => {
    const p = { gamma: 24, nu: 5, alpha: 6, beta: 4 };
    const atTruth = evidentialNLL(24, p);
    const offByTen = evidentialNLL(34, p);
    expect(offByTen).toBeGreaterThan(atTruth);
    expect(Number.isFinite(atTruth)).toBe(true);
  });

  it("epistemic uncertainty scales with beta/nu and feeds the trust score", () => {
    const sure = { gamma: 24, nu: 50, alpha: 20, beta: 2 };
    const unsure = { gamma: 24, nu: 0.5, alpha: 3, beta: 8 };
    expect(epistemicUncertainty(unsure)).toBeGreaterThan(epistemicUncertainty(sure));
    expect(aleatoricUncertainty(sure)).toBeCloseTo(2 / 19, 10);
    expect(trustScore(sure)).toBeGreaterThan(trustScore(unsure));
    expect(trustScore(sure)).toBeLessThanOrEqual(1);
  });

  it("lambda scales the regularizer in the combined loss", () => {
    const p = { gamma: 20, nu: 2, alpha: 4, beta: 3 };
    const l0 = evidentialLoss(30, p, 0);
    const l1 = evidentialLoss(30, p, 1);
    expect(l1 - l0).toBeCloseTo(evidentialRegularizer(30, p), 10);
  });

  it("abstention lift rewards uncertainty that predicts misses", () => {
    // High epistemic on the 10 losers, low on the 90 winners: abstaining the
    // top decile removes exactly the losers -> lift of ~11.1pp.
    const epistemic = [...Array(90).fill(0.1), ...Array(10).fill(5)];
    const won = [...Array(90).fill(true), ...Array(10).fill(false)];
    const lift = abstentionLift(epistemic, won);
    expect(lift).toBeGreaterThan(2); // gate: >= 2pp
    expect(lift).toBeCloseTo((1 - 0.9) * 100, 6);
  });
});
