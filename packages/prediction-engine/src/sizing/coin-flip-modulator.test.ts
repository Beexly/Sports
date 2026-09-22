import { describe, expect, it } from "vitest";
import { isCoinFlip, modulateStake } from "./coin-flip-modulator";

describe("coin-flip-modulator", () => {
  it("isCoinFlip uses the +/-2.5 default threshold", () => {
    expect(isCoinFlip(2.5)).toBe(true);
    expect(isCoinFlip(-2.5)).toBe(true);
    expect(isCoinFlip(3)).toBe(false);
    expect(isCoinFlip(0)).toBe(true);
    expect(isCoinFlip(2.5, 3)).toBe(true);
  });
  it("modulateStake scales coin-flip stakes, leaves the rest", () => {
    expect(modulateStake(0.1, 1.5)).toBeCloseTo(0.05, 12);
    expect(modulateStake(0.1, 7)).toBeCloseTo(0.1, 12);
    expect(modulateStake(0.1, 2, { factor: 0 })).toBe(0); // abstain
    expect(modulateStake(0.1, 2, { factor: 1 })).toBeCloseTo(0.1, 12);
  });
  it("throws on degenerate inputs", () => {
    expect(() => isCoinFlip(NaN)).toThrow();
    expect(() => modulateStake(-1, 2)).toThrow();
    expect(() => modulateStake(0.1, 2, { factor: 2 })).toThrow();
  });
});
