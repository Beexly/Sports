/**
 * Tests for ./2210-04018v1-synthetic-data (arXiv:2210.04018v1, lane=synthetic_data).
 *
 * ACCEPTANCE GATE: ADOPT the SPL + fine-tuning wrapper iff: (a) real+synthetic log-loss beats the naive VP-SDE baseline
 * by >=0.003 on held-out 2024, (b) rare-regime coverage improves >=10% relative with no
 * column-fidelity regression (Omega_col within 0.02 of baseline), (c) median 2024 log-probability
 * under STaSy exceeds the naive model (the paper's fine-tuning signature 131.734 vs 129.293); REJECT
 * if SPL collapses to near-uniform weights (curriculum does nothing — check the weight histogram).
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2210-04018v1-synthetic-data";

describe("synthetic data validation (arXiv:2210.04018v1)", () => {
  it("computes the two-sample KS statistic", () => {
    expect(mod.ksStatistic([1, 2, 3], [1, 2, 3])).toBeCloseTo(0, 10);
    expect(mod.ksStatistic([0, 0, 0], [1, 1, 1])).toBeCloseTo(1, 10);
    expect(mod.ksStatistic([1, 2, 3, 4], [1, 2, 3, 5])).toBeCloseTo(0.25, 10);
    expect(mod.ksStatistic([], [1])).toBeNull();
  });

  it("reports moment parity", () => {
    const r = mod.columnParityReport([1, 2, 3], [1, 2, 3])!;
    expect(r.ks).toBeCloseTo(0, 10);
    expect(r.meanReal).toBeCloseTo(2, 10);
    expect(r.meanShiftStd).toBeCloseTo(0, 10);
    const shifted = mod.columnParityReport([1, 2, 3], [2, 3, 4])!;
    expect(shifted.meanShiftStd).toBeGreaterThan(1);
  });

  it("checks range conformance", () => {
    expect(mod.rangeConformance([1, 2, 10], 0, 5)).toBeCloseTo(2 / 3, 10);
    expect(mod.rangeConformance([1, 2, 3], 0, 5)).toBeCloseTo(1, 10);
    expect(mod.rangeConformance([1], 5, 0)).toBeNull();
  });
});
