/**
 * Vitest suite for arXiv:2510.06635 (StruSR: Structure-Aware Symbolic Regression with Physics-Informed Taylor Guidance).
 * Gate: ADAPT if the guided-GP equation reaches sensitivity-fidelity correlation >=0.9 with the network (vs <=0.7 for vanilla PySR) at validation Brier within 2% of the network's, AND converges in <=50% of the generations vanilla PySR needs.
 */
import { describe, it, expect } from "vitest";
import { sensitivityFidelityCorrelation, anchorTaylorError, protectedSubtrees } from "./2510-06635-strusr-structureaware-symbolic-regression-with";

describe("2510-06635 guided symbolic distillation", () => {
  it("correlation is 1 for perfectly faithful equations", () => {
    const pts = [
      { eqSensitivity: 1, netSensitivity: 2 },
      { eqSensitivity: 2, netSensitivity: 4 },
      { eqSensitivity: 3, netSensitivity: 6 },
    ];
    expect(sensitivityFidelityCorrelation(pts)).toBeCloseTo(1, 10);
    expect(sensitivityFidelityCorrelation([
      { eqSensitivity: 1, netSensitivity: 1 },
      { eqSensitivity: 2, netSensitivity: -1 },
    ])).toBeLessThan(0);
    expect(() => sensitivityFidelityCorrelation([pts[0]!])).toThrow();
  });
  it("Taylor error is zero for exact local matches", () => {
    const a = [{ netValue: 0.6, eqValue: 0.6, eqSlope: 0.1, netSlope: 0.1, dx: 0.5 }];
    expect(anchorTaylorError(a)).toBeCloseTo(0, 12);
    expect(() => anchorTaylorError([])).toThrow();
  });
  it("masks only high-sensitivity subtrees", () => {
    expect(protectedSubtrees([0.9, 0.2, 0.5], 0.5)).toEqual([true, false, true]);
  });
});
