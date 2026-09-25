import { describe, expect, it } from "vitest";
import {
  evalScheduleFeatures,
  evalLogisticTrain,
  evalStandingsFacts,
  evalBinomialCoverage,
  evalWilsonLowerBound,
  evalClopperPearsonLowerBound,
  evalHonestCeiling,
  evalRecomputeLedger,
  evalKalshiBookDivergence,
  evalKaunitzOutliers,
  evalConsensusMarketQ,
  evalRegimeShift,
  evalFairSkillBrier,
  evalGroupedClimatology,
} from "./edge-lab-bridge.js";

describe("edge-lab-bridge", () => {
  it("evalScheduleFeatures fail-closes on empty games or missing store", () => {
    expect(evalScheduleFeatures([], null).ok).toBe(false);
    expect(evalScheduleFeatures(null, null).ok).toBe(false);
  });

  it("evalLogisticTrain fail-closes on empty featureKeys or missing train", () => {
    expect(evalLogisticTrain({ featureKeys: [] }, []).ok).toBe(false);
    expect(evalLogisticTrain({ featureKeys: ["a"] }, null).ok).toBe(false);
  });

  it("evalLogisticTrain fits on real examples", () => {
    const train = [
      { label: 1, features: new Map([["a", 1], ["b", 2]]) },
      { label: 0, features: new Map([["a", -1], ["b", -2]]) },
      { label: 1, features: new Map([["a", 1.5], ["b", 1]]) },
      { label: 0, features: new Map([["a", -1.5], ["b", -1]]) },
      { label: 1, features: new Map([["a", 2], ["b", 0]]) },
      { label: 0, features: new Map([["a", -2], ["b", 0]]) },
    ];
    const r = evalLogisticTrain({ featureKeys: ["a", "b"] }, train);
    expect(r.ok, r.ok ? "" : `reason=${r.reason}`).toBe(true);
    if (r.ok) {
      expect(r.n).toBe(6);
      const p = r.predict(new Map([["a", 2], ["b", 1]]));
      expect(p).toBeGreaterThan(0);
      expect(p).toBeLessThan(1);
    }
  });

  it("evalStandingsFacts fail-closes on empty rows", () => {
    expect(evalStandingsFacts([]).ok).toBe(false);
    expect(evalStandingsFacts(null).ok).toBe(false);
  });

  it("evalBinomialCoverage fail-closes on out-of-range counts", () => {
    expect(evalBinomialCoverage(-1, 10).ok).toBe(false);
    expect(evalBinomialCoverage(5, 0).ok).toBe(false);
    expect(evalBinomialCoverage(11, 10).ok).toBe(false);
  });

  it("evalBinomialCoverage computes on real counts", () => {
    const r = evalBinomialCoverage(7, 10);
    expect(r.ok, r.ok ? "" : `reason=${r.reason}`).toBe(true);
    if (r.ok) {
      expect(r.wilson.lower).toBeGreaterThan(0);
      expect(r.wilson.upper).toBeLessThanOrEqual(1);
    }
  });

  it("evalWilsonLowerBound and evalClopperPearsonLowerBound compute", () => {
    const w = evalWilsonLowerBound(8, 10);
    expect(w.ok).toBe(true);
    if (w.ok) expect(w.lower).toBeGreaterThan(0);
    const c = evalClopperPearsonLowerBound(8, 10);
    expect(c.ok).toBe(true);
    if (c.ok) expect(c.lower).toBeGreaterThan(0);
    expect(evalWilsonLowerBound(11, 10).ok).toBe(false);
  });

  it("evalHonestCeiling fail-closes on missing claim and flags over-claim", () => {
    expect(evalHonestCeiling(null).ok).toBe(false);
    const r = evalHonestCeiling({ claimedRate: 0.8, scope: "blind" } as never);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.defects.length).toBeGreaterThan(0);
  });

  it("evalRecomputeLedger fail-closes on empty entries", () => {
    expect(evalRecomputeLedger([]).ok).toBe(false);
    expect(evalRecomputeLedger(null).ok).toBe(false);
  });

  it("evalKalshiBookDivergence fail-closes on missing books", () => {
    expect(evalKalshiBookDivergence(null, null).ok).toBe(false);
  });

  it("evalKaunitzOutliers fail-closes on empty quotes", () => {
    expect(evalKaunitzOutliers([]).ok).toBe(false);
  });

  it("evalConsensusMarketQ returns null data on empty sources without throwing", () => {
    const r = evalConsensusMarketQ([]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeNull();
  });

  it("evalRegimeShift fail-closes on missing team or weekly", () => {
    expect(evalRegimeShift(null, []).ok).toBe(false);
    expect(evalRegimeShift("KC", null).ok).toBe(false);
  });

  it("evalFairSkillBrier fail-closes on bad nOutcomes", () => {
    expect(evalFairSkillBrier(0.1, 1).ok).toBe(false);
    const r = evalFairSkillBrier(0.1, 3);
    expect(r.ok).toBe(true);
    if (r.ok) expect(Number.isFinite(r.fairSkill)).toBe(true);
  });

  it("evalGroupedClimatology fail-closes on empty train", () => {
    expect(evalGroupedClimatology([]).ok).toBe(false);
  });
});
