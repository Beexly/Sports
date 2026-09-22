import { describe, it, expect } from "vitest";
import {
  cvarFromQuantiles,
  interpolateQuantile,
  linearQuantileModel,
  optimisticCvarAction,
  discreteCvar,
} from "@/lib/calibration/cvar-contextual-bandits";

// ============================================================
// arXiv 2507.15320v5 — CVaR contextual bandits. Additive only.
// ============================================================

describe("CVaR contextual bandits — 2507.15320v5", () => {
  it("cvarFromQuantiles integrates the quantile function over [0, tau]", () => {
    // Q(u) = 2u on grid; CVaR_0.5 = (1/0.5) * integral_0^0.5 2u du = 0.5.
    const tauGrid = [0, 0.25, 0.5, 0.75, 1];
    const qs = [0, 0.5, 1, 1.5, 2];
    expect(cvarFromQuantiles(tauGrid, qs, 0.5)).toBeCloseTo(0.5, 10);
  });

  it("cvarFromQuantiles of a constant quantile is the constant", () => {
    const tauGrid = [0.1, 0.5, 0.9];
    expect(cvarFromQuantiles(tauGrid, [3, 3, 3], 0.25)).toBeCloseTo(3, 10);
  });

  it("cvarFromQuantiles handles a tau off the grid", () => {
    const tauGrid = [0, 0.5, 1];
    const qs = [0, 1, 2]; // Q(u) = 2u
    // CVaR_0.25 = (1/0.25) * integral_0^0.25 2u du = 0.25.
    expect(cvarFromQuantiles(tauGrid, qs, 0.25)).toBeCloseTo(0.25, 10);
  });

  it("cvarFromQuantiles returns NaN on bad input", () => {
    expect(cvarFromQuantiles([], [], 0.25)).toBeNaN();
  });

  it("interpolateQuantile is linear between grid points", () => {
    expect(interpolateQuantile([0, 1], [10, 20], 0.25)).toBeCloseTo(12.5, 10);
    expect(interpolateQuantile([0, 1], [10, 20], -1)).toBe(10);
    expect(interpolateQuantile([0, 1], [10, 20], 2)).toBe(20);
  });

  it("linearQuantileModel evaluates the per-tau linear form", () => {
    const q = linearQuantileModel([1, 2], [[0.5], [1.5]], [4], 1);
    expect(q).toBeCloseTo(8, 10);
    expect(linearQuantileModel([1], [[0.5]], [4], 5)).toBeNaN();
  });

  it("optimisticCvarAction picks the max of CVaR + bonus", () => {
    expect(optimisticCvarAction([0.1, 0.5, 0.3], [0, 0, 0])).toBe(1);
    // Bonus can flip the choice (exploration).
    expect(optimisticCvarAction([0.1, 0.5, 0.3], [0, 0, 0.5])).toBe(2);
    expect(optimisticCvarAction([], [])).toBe(-1);
  });

  it("discreteCvar takes the worst tau-fraction", () => {
    expect(discreteCvar([0.9, 0.1, 0.8, 0.2], 0.25)).toBeCloseTo(0.1, 10);
    expect(discreteCvar([], 0.25)).toBe(0);
  });
});
