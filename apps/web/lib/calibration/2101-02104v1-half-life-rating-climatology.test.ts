import { describe, expect, it } from "vitest";

import {
  ENABLED,
  HALF_LIFE_SWEEP,
  climatologyBlend,
  fitBlendAlpha,
  halfLifeWeightedRate,
  halfLifeWeights,
  reliabilityGate,
} from "@/lib/calibration/2101-02104v1-half-life-rating-climatology";

describe("half-life rating + climatology blending", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("half-life weights decay correctly", () => {
    const w = halfLifeWeights(5, 2);
    expect(w[4]).toBeCloseTo(1, 10);
    expect(w[2]).toBeCloseTo(0.5, 10);
    expect(w[0]).toBeCloseTo(0.25, 10);
    expect(HALF_LIFE_SWEEP).toEqual([30, 60, 120, 200, 300]);
  });

  it("half-life-weighted rate favors recent games", () => {
    // Early: 0/10, recent: 10/10 -> short half-life should be near 1.
    const s = [0, 0, 0, 0, 0, 10, 10, 10, 10, 10];
    const t = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
    const short = halfLifeWeightedRate(s, t, 2);
    const long = halfLifeWeightedRate(s, t, 1000);
    expect(short).toBeGreaterThan(0.8);
    expect(long).toBeCloseTo(0.5, 1);
  });

  it("fitBlendAlpha shrinks toward climatology when the model is noisy", () => {
    const ys = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
    const noisy = [0.99, 0.01, 0.99, 0.01, 0.01, 0.99, 0.99, 0.01, 0.01, 0.99, 0.99, 0.01];
    const clim = ys.map(() => 0.5);
    const { alpha } = fitBlendAlpha(noisy, clim, ys);
    expect(alpha).toBeLessThan(1);
    expect(climatologyBlend(0.9, 0.5, alpha)).toBeLessThan(0.9);
    expect(climatologyBlend(0.9, 0.5, 1)).toBe(0.9);
  });

  it("reliabilityGate flags points outside the 95% consistency bars", () => {
    const good = [
      { p: 0.5, observed: 0.52, n: 400 },
      { p: 0.7, observed: 0.69, n: 400 },
    ];
    expect(reliabilityGate(good).pass).toBe(true);
    const bad = [{ p: 0.5, observed: 0.8, n: 400 }];
    const res = reliabilityGate(bad);
    expect(res.pass).toBe(false);
    expect(res.violations).toBe(1);
  });
});
