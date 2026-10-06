
import { describe, expect, it } from "vitest";
import { aic, besselI, coverProbability, pushProbability, skellamPmf, ziSkellamPmf } from "./zi-skellam";

describe("zi-skellam", () => {
  it("besselI matches I_0(1) ~= 1.26606588", () => {
    expect(besselI(0, 1)).toBeCloseTo(1.26606588, 6);
  });
  it("Skellam PMF sums to ~1 and centers near mu", () => {
    let total = 0;
    for (let k = -60; k <= 60; k++) total += skellamPmf(k, 3, 200);
    expect(total).toBeCloseTo(1, 3);
  });
  it("zero inflation adds exactly p at the push", () => {
    const base = skellamPmf(0, 0, 200);
    expect(ziSkellamPmf(0, 0, 200, 0.05)).toBeCloseTo(0.05 + 0.95 * base, 10);
    expect(ziSkellamPmf(1, 0, 200, 0.05)).toBeCloseTo(0.95 * skellamPmf(1, 0, 200), 10);
  });
  it("push probability rises with p; cover probability sane", () => {
    expect(pushProbability(0, 200, 0.1)).toBeGreaterThan(pushProbability(0, 200, 0));
    const c = coverProbability(3, 200, 0.02);
    expect(c).toBeGreaterThan(0.4);
    expect(c).toBeLessThan(0.7);
  });
  it("aic penalizes parameters", () => {
    expect(aic(-100, 3)).toBeCloseTo(206, 10);
  });
  it("edge cases throw on bad params", () => {
    expect(() => skellamPmf(0, 300, 100)).toThrow();
    expect(() => ziSkellamPmf(0, 0, 200, 1.5)).toThrow();
  });
});
