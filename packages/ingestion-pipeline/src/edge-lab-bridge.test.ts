import { describe, expect, it } from "vitest";
import {
  evalScheduleFeatures,
  evalLogisticTrain,
  evalStandingsFacts,
  evalBinomialCoverage,
  evalWilsonLowerBound,
  evalClopperPearsonLowerBound,
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
});
