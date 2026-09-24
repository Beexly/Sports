// Tests for decision/2104-08236v1-totals-abstention-sigma.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  softplus,
  gaussianNll,
  abstentionNllLoss,
  kappaFromSigma,
  pidAbstentionStep,
  totalsPublishRule,
  recalibrateTau,
  sigmaCalibration,
  totalsAbstentionGatePasses,
} from "./2104-08236v1-totals-abstention-sigma.js";

describe("softplus / gaussianNll (2104.08236v1)", () => {
  it("softplus is positive and ~identity for large x", () => {
    expect(softplus(-10)).toBeGreaterThan(0);
    expect(softplus(30)).toBeCloseTo(30, 6);
  });
  it("gaussianNll is minimized at y = mu", () => {
    expect(gaussianNll(48, 48, 3)).toBeLessThan(gaussianNll(55, 48, 3));
  });
});

describe("abstentionNllLoss", () => {
  it("down-weights the likelihood when sigma >> kappa", () => {
    const kappa = 2;
    const confident = abstentionNllLoss(48, 48, 1.0, kappa, 1.0); // q = 1
    const uncertain = abstentionNllLoss(60, 48, 10.0, kappa, 1.0); // q = (2/10)^2 = 0.04
    // Uncertain-but-wrong is penalized far less per unit of likelihood than confident-but-wrong.
    const confidentWrong = abstentionNllLoss(60, 48, 1.0, kappa, 1.0);
    expect(uncertain).toBeLessThan(confidentWrong);
    expect(confident).toBeLessThan(uncertain); // confident-and-right is still best
  });
  it("regularizes against degenerate always-abstain", () => {
    const huge = abstentionNllLoss(48, 48, 1e6, 2, 1.0);
    expect(huge).toBeGreaterThan(0); // -alpha*log q -> +inf as q -> 0
    expect(Number.isFinite(huge)).toBe(true);
  });
});

describe("kappaFromSigma / recalibrateTau", () => {
  it("kappa is the P90 of validation sigma", () => {
    const sigmas = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(kappaFromSigma(sigmas)).toBe(10); // floor(0.9*10)=9 -> sorted[9]
    expect(kappaFromSigma([])).toBe(1);
  });
  it("tau publishes the target fraction", () => {
    const sigmas = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const tau = recalibrateTau(sigmas, 0.7);
    const published = sigmas.filter((s) => totalsPublishRule(s, tau)).length;
    expect(published).toBe(8); // floor(0.7*10)=7 -> sorted[7]=8 -> <= 8 publishes 8
  });
});

describe("pidAbstentionStep", () => {
  it("raises alpha when abstaining too little, lowers it when abstaining too much", () => {
    const s0 = { integral: 0, prevError: 0 };
    const up = pidAbstentionStep(s0, 0.1, 0.3, 1.0);
    expect(up.alpha).toBeGreaterThan(1.0);
    const down = pidAbstentionStep(s0, 0.5, 0.3, 1.0);
    expect(down.alpha).toBeLessThan(1.0);
  });
});

describe("sigmaCalibration", () => {
  it("recovers ~N(0,1) z-scores on well-specified synthetic data", () => {
    const ys: number[] = [];
    const mus: number[] = [];
    const sigmas: number[] = [];
    let seed = 7;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let i = 0; i < 2000; i++) {
      const u1 = Math.max(rand(), 1e-12);
      const u2 = rand();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      mus.push(45);
      sigmas.push(7);
      ys.push(45 + 7 * z);
    }
    const { mean, std } = sigmaCalibration(ys, mus, sigmas);
    expect(Math.abs(mean)).toBeLessThan(0.2);
    expect(Math.abs(std - 1)).toBeLessThan(0.2);
  });
});

describe("totalsAbstentionGatePasses", () => {
  it("encodes the MAE + sigma-calibration gate", () => {
    expect(totalsAbstentionGatePasses(10, 9.4, 0.0, 1.0)).toBe(true); // 0.6 pt gap
    expect(totalsAbstentionGatePasses(10, 9.8, 0.0, 1.0)).toBe(false); // 0.2 pt gap
    expect(totalsAbstentionGatePasses(10, 9.4, 0.5, 1.0)).toBe(false); // miscalibrated mean
    expect(totalsAbstentionGatePasses(10, 9.4, 0.0, 1.5)).toBe(false); // miscalibrated std
    expect(totalsAbstentionGatePasses(20, 19.6, 0.0, 1.0)).toBe(false); // 0.4pt gap, 2% relative
    expect(totalsAbstentionGatePasses(20, 19.3, 0.0, 1.0)).toBe(true); // 0.7pt gap clears absolute
  });
});
