import { describe, it, expect } from "vitest";
import {
  softplus,
  betaNllLoss,
  haloInterval,
  scaleErrorRankCorrelation,
  passesMonotoneCoverageGate,
} from "@/lib/calibration/halo-heteroskedastic";

// ============================================================
// arXiv 2609.10589 — Halo heteroscedastic heads. Additive only.
// ============================================================

describe("Halo — 2609.10589", () => {
  it("softplus is positive and ~identity for large x", () => {
    expect(softplus(-100)).toBeGreaterThan(0);
    expect(softplus(30)).toBeCloseTo(30, 10);
    expect(softplus(0)).toBeCloseTo(Math.log(2), 10);
  });

  it("betaNllLoss at beta=0 is the Gaussian NLL", () => {
    const s = 2;
    const nll = 0.5 * Math.log(s * s) + 9 / (2 * s * s);
    expect(betaNllLoss(3, 0, s, 0)).toBeCloseTo(nll, 10);
  });

  it("betaNllLoss downweights by sigma^{2 beta}", () => {
    const a = betaNllLoss(3, 0, 2, 0.5);
    const b = betaNllLoss(3, 0, 2, 0);
    expect(a).toBeCloseTo(2 * b, 10); // sigma^{1} = 2
  });

  it("haloInterval widens with the scale head", () => {
    const narrow = haloInterval(45, -2, 0.1);
    const wide = haloInterval(45, 2, 0.1);
    expect(wide.hi - wide.lo).toBeGreaterThan(narrow.hi - narrow.lo);
    expect(narrow.sigma).toBeGreaterThan(0);
    expect((narrow.lo + narrow.hi) / 2).toBeCloseTo(45, 10);
  });

  it("scaleErrorRankCorrelation detects monotone scale-error", () => {
    const errors = [0.1, 0.2, 0.5, 1.0, 2.0];
    const scales = [0.1, 0.2, 0.5, 1.0, 2.0];
    expect(scaleErrorRankCorrelation(errors, scales)).toBeCloseTo(1, 10);
  });

  it("scaleErrorRankCorrelation is ~0 for uninformative scales", () => {
    const errors = [0.1, 2.0, 0.2, 1.0, 0.5];
    const scales = [1, 1, 1, 1, 1];
    expect(scaleErrorRankCorrelation(errors, scales)).toBe(0);
  });

  it("passesMonotoneCoverageGate applies the 0.3 threshold", () => {
    const errors = [0.1, 0.2, 0.5, 1.0, 2.0];
    const scales = [0.1, 0.2, 0.5, 1.0, 2.0];
    expect(passesMonotoneCoverageGate(errors, scales)).toBe(true);
    expect(passesMonotoneCoverageGate(errors, [1, 1, 1, 1, 1])).toBe(false);
    expect(passesMonotoneCoverageGate([1], [1])).toBe(false);
  });
});
