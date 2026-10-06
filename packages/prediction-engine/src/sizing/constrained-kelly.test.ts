
import { describe, expect, it } from "vitest";
import { constrainedKellyWeights, kellyLogGrowth, projectKellySimplex } from "./constrained-kelly";

describe("constrained-kelly", () => {
  it("sizes a single +EV bet near the Kelly fraction, capped", () => {
    const w = constrainedKellyWeights([0.6], [1.0], { maxW: 0.25, iters: 3000 });
    // unconstrained Kelly = p - (1-p)/b = 0.2
    expect(w[0] ?? 0).toBeGreaterThan(0.15);
    expect(w[0] ?? 1).toBeLessThanOrEqual(0.25 + 1e-9);
  });
  it("bets nothing on -EV picks", () => {
    const w = constrainedKellyWeights([0.4], [1.0], { iters: 2000 });
    expect(w[0] ?? 1).toBeLessThan(0.02);
  });
  it("log-growth objective improves along the optimization", () => {
    const p = [0.6, 0.55];
    const b = [1.0, 1.0];
    const w0 = [0, 0];
    const w1 = constrainedKellyWeights(p, b, { iters: 2000 });
    expect(kellyLogGrowth(p, b, w1)).toBeGreaterThan(kellyLogGrowth(p, b, w0));
  });
  it("projection keeps weights in the capped simplex", () => {
    const w = projectKellySimplex([0.9, 0.9, 0.9], 0.25);
    expect(w.reduce((s, x) => s + x, 0)).toBeLessThanOrEqual(1 + 1e-6);
    expect(Math.max(...w)).toBeLessThanOrEqual(0.25 + 1e-6);
  });
  it("edge cases throw on bad inputs", () => {
    expect(() => constrainedKellyWeights([], [])).toThrow();
    expect(() => kellyLogGrowth([0.5], [1], [0.1, 0.2])).toThrow();
  });
});
