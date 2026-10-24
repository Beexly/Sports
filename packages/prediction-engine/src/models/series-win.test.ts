import { describe, expect, it } from "vitest";
import { seriesWinProbability } from "./series-win.js";

describe("series win", () => {
  it("is a coin flip for equal ratings in a best of seven", () => {
    expect(seriesWinProbability(0, 0, 7)).toBeCloseTo(0.5);
    expect(seriesWinProbability(2, 0, 1)).toBeGreaterThan(0.8);
    expect(() => seriesWinProbability(0, 0, 4)).toThrow(/odd/);
  });
});
