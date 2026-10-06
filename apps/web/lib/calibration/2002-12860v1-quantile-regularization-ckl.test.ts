import { describe, expect, it } from "vitest";

import {
  ENABLED,
  cklBar,
  gaussianPIT,
  l2QuantileCalibrationError,
  regularizedLoss,
  relativeQceReduction,
} from "@/lib/calibration/2002-12860v1-quantile-regularization-ckl";

describe("CKL quantile regularization", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("calibrated Gaussian PITs have near-zero CKL", () => {
    let st = 5;
    const rnd = () => {
      st = (st * 1103515245 + 12345) & 0x7fffffff;
      return st / 0x7fffffff;
    };
    const ys: number[] = [];
    const mus: number[] = [];
    const sigmas: number[] = [];
    for (let i = 0; i < 800; i++) {
      const mu = rnd() * 20;
      const sigma = 1 + rnd() * 3;
      // Box-Muller draw from the true distribution
      const u1 = Math.max(rnd(), 1e-9);
      const u2 = rnd();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      ys.push(mu + sigma * z);
      mus.push(mu);
      sigmas.push(sigma);
    }
    const pits = gaussianPIT(ys, mus, sigmas);
    expect(cklBar(pits)).toBeLessThan(0.05);
    expect(l2QuantileCalibrationError(pits)).toBeLessThan(0.01);
  });

  it("miscalibrated (overconfident) PITs have large CKL", () => {
    let st = 6;
    const rnd = () => {
      st = (st * 1103515245 + 12345) & 0x7fffffff;
      return st / 0x7fffffff;
    };
    const ys = Array.from({ length: 800 }, () => (rnd() - 0.5) * 20);
    const mus = ys.map(() => 0);
    const sigmas = ys.map(() => 1); // claims sigma=1, truth is ~U(-10,10)
    const pits = gaussianPIT(ys, mus, sigmas);
    expect(cklBar(pits)).toBeGreaterThan(0.3);
  });

  it("lambda scales the regularizer term", () => {
    const pits = [0.1, 0.3, 0.5, 0.7, 0.9];
    const l0 = regularizedLoss(1.5, pits, 0);
    const l20 = regularizedLoss(1.5, pits, 20);
    expect(l0).toBe(1.5);
    expect(l20 - l0).toBeCloseTo(20 * cklBar(pits), 10);
  });

  it("relative reduction gate math", () => {
    expect(relativeQceReduction(0.2, 0.17)).toBeCloseTo(0.15, 10);
    expect(relativeQceReduction(0.2, 0.1)).toBeGreaterThan(0.15);
  });
});
