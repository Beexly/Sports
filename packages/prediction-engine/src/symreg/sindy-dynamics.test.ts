
import { describe, expect, it } from "vitest";
import { gameStateLibraryRow, nonzeroCount, openLoopBfr, stlsqFit } from "./sindy-dynamics";

describe("sindy-dynamics", () => {
  it("recovers sparse dynamics from the game-state library", () => {
    // d(score)/dt = -0.1*score + 0.02*|score| (garbage-time asymmetry)
    const Theta: number[][] = [];
    const dX: number[] = [];
    for (let t = 0; t < 60; t++) {
      const s = Math.sin(t * 0.25) * 10;
      Theta.push(gameStateLibraryRow([s, t]));
      dX.push(-0.1 * s + 0.02 * Math.abs(s));
    }
    const xi = stlsqFit(Theta, dX, 0.005);
    expect(nonzeroCount(xi)).toBeLessThanOrEqual(8);
    // the score term (index 1) should dominate
    expect(Math.abs(xi[1] ?? 0)).toBeGreaterThan(0.05);
  });
  it("openLoopBfr is 1 for perfect forecasts, 0 for mean forecasts", () => {
    expect(openLoopBfr([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10);
    expect(openLoopBfr([1, 2, 3], [2, 2, 2])).toBeCloseTo(0, 10);
  });
  it("library row has 1 + 2d + d(d+1)/2 terms", () => {
    expect(gameStateLibraryRow([1, 2, 3]).length).toBe(1 + 6 + 6);
  });
  it("edge cases throw on misaligned series", () => {
    expect(() => openLoopBfr([1], [1, 2])).toThrow();
    expect(() => openLoopBfr([], [])).toThrow();
  });
});
