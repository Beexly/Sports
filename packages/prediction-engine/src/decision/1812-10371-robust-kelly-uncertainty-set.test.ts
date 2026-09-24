// Tests for decision/1812-10371-robust-kelly-uncertainty-set.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  boxUncertaintySet,
  radiusFromResiduals,
  nominalKellyFraction,
  robustKellyFraction,
  adaptiveRadius,
  robustSizerGatePasses,
  DEFAULT_ROBUST_CONFIG,
} from "./1812-10371-robust-kelly-uncertainty-set.js";

describe("boxUncertaintySet / radiusFromResiduals (1812.10371)", () => {
  it("builds a symmetric box clipped to (0,1)", () => {
    const { pLo, pHi } = boxUncertaintySet(0.6, 0.05);
    expect(pLo).toBeCloseTo(0.55, 10);
    expect(pHi).toBeCloseTo(0.65, 10);
    const edge = boxUncertaintySet(0.99, 0.05);
    expect(edge.pHi).toBeLessThan(1);
    expect(edge.pLo).toBeGreaterThan(0);
  });
  it("sizes the radius from the residual quantile", () => {
    const r = radiusFromResiduals([0.01, -0.02, 0.03, -0.08, 0.05], 0.8);
    expect(r).toBeCloseTo(0.05, 10);
    expect(radiusFromResiduals([], 0.9)).toBe(DEFAULT_ROBUST_CONFIG.radius);
  });
});

describe("robustKellyFraction", () => {
  it("is weakly below the nominal Kelly fraction (protection costs growth)", () => {
    const { robust, nominal } = robustKellyFraction(0.6, 2.0, { radius: 0.05, fractionalCap: 0.25 });
    expect(robust).toBeLessThanOrEqual(nominal + 1e-9);
    expect(robust).toBeGreaterThanOrEqual(0);
    expect(robust).toBeLessThanOrEqual(0.25);
  });
  it("collapses to ~nominal as the radius shrinks to zero", () => {
    const tiny = robustKellyFraction(0.6, 2.0, { radius: 1e-9, fractionalCap: 0.25 });
    expect(tiny.robust).toBeCloseTo(tiny.nominal, 4);
  });
  it("returns 0 when there is no edge even under the optimistic corner", () => {
    const { robust } = robustKellyFraction(0.4, 2.0, { radius: 0.02, fractionalCap: 0.25 });
    expect(robust).toBeLessThan(1e-6);
  });
  it("nominal matches the closed form p/b - q", () => {
    // p=0.6, decimal odds 2.0 -> b=1 -> 0.6/1 - 0.4 = 0.2
    expect(nominalKellyFraction(0.6, 2.0, 0.25)).toBeCloseTo(0.2, 10);
  });
});

describe("adaptiveRadius", () => {
  it("shrinks toward the base radius when calibration is good", () => {
    expect(adaptiveRadius(0.05, 0.01, 0.02)).toBeCloseTo(0.05, 10);
  });
  it("expands protection when calibration degrades", () => {
    expect(adaptiveRadius(0.05, 0.06, 0.02)).toBeGreaterThan(0.05);
  });
});

describe("robustSizerGatePasses", () => {
  it("encodes the worst-decile +20% / total >=0.9x gate", () => {
    expect(robustSizerGatePasses(1.21, 1.0, 0.95, 1.0)).toBe(true);
    expect(robustSizerGatePasses(1.19, 1.0, 0.95, 1.0)).toBe(false);
    expect(robustSizerGatePasses(1.3, 1.0, 0.89, 1.0)).toBe(false);
  });
});
