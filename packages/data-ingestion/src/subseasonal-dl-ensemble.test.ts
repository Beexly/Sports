/**
 * Tests for ./subseasonal-dl-ensemble (arXiv:2102.05107, lane=weather).
 *
 * ACCEPTANCE GATE: ADAPT if the SP-retrain ensemble improves holdout CRPS by >=2% over the bootstrap ensemble AND
 * its spread-RMSE ratio is closer to 1.0 (within +/-0.15) than the bootstrap ensemble's. Otherwise
 * keep data-bootstrap ensembles.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./subseasonal-dl-ensemble";

describe("sub-seasonal DL ensemble (arXiv:2102.05107)", () => {
  const members = [
    { memberId: "m1", model: "dl-a", initAt: new Date().toISOString(), leadWeeks: 3, forecast: 70, weight: 1 },
    { memberId: "m2", model: "dl-b", initAt: new Date().toISOString(), leadWeeks: 3, forecast: 74, weight: 1 },
    { memberId: "m3", model: "dl-c", initAt: new Date().toISOString(), leadWeeks: 3, forecast: 72, weight: 2 },
  ];
  it("weighted mean", () => {
    expect(mod.ensembleMean(members)).toBeCloseTo(72, 10);
    expect(mod.ensembleMean([])).toBeNull();
    expect(mod.isEnsembleMember({ ...members[0], weight: -1 })).toBe(false);
  });
  it("spread", () => {
    expect(mod.ensembleSpread(members)!).toBeGreaterThan(0);
    expect(mod.ensembleSpread([members[0]])).toBeNull();
  });
  it("anomaly correlation", () => {
    expect(mod.anomalyCorrelation([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10);
    expect(mod.anomalyCorrelation([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1, 10);
    expect(mod.anomalyCorrelation([1], [1])).toBeNull();
  });
  it("rank histogram flatness", () => {
    expect(mod.rankHistogramFlatness([0, 1, 2, 3, 0, 1, 2, 3], 4)).toBeCloseTo(1, 10);
    expect(mod.rankHistogramFlatness([0, 0, 0, 0], 4)).toBeLessThan(1);
    expect(mod.rankHistogramFlatness([], 4)).toBeNull();
  });
});
