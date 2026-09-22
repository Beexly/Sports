
import { describe, expect, it } from "vitest";
import { empiricalVariance, sffGain, sffInitMatrix, sffScale } from "./sff-initializer";

describe("sff-initializer", () => {
  it("sffScale follows gain * sqrt(2/(fanIn+fanOut))", () => {
    expect(sffScale(100, 100, "tanh")).toBeCloseTo(Math.sqrt(2 / 200), 12);
    expect(sffScale(100, 100, "relu")).toBeCloseTo(Math.SQRT2 * Math.sqrt(2 / 200), 12);
  });
  it("initialized matrices have roughly the target variance", () => {
    const m = sffInitMatrix(200, 100, 42, "tanh");
    const scale = sffScale(200, 100, "tanh");
    // uniform(-s, s) variance = s^2 / 3
    expect(empiricalVariance(m)).toBeCloseTo((scale * scale) / 3, 2);
  });
  it("seeds reproduce the same matrix", () => {
    expect(sffInitMatrix(4, 3, 9)).toEqual(sffInitMatrix(4, 3, 9));
  });
  it("edge cases throw", () => {
    expect(() => sffScale(0, 10)).toThrow();
    expect(() => sffGain("gelu" as never)).toThrow();
  });
});
