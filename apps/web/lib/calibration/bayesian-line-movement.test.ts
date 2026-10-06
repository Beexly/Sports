import { describe, it, expect } from "vitest";
import {
  normalPosterior,
  shrinkageEstimate,
  signedLineMovement,
  expectedPnlAdjustment,
  predictiveSd,
} from "@/lib/calibration/bayesian-line-movement";

// ============================================================
// arXiv 2506.13687 — Bayesian line movement. Additive only.
// ============================================================

describe("Bayesian line movement — 2506.13687", () => {
  it("normalPosterior blends prior and likelihood by precision", () => {
    const post = normalPosterior(0, 1, 2, 1, 1);
    // Equal precision: posterior mean = 1, var = 0.5.
    expect(post.mean).toBeCloseTo(1, 10);
    expect(post.variance).toBeCloseTo(0.5, 10);
  });

  it("normalPosterior concentrates with n", () => {
    const small = normalPosterior(0, 1, 2, 1, 1);
    const big = normalPosterior(0, 1, 2, 1, 1000);
    expect(big.variance).toBeLessThan(small.variance);
    expect(big.mean).toBeCloseTo(2, 2);
  });

  it("normalPosterior returns the prior with no data", () => {
    const post = normalPosterior(3, 2, 0, 1, 0);
    expect(post.mean).toBe(3);
    expect(post.variance).toBe(2);
  });

  it("shrinkageEstimate pulls thin strata to the global mean", () => {
    const thin = shrinkageEstimate(10, 0, 1, 1, 4);
    const thick = shrinkageEstimate(10, 0, 100000, 1, 4);
    expect(Math.abs(thin)).toBeLessThan(Math.abs(thick));
    expect(thick).toBeCloseTo(10, 2);
    expect(shrinkageEstimate(10, 0, 0, 1, 4)).toBe(0);
  });

  it("signedLineMovement is open minus current", () => {
    expect(signedLineMovement(-3, -1.5)).toBeCloseTo(-1.5, 10);
    expect(signedLineMovement(-3, -4)).toBeCloseTo(1, 10);
  });

  it("expectedPnlAdjustment is mu + beta * movement", () => {
    expect(expectedPnlAdjustment({ mu: 0.1, beta: 0.5 }, 2)).toBeCloseTo(1.1, 10);
  });

  it("predictiveSd combines posterior and residual uncertainty", () => {
    const sd = predictiveSd({ muVar: 0.01, betaVar: 0.04 }, 2, 1);
    expect(sd).toBeCloseTo(Math.sqrt(0.01 + 4 * 0.04 + 1), 10);
  });
});
