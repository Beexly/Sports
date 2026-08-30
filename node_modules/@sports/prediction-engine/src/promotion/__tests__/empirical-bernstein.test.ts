import { describe, expect, it } from "vitest";
import { pairedBrierLcb } from "../empirical-bernstein.js";

describe("pairedBrierLcb", () => {
  it("matches a hand-computed value for a small fixture", () => {
    // d_i = [0.01, 0.03, -0.01, 0.02, 0.00], delta = 0.05
    //
    // n = 5
    // dbar = (0.01 + 0.03 - 0.01 + 0.02 + 0.00) / 5 = 0.05 / 5 = 0.01
    //
    // deviations from dbar:
    //   0.01 - 0.01 =  0.00  ->  0.00^2 = 0.0000
    //   0.03 - 0.01 =  0.02  ->  0.02^2 = 0.0004
    //  -0.01 - 0.01 = -0.02  ->  (-0.02)^2 = 0.0004
    //   0.02 - 0.01 =  0.01  ->  0.01^2 = 0.0001
    //   0.00 - 0.01 = -0.01  ->  (-0.01)^2 = 0.0001
    // sum of squared deviations = 0.0000 + 0.0004 + 0.0004 + 0.0001 + 0.0001 = 0.0010
    //
    // sample variance (ddof=1) = 0.0010 / (5 - 1) = 0.00025
    // s_d = sqrt(0.00025) = 0.0158113883...
    //
    // ln(2/delta) = ln(2/0.05) = ln(40) = 3.68887945411...
    //
    // term1 = s_d * sqrt(2 * ln(2/delta) / n)
    //       = 0.0158113883 * sqrt(2 * 3.68887945411 / 5)
    //       = 0.0158113883 * sqrt(1.47555178165)
    //       = 0.0158113883 * 1.21472497...
    //       = 0.0192064558...
    //
    // term2 = (b - a) * 7 * ln(2/delta) / (3 * (n - 1)),  (b - a) = 2 because
    //         the Brier differential spans [-1, 1] (range width 2 — the
    //         Maurer–Pontil additive penalty scales with the range)
    //       = 2 * 7 * 3.68887945411 / (3 * 4)
    //       = 51.6443123576 / 12
    //       = 4.30369269647...
    //
    // LCB = dbar - term1 - term2
    //     = 0.01 - 0.0192064558 - 4.3036926965
    //     = -4.3128991523 (approx)
    const diffs = [0.01, 0.03, -0.01, 0.02, 0.0];
    const result = pairedBrierLcb(diffs, 0.05);

    expect(result.n).toBe(5);
    expect(result.meanD).toBeCloseTo(0.01, 10);
    expect(result.stdD).toBeCloseTo(0.015811388300841896, 10);
    expect(result.lcb).toBeCloseTo(-4.312899152292657, 9);

    // n = 5 is tiny — the 7*ln(2/delta)/(3(n-1)) term dominates and swamps
    // the mean, which is exactly why the contract requires n >= N_min = 500
    // as a separate eligibility precondition rather than relying on the LCB
    // alone at small n.
    expect(result.lcb).toBeLessThan(result.meanD);
  });

  it("returns lcb = -Infinity for n < 2 (no silent pass on insufficient evidence)", () => {
    expect(pairedBrierLcb([], 0.05).lcb).toBe(-Infinity);
    expect(pairedBrierLcb([0.01], 0.05).lcb).toBe(-Infinity);
  });

  it("rejects an out-of-range delta", () => {
    expect(() => pairedBrierLcb([0.1, 0.2], 0)).toThrow(RangeError);
    expect(() => pairedBrierLcb([0.1, 0.2], 1)).toThrow(RangeError);
    expect(() => pairedBrierLcb([0.1, 0.2], -0.1)).toThrow(RangeError);
  });

  it("a tighter delta (smaller) produces a lower (more conservative) LCB", () => {
    const diffs = Array.from({ length: 600 }, (_, i) => 0.01 + 0.002 * Math.sin(i));
    const wide = pairedBrierLcb(diffs, 0.05);
    const tight = pairedBrierLcb(diffs, 0.01);
    expect(tight.lcb).toBeLessThan(wide.lcb);
    // meanD and stdD do not depend on delta
    expect(tight.meanD).toBeCloseTo(wide.meanD, 12);
    expect(tight.stdD).toBeCloseTo(wide.stdD, 12);
  });

  it("identity input (all zero diffs) yields meanD = 0 and a negative LCB", () => {
    const diffs = Array.from({ length: 600 }, () => 0);
    const result = pairedBrierLcb(diffs, 0.05);
    expect(result.meanD).toBe(0);
    expect(result.stdD).toBe(0);
    expect(result.lcb).toBeLessThan(0);
  });
});
