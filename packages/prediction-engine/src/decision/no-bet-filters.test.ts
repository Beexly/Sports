// Tests for decision/no-bet-filters.ts (vitest, globals on).
import { describe, it, expect } from "vitest";
import {
  uncertaintySortedPublish,
  volumeGovernor,
  marginalGainFilter,
  saerensEmBaseRate,
  committedScheduleGate,
  adaptiveGapDiagnostic,
  selectiveRankGate,
  mcVarianceDeferral,
  stressAbstention,
  confidenceGateCheck,
  cqrVarianceGate,
  pairwiseRankAbstention,
} from "./no-bet-filters.js";

describe("uncertaintySortedPublish (1904.09235v2)", () => {
  it("publishes the least-uncertain games up to the abstention-cost tradeoff", () => {
    // u = [0.2, 1.0, 0.8], penalty (abstention cost) = 0.45:
    // L(0)=1.35, L(1)=1.0, L(2)=0.95, L(3)=1.0 -> d=2.
    const { publish, d } = uncertaintySortedPublish([0.9, 0.5, 0.6], 0.45);
    expect(publish[0]).toBe(true); // u = 0.2, most certain
    expect(publish[1]).toBe(false); // u = 1.0, coin flip
    expect(publish[2]).toBe(true); // u = 0.8
    expect(d).toBe(2);
  });
  it("abstains on everything when abstention is nearly free", () => {
    // penalty = 0.001: L(0)=0.002 < L(1)=0.101 -> d=0.
    const { d } = uncertaintySortedPublish([0.9, 0.6], 0.001);
    expect(d).toBe(0);
  });
  it("handles empty input", () => {
    expect(uncertaintySortedPublish([], 0.01).d).toBe(0);
  });
});

describe("volumeGovernor (1905.09561v1)", () => {
  it("skips the delta-quantile most ambiguous games", () => {
    const { publish, achievedSkipRate } = volumeGovernor([0.9, 0.8, 0.51, 0.49], 0.25);
    expect(achievedSkipRate).toBeCloseTo(0.25, 10);
    expect(publish.filter(Boolean).length).toBe(3);
  });
  it("handles empty input", () => {
    expect(volumeGovernor([], 0.2).achievedSkipRate).toBe(0);
  });
});

describe("marginalGainFilter (1802.07024v5)", () => {
  it("publishes the top (1-k) fraction by marginal gain", () => {
    const { publish, abstained } = marginalGainFilter([0.1, 0.5, 0.3, 0.9, 0.2], 0.4);
    expect(publish.filter(Boolean).length).toBe(3);
    expect(abstained).toBe(2);
    expect(publish[3]).toBe(true); // gain 0.9 kept
    expect(publish[0]).toBe(false); // gain 0.1 dropped
  });
  it("handles empty input", () => {
    expect(marginalGainFilter([], 0.2).abstained).toBe(0);
  });
});

describe("saerensEmBaseRate", () => {
  it("recovers an elevated base rate from confident probs", () => {
    const prior = saerensEmBaseRate(new Array(20).fill(0.8), 0.5);
    expect(prior).toBeGreaterThan(0.7);
  });
  it("stays near 0.5 on coin-flip probs", () => {
    const prior = saerensEmBaseRate(new Array(20).fill(0.5), 0.5);
    expect(prior).toBeCloseTo(0.5, 6);
  });
  it("handles empty input", () => {
    expect(saerensEmBaseRate([], 0.6)).toBeCloseTo(0.6, 10);
  });
});

describe("committedScheduleGate (1902.04256)", () => {
  it("returns the pre-committed fraction for the week", () => {
    const schedule = [
      { week: 1, publishFraction: 1 },
      { week: 2, publishFraction: 0.5 },
    ];
    expect(committedScheduleGate(2, schedule)).toBe(0.5);
    expect(committedScheduleGate(9, schedule)).toBe(1);
  });
  it("adaptiveGapDiagnostic is positive when adaptive wins", () => {
    expect(adaptiveGapDiagnostic(0.4, 0.3)).toBeCloseTo(0.1, 10);
  });
});

describe("selectiveRankGate (2206.09034v4)", () => {
  it("publishes the top-c fraction by max prob", () => {
    const { publish } = selectiveRankGate([0.9, 0.6, 0.75, 0.55], 0.5);
    expect(publish.filter(Boolean).length).toBe(2);
    expect(publish[0]).toBe(true);
    expect(publish[2]).toBe(true);
  });
  it("audits subgroup coverage", () => {
    const { subgroupCoverage } = selectiveRankGate(
      [0.9, 0.6, 0.75, 0.55],
      0.5,
      ["div", "div", "nondiv", "nondiv"],
    );
    expect(subgroupCoverage["div"]).toBeCloseTo(0.5, 10);
    expect(subgroupCoverage["nondiv"]).toBeCloseTo(0.5, 10);
  });
});

describe("mcVarianceDeferral (2509.21514v4)", () => {
  it("defers the most uncertain fraction to hit coverage", () => {
    const { publish, deferred } = mcVarianceDeferral([0.5, 0.01, 0.02, 0.9], 0.5);
    expect(deferred).toBe(2);
    expect(publish[1]).toBe(true);
    expect(publish[2]).toBe(true);
    expect(publish[0]).toBe(false);
    expect(publish[3]).toBe(false);
  });
});

describe("stressAbstention (2510.13327)", () => {
  it("finds k* where edge turns negative and flags elevated moves", () => {
    const edgeAtMove = (k: number) => 0.05 - 0.1 * k;
    const res = stressAbstention(edgeAtMove, 0.8);
    expect(res.kStar).not.toBeNull();
    expect(res.kStar as number).toBeGreaterThan(0.4);
    expect(res.kStar as number).toBeLessThan(0.6);
    expect(res.elevatedGate).toBe(true);
  });
  it("returns null k* when edge survives the sweep", () => {
    const res = stressAbstention(() => 0.05, 0.5);
    expect(res.kStar).toBeNull();
    expect(res.elevatedGate).toBe(false);
  });
});

describe("confidenceGateCheck (2603.09947v1)", () => {
  it("passes C1/C2 on monotone bins", () => {
    const res = confidenceGateCheck([
      { meanScore: 0.55, accuracy: 0.52, n: 100 },
      { meanScore: 0.65, accuracy: 0.62, n: 100 },
      { meanScore: 0.75, accuracy: 0.72, n: 100 },
    ]);
    expect(res.c1Pass).toBe(true);
    expect(res.c2Pass).toBe(true);
    expect(res.inversions).toBe(0);
  });
  it("flags a bin-wise inversion (C2 kill)", () => {
    const res = confidenceGateCheck([
      { meanScore: 0.55, accuracy: 0.7, n: 100 },
      { meanScore: 0.65, accuracy: 0.5, n: 100 },
    ]);
    expect(res.c2Pass).toBe(false);
    expect(res.inversions).toBe(1);
  });
  it("fails C1 on anti-correlated scores", () => {
    const res = confidenceGateCheck([
      { meanScore: 0.55, accuracy: 0.8, n: 100 },
      { meanScore: 0.75, accuracy: 0.4, n: 100 },
    ]);
    expect(res.c1Pass).toBe(false);
  });
});

describe("cqrVarianceGate (2006.16597v2)", () => {
  it("no-bets games above the (1-epsilon)-quantile width", () => {
    const { publish, achievedRejection } = cqrVarianceGate([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.3);
    expect(achievedRejection).toBeCloseTo(0.3, 1);
    expect(publish.filter(Boolean).length).toBeLessThan(10);
    expect(publish[9]).toBe(false); // widest interval rejected
    expect(publish[0]).toBe(true);
  });
  it("handles empty input", () => {
    expect(cqrVarianceGate([], 0.3).achievedRejection).toBe(0);
  });
});

describe("pairwiseRankAbstention (2307.02035v1)", () => {
  it("abstains when the pair is too close to call", () => {
    expect(pairwiseRankAbstention(0.01, 0.1, 0.05, 0.9).abstain).toBe(true);
    expect(pairwiseRankAbstention(0.01, 0.1, 0.05, 0.9).reason).toBe("too-close");
  });
  it("abstains on high uncertainty", () => {
    expect(pairwiseRankAbstention(0.5, 0.95, 0.05, 0.9).reason).toBe("uncertain");
  });
  it("ranks when both criteria clear", () => {
    expect(pairwiseRankAbstention(0.5, 0.1, 0.05, 0.9).abstain).toBe(false);
  });
});
