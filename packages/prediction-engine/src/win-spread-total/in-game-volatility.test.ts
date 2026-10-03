
import { describe, expect, it } from "vitest";
import { ewmaVolatility, expectedMovement, inGameVolInterval } from "./in-game-volatility";

describe("in-game-volatility", () => {
  it("ewmaVolatility tracks sustained scoring bursts", () => {
    const vol = ewmaVolatility([0, 0, 0, 7, 7, 7, 0, 0], 0.5);
    expect(vol[5] ?? 0).toBeGreaterThan(vol[2] ?? 0);
    expect(vol[7] ?? 0).toBeLessThan(vol[5] ?? 0);
  });
  it("expectedMovement scales with sqrt of remaining periods", () => {
    expect(expectedMovement(2, 4)).toBeCloseTo(4, 10);
  });
  it("interval is symmetric around the current margin", () => {
    const iv = inGameVolInterval(3, 1.5, 16);
    expect(iv.lower + iv.upper).toBeCloseTo(6, 10);
    expect(iv.width).toBeGreaterThan(0);
  });
  it("edge cases throw", () => {
    expect(() => ewmaVolatility([1], 1)).toThrow();
    expect(() => expectedMovement(-1, 4)).toThrow();
  });
});
