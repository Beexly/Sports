import { describe, expect, it } from "vitest";
import {
  CONVERSION_TENSOR_METHOD_TAG,
  FOURTH_AND_ONE_SPLIT,
  FOURTH_DOWN_CONVERSION,
  RZ_TD_RATE_PER_SNAP,
  fourthDownConversion,
  rzTdRate,
} from "../signals/tactical/down-distance-conversion-tensor.js";

describe("conversion tensor: measured tables (not the dead pasted lookup)", () => {
  it("exposes the method tag and measured 4th-down table", () => {
    expect(CONVERSION_TENSOR_METHOD_TAG).toBe("down_distance_tensor_v1");
    expect(FOURTH_DOWN_CONVERSION.map((r) => r.rate)).toEqual([
      0.6699, 0.5617, 0.4747, 0.2804,
    ]);
    // the dead pasted lookup (0.53 / 0.418 / 0.332 / 0.249) must not return
    expect(fourthDownConversion(1).rate).not.toBeCloseTo(0.53, 2);
  });

  it("carries the run/pass split that explains the blended 4th&1 rate", () => {
    expect(FOURTH_AND_ONE_SPLIT.run.rate).toBeGreaterThan(
      FOURTH_AND_ONE_SPLIT.pass.rate
    );
    const blended =
      (FOURTH_AND_ONE_SPLIT.run.rate * FOURTH_AND_ONE_SPLIT.run.n +
        FOURTH_AND_ONE_SPLIT.pass.rate * FOURTH_AND_ONE_SPLIT.pass.n) /
      (FOURTH_AND_ONE_SPLIT.run.n + FOURTH_AND_ONE_SPLIT.pass.n);
    expect(blended).toBeCloseTo(0.6699, 2);
  });

  it("looks up RZ TD rates per snap with measured cells", () => {
    expect(rzTdRate(1)).toEqual({ rate: 0.4344, nSnaps: 4968, extrapolated: false });
    expect(rzTdRate(8).rate).toBeCloseTo(0.1966, 4);
    expect(rzTdRate(20).rate).toBeCloseTo(0.072, 4);
  });

  it("is monotonically declining in yardline and distance", () => {
    const rzRates = RZ_TD_RATE_PER_SNAP.map((r) => r.rate);
    const fdRates = FOURTH_DOWN_CONVERSION.map((r) => r.rate);
    for (const rates of [rzRates, fdRates]) {
      const [first, ...rest] = rates;
      if (first === undefined) {
        throw new Error("conversion-tensor test: empty rate table");
      }
      let prev = first;
      for (const rate of rest) {
        expect(rate).toBeLessThan(prev);
        prev = rate;
      }
    }
  });

  it("flags extrapolation beyond the measured range instead of inventing a rate", () => {
    const beyond = rzTdRate(35);
    expect(beyond.extrapolated).toBe(true);
    expect(beyond.rate).toBeCloseTo(0.072, 4);
  });

  it("throws on impossible inputs", () => {
    expect(() => rzTdRate(0)).toThrow(/yardline_100/);
    expect(() => rzTdRate(100)).toThrow(/yardline_100/);
    expect(() => rzTdRate(12.5)).toThrow(/yardline_100/);
    expect(() => fourthDownConversion(0)).toThrow(/ydstogo/);
    expect(() => fourthDownConversion(Number.NaN)).toThrow(/ydstogo/);
  });

  it("every tensor cell clears the n >= 200 interpretability floor", () => {
    for (const row of RZ_TD_RATE_PER_SNAP) expect(row.nSnaps).toBeGreaterThanOrEqual(200);
    for (const row of FOURTH_DOWN_CONVERSION) {
      expect(row.nAttempts).toBeGreaterThanOrEqual(200);
    }
  });
});
