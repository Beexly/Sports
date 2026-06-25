import { describe, it, expect } from "vitest";
import { computeDataLeverage, rankDataLeverage, sourceDecisionLeverage, type DataLeverageInputs } from "../data-leverage-field.js";

const hi: DataLeverageInputs = { factId: "route_jump", pDecisionChanges: 0.85, evOfCorrectChange: 0.9, proofQuality: 0.9, freshness: 0.9, repeatability: 0.9, uniqueness: 0.9, cost: 0.2, rightsRisk: 0.1, latency: 0.1, complexity: 0.1, falseConfidenceRisk: 0.05 };

describe("Data Leverage Field", () => {
  it("scores a fresh, unique, proof-backed fact as high leverage", () => {
    expect(computeDataLeverage(hi).classification).toBe("high");
  });
  it("scores a stale, redundant, false-confidence fact as negative", () => {
    const r = computeDataLeverage({ ...hi, factId: "fun_split", proofQuality: 0.2, freshness: 0.1, uniqueness: 0.1, falseConfidenceRisk: 0.9, evOfCorrectChange: 0.2 });
    expect(r.classification).toBe("negative");
  });
  it("ranks a cheap fresh fact above an expensive redundant one", () => {
    const r = rankDataLeverage([hi, { ...hi, factId: "expensive", cost: 1.5, uniqueness: 0.1, freshness: 0.2 }]);
    expect(r[0]!.factId).toBe("route_jump");
  });
  it("sums positive leverage into a source-level total", () => {
    expect(sourceDecisionLeverage([hi, hi])).toBeGreaterThan(0);
  });
});
