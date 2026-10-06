import { describe, expect, it } from "vitest";
import { betaprimeShrink, mse, type ShrinkageParams } from "./betaprime-shrinkage-2604.js";

const P: ShrinkageParams = { a: 0.5, b: 0.5, sigma2: 4, mu: 0, mcDraws: 20000, seed: 11 };

describe("betaprime shrinkage", () => {
  it("shrinks noisy observations toward the league average", () => {
    const y = [3, -3, 2.5, -2.5];
    const r = betaprimeShrink(y, P);
    expect(Number.isFinite(r.kappaBar)).toBe(true);
    expect(r.kappaBar).toBeGreaterThan(0);
    expect(r.kappaBar).toBeLessThan(1);
    for (let i = 0; i < y.length; i++) {
      expect(Math.abs(r.shrunk[i] ?? 0)).toBeLessThan(Math.abs(y[i] ?? 0));
    }
    expect(r.effectiveDraws).toBeGreaterThan(100);
  });

  it("leaves observations at the prior mean untouched", () => {
    const y = [0, 0, 0];
    const r = betaprimeShrink(y, P);
    expect(r.shrunk.every((v) => Math.abs(v) < 1e-9)).toBe(true);
  });

  it("shrinks more under higher noise", () => {
    const y = [2, 2, 2];
    const low = betaprimeShrink(y, { ...P, sigma2: 0.25 });
    const high = betaprimeShrink(y, { ...P, sigma2: 25 });
    expect(high.kappaBar).toBeGreaterThan(low.kappaBar);
  });

  it("mse helper works", () => {
    expect(mse([1, 2], [1, 2])).toBe(0);
    expect(mse([0, 0], [1, 1])).toBe(1);
    expect(Number.isNaN(mse([], []))).toBe(true);
  });

  it("handles empty and malformed input", () => {
    const r = betaprimeShrink([], P);
    expect(Number.isNaN(r.kappaBar)).toBe(true);
    expect(r.shrunk).toEqual([]);
    const bad = betaprimeShrink([1], { ...P, a: -1 });
    expect(Number.isNaN(bad.kappaBar)).toBe(true);
    const bad2 = betaprimeShrink([1], { ...P, sigma2: 0 });
    expect(Number.isNaN(bad2.kappaBar)).toBe(true);
  });
});
