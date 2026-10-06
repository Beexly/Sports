/**
 * Tests for ./timegrad-sampler (arXiv:2101.12072v1, lane=synthetic_data).
 *
 * ACCEPTANCE GATE: ADOPT TimeGrad-trajectory augmentation if: (a) CRPS_sum on 2023-2024 weeks 13-18 beats the
 * copula baseline by >=5% relative, AND (b) real+synthetic spread log-loss beats real-only by
 * >=0.003 on held-out late-season weeks, AND (c) the 90% empirical intervals achieve 85-95%
 * coverage (calibration sanity). REJECT if autoregressive rollout error compounds (CRPS_sum
 * degrades).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./timegrad-sampler";

describe("TimeGrad sampler (arXiv:2101.12072v1)", () => {
  const betas = mod.betaSchedule(10)!;
  const abars = mod.alphaBar(betas)!;
  it("schedule + alphabar sane", () => {
    expect(betas).toHaveLength(10);
    expect(betas[0]).toBeCloseTo(1e-4, 8);
    expect(abars[abars.length - 1]).toBeLessThan(abars[0]!);
    expect(mod.betaSchedule(0)).toBeNull();
    expect(mod.alphaBar([])).toBeNull();
  });
  it("forward diffusion scales with t", () => {
    const rng = mod.mulberry32(1);
    const x0 = [1, 1, 1];
    const early = mod.forwardDiffuse(x0, 0, abars, rng)!;
    const late = mod.forwardDiffuse(x0, 9, abars, rng)!;
    expect(early.every((v) => Math.abs(v - 1) < 1)).toBe(true);
    expect(late.some((v) => Math.abs(v - 1) > 0.5)).toBe(true);
  });
  it("ancestral sample with oracle denoiser recovers scale", () => {
    const x = mod.ancestralSample(3, betas, abars, () => [0, 0, 0], 7)!;
    expect(x).toHaveLength(3);
    expect(x.every((v) => Number.isFinite(v))).toBe(true);
  });
  it("null on malformed", () => {
    const rng = mod.mulberry32(1);
    expect(mod.forwardDiffuse([1], 99, abars, rng)).toBeNull();
    expect(mod.reverseStep([1], 0, betas, abars, () => null, rng)).toBeNull();
    expect(mod.ancestralSample(0, betas, abars, () => [0], 7)).toBeNull();
  });
});
