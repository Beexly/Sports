/**
 * Tests for ./2209-15421v1-synthetic-data (arXiv:2209.15421v1, lane=synthetic_data).
 *
 * ACCEPTANCE GATE: ADOPT iff BOTH: (a) real+synthetic beats real-only by >=0.003 log-loss on the held-out 2024 real
 * season, AND (b) fidelity: per-feature TVD between synthetic and real marginals <=5% on >=90% of
 * features (none exceeding 10%); REJECT if log-loss delta <0.003, any fidelity breach, or
 * synthetic-only ML efficiency <95% of real-only. Evaluate over 3 generator seeds.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2209-15421v1-synthetic-data";

describe("synthetic data validation (arXiv:2209.15421v1)", () => {
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
