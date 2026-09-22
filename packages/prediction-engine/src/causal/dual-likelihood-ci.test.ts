
import { describe, expect, it } from "vitest";
import { dualLikelihoodTotalEffectCI } from "./dual-likelihood-ci";

function makeData(n: number, effect: number, seed: number): number[][] {
  let s = seed;
  const rnd = (): number => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const out: number[][] = [];
  for (let k = 0; k < n; k++) {
    const c = rnd() * 2 - 1; // confounder
    const t = 0.5 * c + (rnd() * 2 - 1); // treatment
    const y = effect * t + 0.8 * c + (rnd() * 2 - 1) * 0.5; // outcome
    out.push([t, y, c]);
  }
  return out;
}

describe("dual-likelihood-ci", () => {
  it("recovers a known effect with the point inside the region", () => {
    const ci = dualLikelihoodTotalEffectCI(makeData(400, 1.5, 42), 0, 1);
    expect(ci.point).toBeCloseTo(1.5, 0);
    expect(ci.lower).toBeLessThan(ci.point);
    expect(ci.upper).toBeGreaterThan(ci.point);
    expect(ci.lower).toBeLessThan(1.5);
    expect(ci.upper).toBeGreaterThan(1.5);
  });
  it("region shrinks with more data", () => {
    const w1 = dualLikelihoodTotalEffectCI(makeData(100, 1, 7), 0, 1).width;
    const w2 = dualLikelihoodTotalEffectCI(makeData(1600, 1, 7), 0, 1).width;
    expect(w2).toBeLessThan(w1);
  });
  it("edge cases throw on degenerate inputs", () => {
    expect(() => dualLikelihoodTotalEffectCI([], 0, 1)).toThrow();
    expect(() => dualLikelihoodTotalEffectCI([[1, 2]], 0, 1)).toThrow();
    expect(() => dualLikelihoodTotalEffectCI(makeData(50, 1, 1), 0, 0)).toThrow();
  });
});
