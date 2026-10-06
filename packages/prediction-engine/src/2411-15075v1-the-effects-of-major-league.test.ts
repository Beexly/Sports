/**
 * Vitest suite for arXiv:2411.15075v1 (The Effects of Major League Baseball's Ban on Infield Shifts: A Quasi-Experimental Analysis).
 * Gate: ADOPT the DID+SCM protocol as GSE's standard quasi-experimental toolkit if the kickoff replication (§12) passes its placebo gates; REJECT any substantive conclusion about the shift ban itself as a GSE input.
 */
import { describe, it, expect } from "vitest";
import { synthWeights, synthCounterfactual, rmspeRatio } from "./2411-15075v1-the-effects-of-major-league";

describe("2411-15075v1 synthetic control", () => {
  it("fits simplex weights that track the pre-treatment path", () => {
    const DPre = [
      [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7],
    ];
    const yPre = DPre.map((r) => 0.5 * r[0]! + 0.5 * r[1]!);
    const w = synthWeights(yPre, DPre);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    expect(Math.min(...w)).toBeGreaterThanOrEqual(-1e-9);
    const fit = yPre.map((_, t) => (DPre[t]?.[0] ?? 0) * (w[0] ?? 0) + (DPre[t]?.[1] ?? 0) * (w[1] ?? 0));
    const err = Math.sqrt(fit.reduce((s, f, t) => s + (f - yPre[t]!) ** 2, 0) / fit.length);
    expect(err).toBeLessThan(0.05);
  });
  it("RMSPE ratio flags real effects", () => {
    const actual = [1, 2, 3, 10, 11];
    const synth = [1, 2, 3, 3, 3];
    expect(rmspeRatio(actual, synth, 3)).toBeGreaterThan(5);
    expect(() => rmspeRatio(actual, synth, 0)).toThrow();
    expect(() => synthWeights([], [[1]])).toThrow();
  });
});
