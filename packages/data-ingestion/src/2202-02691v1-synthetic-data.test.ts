/**
 * Tests for ./2202-02691v1-synthetic-data (arXiv:2202.02691v1, lane=synthetic_data).
 *
 * ACCEPTANCE GATE: ADOPT iff: (a) it matches/beats Time-GAN on >=7/10 of the paper's fidelity comparisons on NFL data,
 * (b) TSTR AUC >= 90% of real-trained AUC on held-out seasons, (c) real+synthetic spread log-loss
 * beats real-only by >=0.003, (d) throughput >=100 trajectories/sec on one GPU.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2202-02691v1-synthetic-data";

describe("synthetic data validation (arXiv:2202.02691v1)", () => {
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
