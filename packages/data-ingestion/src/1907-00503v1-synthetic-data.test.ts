/**
 * Tests for ./1907-00503v1-synthetic-data (arXiv:1907.00503v1, lane=synthetic_data).
 *
 * ACCEPTANCE GATE: ADOPT the conditioning machinery if: (a) real+regime-conditioned-synthetic beats real-only by
 * >=0.003 log-loss on held-out 2024, AND (b) ECE inside the rarest outcome regime (underdog outright
 * wins) improves by >=0.005 vs real-only, AND (c) fidelity: synthetic marginals within 5% TVD on >=90%
 * of features.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./1907-00503v1-synthetic-data";

describe("synthetic data validation (arXiv:1907.00503v1)", () => {
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
