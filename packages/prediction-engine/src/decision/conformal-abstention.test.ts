// Tests for decision/conformal-abstention.ts (vitest, globals on).
import { describe, it, expect } from "vitest";
import {
  conformalRiskControl,
  mondrianRiskControl,
  slateDrawdownControl,
  mondrianDeferral,
  metaErrorPercentileGate,
  calibrateQForCoverage,
} from "./conformal-abstention.js";

describe("conformalRiskControl (2208.02814)", () => {
  it("controls the loss rate near alpha on separable data", () => {
    // High |edge| picks win, low |edge| picks lose.
    const edges = [0.5, 0.4, 0.3, 0.05, 0.04, 0.03, 0.02, 0.01];
    const outcomes = [true, true, true, false, false, true, false, false];
    const { lambdaHat, posted, empiricalLoss } = conformalRiskControl(edges, outcomes, 0.45);
    expect(lambdaHat).toBeLessThan(Infinity);
    expect(posted.filter(Boolean).length).toBeGreaterThan(0);
    expect(empiricalLoss).toBeLessThanOrEqual(0.45 + 1e-9);
  });
  it("posts nothing when no lambda controls risk", () => {
    const edges = [0.1, 0.2, 0.3];
    const outcomes = [false, false, false];
    const { posted } = conformalRiskControl(edges, outcomes, 0.1);
    expect(posted.filter(Boolean).length).toBe(0);
  });
  it("handles empty input", () => {
    const res = conformalRiskControl([], [], 0.45);
    expect(res.lambdaHat).toBe(Infinity);
    expect(res.posted).toEqual([]);
  });
});

describe("mondrianRiskControl", () => {
  it("learns a stricter lambda for the worse stratum", () => {
    const edges = [0.5, 0.4, 0.1, 0.5, 0.4, 0.1];
    const outcomes = [true, true, true, false, false, false];
    const strata = ["fav", "fav", "fav", "dog", "dog", "dog"];
    const { lambdaHat, posted } = mondrianRiskControl(edges, outcomes, strata, {
      fav: 0.45,
      dog: 0.45,
    });
    expect(lambdaHat["dog"]!).toBeGreaterThanOrEqual(lambdaHat["fav"]!);
    expect(posted.length).toBe(6);
  });
});

describe("slateDrawdownControl", () => {
  it("returns a finite lambda when risk is controllable", () => {
    const { lambdaHat, acceptable } = slateDrawdownControl([0.01, 0.02, 0.05, 0.1], 0.5);
    expect(acceptable).toBe(true);
    expect(lambdaHat).toBeLessThan(Infinity);
  });
  it("handles empty input", () => {
    expect(slateDrawdownControl([], 0.5).acceptable).toBe(false);
  });
});

describe("mondrianDeferral (2607.27143v1)", () => {
  it("routes ambiguous sets to review within capacity", () => {
    const sets: Set<0 | 1>[] = [new Set([1]), new Set([0, 1]), new Set([0, 1]), new Set([0])];
    const { action, expectedCost } = mondrianDeferral(
      sets,
      { class0: 0.1, class1: 0.1 },
      { cFp: 1.1, cFn: 1, cReview: 0.2 },
      1,
    );
    expect(action[0]).toBe("publish");
    expect(action.filter((a) => a === "review").length).toBe(1);
    expect(expectedCost).toBeGreaterThan(0);
  });
  it("passes ambiguous sets when review has no positive saving", () => {
    const sets: Set<0 | 1>[] = [new Set([0, 1])];
    const { action } = mondrianDeferral(
      sets,
      { class0: 0.1, class1: 0.1 },
      { cFp: 0.1, cFn: 0.1, cReview: 5 },
      10,
    );
    expect(action[0]).toBe("pass");
  });
  it("respects zero capacity", () => {
    const sets: Set<0 | 1>[] = [new Set([0, 1])];
    const { action } = mondrianDeferral(
      sets,
      { class0: 0.1, class1: 0.1 },
      { cFp: 1.1, cFn: 1, cReview: 0.1 },
      0,
    );
    expect(action[0]).toBe("pass");
  });
});

describe("metaErrorPercentileGate (2606.23448v1)", () => {
  it("withholds picks at or above q", () => {
    const { publish, withheld } = metaErrorPercentileGate([0.9, 0.5, 0.95, 0.2], 0.8);
    expect(publish).toEqual([false, true, false, true]);
    expect(withheld).toBe(2);
  });
  it("handles empty input", () => {
    expect(metaErrorPercentileGate([], 0.8).withheld).toBe(0);
  });
});

describe("calibrateQForCoverage", () => {
  it("calibrates q to the target coverage", () => {
    const q = calibrateQForCoverage([0.1, 0.2, 0.3, 0.4, 0.5], 0.8);
    const { publish } = metaErrorPercentileGate([0.1, 0.2, 0.3, 0.4, 0.5], q);
    expect(publish.filter(Boolean).length).toBe(4);
  });
  it("returns 1 for empty input", () => {
    expect(calibrateQForCoverage([], 0.8)).toBe(1);
  });
});
