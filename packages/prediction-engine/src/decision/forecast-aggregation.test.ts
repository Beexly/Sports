// Tests for decision/forecast-aggregation.ts (vitest, globals on).
import { describe, it, expect } from "vitest";
import {
  precisionWeightedAggregate,
  ogdBlendStep,
  ogdBlendPredict,
  injectivityAudit,
  binomialMajorityGate,
  agreementGate,
  disagreementNoBet,
  crowdsourcedReject,
} from "./forecast-aggregation.js";

describe("precisionWeightedAggregate (1710.02838)", () => {
  it("weights sharper forecasts more when spread is small", () => {
    const { aggregate } = precisionWeightedAggregate([0.7, 0.55], 0.5);
    // 1/(0.7*0.3) > 1/(0.55*0.45): aggregate leans toward 0.7.
    expect(aggregate).toBeGreaterThan(0.625);
    expect(aggregate).toBeLessThan(0.7);
  });
  it("uses sqrt weighting beyond the 0.4 spread", () => {
    const { aggregate } = precisionWeightedAggregate([0.9, 0.4], 0.5);
    expect(aggregate).toBeGreaterThan(0.4);
    expect(aggregate).toBeLessThan(0.9);
  });
  it("uses the average-prior scheme without a base rate", () => {
    const { aggregate, scheme } = precisionWeightedAggregate([0.6, 0.6]);
    expect(scheme).toBe("average-prior");
    expect(aggregate).toBeCloseTo(0.6, 6);
  });
  it("refuses to average correlated experts without a fitted prior", () => {
    const { scheme } = precisionWeightedAggregate([0.6, 0.7, 0.65], 0.5, true);
    expect(scheme).toBe("single-expert");
  });
  it("handles empty input", () => {
    expect(precisionWeightedAggregate([]).aggregate).toBe(0.5);
  });
});

describe("ogdBlendStep / ogdBlendPredict (1802.07107)", () => {
  it("learns toward the observed outcome", () => {
    let state = { h: [0.5], eta: 0.5 };
    const before = ogdBlendPredict(state.h, [0.7], 0.5);
    for (let i = 0; i < 20; i++) {
      state = ogdBlendStep(state, [0.7], 0.5, 1);
    }
    const after = ogdBlendPredict(state.h, [0.7], 0.5);
    expect(after).toBeGreaterThan(before);
  });
  it("predicts inside (0, 1)", () => {
    const p = ogdBlendPredict([1, 1], [0.9, 0.1], 0.5);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });
  it("caps extreme-forecast influence at the n-alpha bound", () => {
    const p = ogdBlendPredict([1], [0.9999], 0.5, 100);
    expect(p).toBeLessThan(0.9999);
    expect(p).toBeGreaterThan(0.5);
  });
});

describe("injectivityAudit", () => {
  it("drops deterministic duplicates", () => {
    expect(
      injectivityAudit([
        [0.6, 0.7],
        [0.6, 0.7],
        [0.5, 0.8],
      ]),
    ).toEqual([0, 2]);
  });
});

describe("binomialMajorityGate (2111.08230v1)", () => {
  it("publishes on unanimous agreement", () => {
    const res = binomialMajorityGate(new Array(10).fill(true), 0.05);
    expect(res.publish).toBe(true);
    expect(res.majority).toBe(true);
  });
  it("withholds on a bare 6-4 split at alpha = 0.05", () => {
    const votes = [true, true, true, true, true, true, false, false, false, false];
    const res = binomialMajorityGate(votes, 0.05);
    expect(res.publish).toBe(false);
    expect(res.pValue).toBeGreaterThan(0.05);
  });
  it("publishes a strong 9-1 majority", () => {
    const votes = [true, true, true, true, true, true, true, true, true, false];
    const res = binomialMajorityGate(votes, 0.05);
    expect(res.publish).toBe(true);
  });
  it("handles empty input", () => {
    expect(binomialMajorityGate([], 0.05).publish).toBe(false);
  });
});

describe("agreementGate (1312.3989v1)", () => {
  it("is postable when diverse configs agree and clear the edge", () => {
    const res = agreementGate("home", "home", 0.08, 0.06, 0.05);
    expect(res.postable).toBe(true);
  });
  it("abstains on disagreement", () => {
    const res = agreementGate("home", "away", 0.08, 0.06, 0.05);
    expect(res.postable).toBe(false);
    expect(res.reason).toBe("config-disagreement");
  });
  it("abstains when one side misses the edge threshold", () => {
    const res = agreementGate("home", "home", 0.08, 0.02, 0.05);
    expect(res.postable).toBe(false);
    expect(res.reason).toBe("edge-below-threshold");
  });
});

describe("disagreementNoBet (2001.10623v2)", () => {
  it("publishes when the EW-Brier consensus clears 1 - tau/2", () => {
    // tau = 0.4 => publish iff pStar >= 0.8.
    const res = disagreementNoBet([0.85, 0.84, 0.86], [0.2, 0.22, 0.21], 0.4);
    expect(res.pStar).toBeCloseTo(0.85, 2);
    expect(res.publish).toBe(true);
    expect(res.noBetProb).toBeCloseTo(2 * (1 - res.pStar), 10);
  });
  it("no-bets on a coin-flip consensus", () => {
    const res = disagreementNoBet([0.5, 0.52, 0.48], [0.25, 0.25, 0.25], 0.4);
    expect(res.publish).toBe(false);
    expect(res.noBetProb).toBeCloseTo(1, 2);
  });
  it("weights better-calibrated experts more", () => {
    const res = disagreementNoBet([0.8, 0.5], [0.1, 0.4], 0.4);
    expect(res.pStar).toBeGreaterThan(0.65);
  });
});

describe("crowdsourcedReject (1710.09901v1)", () => {
  it("discounts spammer-like always-pick members", () => {
    const members = [
      { abstentionRate: 0.0, hitRateGivenPick: 0.51, slatePicks: 5 }, // spammer
      { abstentionRate: 0.3, hitRateGivenPick: 0.62, slatePicks: 2 }, // reliable
    ];
    const { aggregate, weights } = crowdsourcedReject(members, [true, false]);
    expect(weights[1]!).toBeGreaterThan(weights[0]!);
    expect(aggregate).toBe(false);
  });
  it("aggregates by reliability-weighted majority", () => {
    const members = [
      { abstentionRate: 0.2, hitRateGivenPick: 0.6, slatePicks: 2 },
      { abstentionRate: 0.2, hitRateGivenPick: 0.6, slatePicks: 2 },
    ];
    expect(crowdsourcedReject(members, [true, true]).aggregate).toBe(true);
  });
  it("handles empty input", () => {
    expect(crowdsourcedReject([], []).aggregate).toBe(false);
  });
});
