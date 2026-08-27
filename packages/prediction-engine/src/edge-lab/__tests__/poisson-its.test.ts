import { describe, it, expect } from "vitest";
import { fitPoissonIts, type ItsObservation } from "../poisson-its.js";

/**
 * Build a deterministic (noiseless, no Math.random) synthetic fixture from
 * KNOWN true parameters, so the fit's recovered coefficients can be checked
 * against ground truth rather than only checked for internal consistency.
 * "Noiseless" here means counts are the rounded Poisson MEAN at each row —
 * the only departure from the exact continuous model is integer rounding.
 */
function synthesize(trueBeta: readonly [number, number, number, number], periods: number): ItsObservation[] {
  const [b0, b1, b2, b3] = trueBeta;
  const tCenter = (periods - 1) / 2;
  const obs: ItsObservation[] = [];
  for (let t = 0; t < periods; t++) {
    const post = t >= Math.ceil(periods / 2) ? 1 : 0;
    const exposure = 1000 + 50 * t; // deliberately varying, to exercise the offset term
    const tc = t - tCenter;
    const eta = Math.log(exposure) + b0 + b1 * tc + b2 * post + b3 * tc * post;
    const count = Math.round(Math.exp(eta));
    obs.push({ t, exposure, post: post as 0 | 1, count });
  }
  return obs;
}

describe("fitPoissonIts — synthetic recovery (known true parameters)", () => {
  it("recovers a level-shift-only model closely from noiseless data", () => {
    const trueBeta: [number, number, number, number] = [Math.log(10), 0.05, Math.log(1.3), 0];
    const obs = synthesize(trueBeta, 10);
    const fit = fitPoissonIts(obs);
    expect(fit).not.toBeNull();
    expect(fit!.converged).toBe(true);
    expect(fit!.intercept).toBeCloseTo(trueBeta[0], 1);
    expect(fit!.trend.estimate).toBeCloseTo(trueBeta[1], 2);
    expect(fit!.levelShift.estimate).toBeCloseTo(trueBeta[2], 1);
    expect(fit!.trendChange.estimate).toBeCloseTo(trueBeta[3], 1);
    expect(fit!.levelShiftRateRatio.estimate).toBeCloseTo(1.3, 1);
    // The signal is strong and the sample far from tiny -- the CI should
    // clearly separate from 1.0 (a real, detectable increase).
    expect(fit!.callout).toBe("increase");
    expect(fit!.levelShiftRateRatio.ci95[0]).toBeGreaterThan(1);
  });

  it("recovers a combined level-shift + trend-change model closely", () => {
    const trueBeta: [number, number, number, number] = [Math.log(20), 0.02, Math.log(0.8), 0.03];
    const obs = synthesize(trueBeta, 12);
    const fit = fitPoissonIts(obs);
    expect(fit).not.toBeNull();
    expect(fit!.intercept).toBeCloseTo(trueBeta[0], 1);
    expect(fit!.trend.estimate).toBeCloseTo(trueBeta[1], 1);
    expect(fit!.levelShift.estimate).toBeCloseTo(trueBeta[2], 1);
    expect(fit!.trendChange.estimate).toBeCloseTo(trueBeta[3], 1);
    // A decrease this time (rate ratio 0.8).
    expect(fit!.callout).toBe("decrease");
    expect(fit!.levelShiftRateRatio.ci95[1]).toBeLessThan(1);
  });

  it("reports no_detectable_change — never 'no change' — when the true level shift is exactly zero", () => {
    const trueBeta: [number, number, number, number] = [Math.log(15), 0.01, 0, 0];
    const obs = synthesize(trueBeta, 10);
    const fit = fitPoissonIts(obs);
    expect(fit).not.toBeNull();
    expect(fit!.levelShift.estimate).toBeCloseTo(0, 1);
    expect(fit!.callout).toBe("no_detectable_change");
    // The type itself has no "no_change" value -- this IS the mechanical
    // enforcement of the paper's pitfall (iv). Assert the literal union.
    expect(["increase", "decrease", "no_detectable_change"]).toContain(fit!.callout);
  });
});

describe("fitPoissonIts — degenerate and edge cases", () => {
  it("returns null with fewer than the minimum required observations", () => {
    const obs = synthesize([Math.log(10), 0, Math.log(1.3), 0], 5); // 5 < default minObservations 8
    expect(fitPoissonIts(obs)).toBeNull();
  });

  it("returns null when any exposure is non-positive", () => {
    const obs = synthesize([Math.log(10), 0, Math.log(1.3), 0], 10).map((o, i) =>
      i === 3 ? { ...o, exposure: 0 } : o,
    );
    expect(fitPoissonIts(obs)).toBeNull();
  });

  it("returns null when any count is negative", () => {
    const obs = synthesize([Math.log(10), 0, Math.log(1.3), 0], 10).map((o, i) =>
      i === 3 ? { ...o, count: -1 } : o,
    );
    expect(fitPoissonIts(obs)).toBeNull();
  });

  it("returns null when the design can't identify all four parameters (post never varies)", () => {
    const obs: ItsObservation[] = Array.from({ length: 10 }, (_, t) => ({
      t,
      exposure: 1000,
      post: 0 as const, // constant -- levelShift and trendChange are unidentifiable
      count: 100 + t,
    }));
    expect(fitPoissonIts(obs)).toBeNull();
  });

  it("is deterministic across repeated fits on identical input", () => {
    const obs = synthesize([Math.log(12), 0.03, Math.log(1.1), -0.01], 14);
    const a = fitPoissonIts(obs);
    const b = fitPoissonIts(obs);
    expect(a).toEqual(b);
  });
});
