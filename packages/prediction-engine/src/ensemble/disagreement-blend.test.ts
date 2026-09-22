/**
 * Disagreement-scheduled market blending — tests (arXiv 2008.10423).
 *
 * ACCEPTANCE GATE: the schedule splits historical disagreements into
 * terciles; large disagreement -> heavy market weight, small -> light;
 * conviction shrinkage behaves at the endpoints; the full blend stays in
 * (0, 1) and moves toward the market as disagreement grows.
 */
import { describe, expect, it } from "vitest";
import {
  blendWeight,
  convictionShrink,
  disagreement,
  disagreementBlend,
  fitBlendSchedule,
} from "./disagreement-blend";

describe("fitBlendSchedule + blendWeight", () => {
  it("maps disagreement terciles to the paper's weight ladder", () => {
    const hist = [0.1, 0.2, 0.3, 0.5, 0.7, 0.9, 1.2, 1.6, 2.0];
    const s = fitBlendSchedule(hist);
    expect(s.cutoffs[0]).toBeLessThan(s.cutoffs[1]);
    expect(blendWeight(0.05, s)).toBeCloseTo(0.125, 12);
    expect(blendWeight(0.6, s)).toBeCloseTo(0.275, 12);
    expect(blendWeight(3.0, s)).toBeCloseTo(0.5, 12);
    expect(() => fitBlendSchedule([0.1, 0.2])).toThrow();
  });
});

describe("disagreement", () => {
  it("is zero when consensus equals the market, positive otherwise", () => {
    expect(disagreement([0.6, 0.6], 0.6)).toBeCloseTo(0, 12);
    expect(disagreement([0.9, 0.9], 0.5)).toBeGreaterThan(1);
    expect(() => disagreement([], 0.5)).toThrow();
  });
});

describe("convictionShrink", () => {
  it("interpolates between the model and its pre-market estimate", () => {
    expect(convictionShrink(0.8, 0.5, 1)).toBeCloseTo(0.8, 12);
    expect(convictionShrink(0.8, 0.5, 0)).toBeCloseTo(0.5, 12);
    expect(convictionShrink(0.8, 0.5, 0.5)).toBeCloseTo(0.65, 12);
    expect(() => convictionShrink(0.8, 0.5, 1.5)).toThrow();
  });
});

describe("disagreementBlend", () => {
  it("blends toward the market more when disagreement is large", () => {
    const hist = Array.from({ length: 60 }, (_, i) => 0.05 + (i / 59) * 2.0);
    const s = fitBlendSchedule(hist);
    const small = disagreementBlend([0.62, 0.64], [0.6, 0.6], [1, 1], 0.6, s);
    const large = disagreementBlend([0.9, 0.92], [0.6, 0.6], [1, 1], 0.55, s);
    expect(small.wMarket).toBeLessThan(large.wMarket);
    for (const r of [small, large]) {
      expect(r.blended).toBeGreaterThan(0);
      expect(r.blended).toBeLessThan(1);
    }
    // Large disagreement pulls the blend below the model consensus toward the market.
    expect(large.blended).toBeLessThan(0.9);
    expect(large.blended).toBeGreaterThan(0.55);
    expect(() => disagreementBlend([0.6], [0.6, 0.6], [1], 0.5, s)).toThrow();
  });
});
