// Tests for decision/ruin-safety.ts (vitest, globals on).
import { describe, it, expect } from "vitest";
import {
  adjustmentCoefficient,
  payoffAwareRuinGate,
  correlatedRuinProb,
  survivalClamp,
  certifyKellyStake,
  priceGapFlag,
  assertNoProgression,
  certifyMaxBetBound,
} from "./ruin-safety.js";

describe("adjustmentCoefficient", () => {
  it("matches the classic coin-flip ruin exponent", () => {
    // Positive drift: win 1 w.p. 0.55, lose 1 w.p. 0.45.
    // R > 0 solves E[exp(-R X)] = 1: 0.55 e^-R + 0.45 e^R = 1.
    const r = adjustmentCoefficient([
      { value: 1, prob: 0.55 },
      { value: -1, prob: 0.45 },
    ]);
    expect(r).toBeGreaterThan(0);
    const g = 0.55 * Math.exp(-r) + 0.45 * Math.exp(r);
    expect(g).toBeCloseTo(1, 8);
  });
  it("returns 0 for non-positive drift (ruin certain)", () => {
    expect(
      adjustmentCoefficient([
        { value: 1, prob: 0.4 },
        { value: -1, prob: 0.6 },
      ]),
    ).toBe(0);
  });
});

describe("payoffAwareRuinGate (1209.4203)", () => {
  it("passes a well-bankrolled +EV distribution", () => {
    const res = payoffAwareRuinGate(
      [
        { value: 1, prob: 0.6 },
        { value: -1, prob: 0.4 },
      ],
      100,
    );
    expect(res.passes).toBe(true);
    expect(res.pRuin).toBeLessThan(0.01);
  });
  it("fails a thinly-bankrolled distribution", () => {
    const res = payoffAwareRuinGate(
      [
        { value: 1, prob: 0.55 },
        { value: -1, prob: 0.45 },
      ],
      2,
    );
    expect(res.passes).toBe(false);
  });
  it("detects material asymmetry via skewness", () => {
    const res = payoffAwareRuinGate(
      [
        { value: 5, prob: 0.3 },
        { value: -1, prob: 0.7 },
      ],
      50,
    );
    expect(Math.abs(res.skewness)).toBeGreaterThan(0.3);
  });
  it("differs from the symmetric approximation on skewed payoffs", () => {
    // Highly skewed: win 9 w.p. 0.2, lose 1 w.p. 0.8 (mean 1.0).
    const skewed = payoffAwareRuinGate(
      [
        { value: 9, prob: 0.2 },
        { value: -1, prob: 0.8 },
      ],
      10,
    );
    const symmetric = payoffAwareRuinGate(
      [
        { value: 1, prob: 0.6 },
        { value: -1, prob: 0.4 },
      ],
      10,
    );
    // Materially different ruin probabilities (> 25% relative, per the
    // acceptance gate): skewness changes the Lundberg exponent.
    const relDiff =
      Math.abs(skewed.pRuin - symmetric.pRuin) /
      Math.max(symmetric.pRuin, 1e-12);
    expect(relDiff).toBeGreaterThan(0.25);
  });
});

describe("correlatedRuinProb (2501.10302)", () => {
  it("matches i.i.d. ruin when the chain is memoryless", () => {
    // pUpUp = pDownDown = 0.5 -> independent signs.
    const indep = correlatedRuinProb(0.5, 0.5, 1, -1, 10);
    const iid = payoffAwareRuinGate(
      [
        { value: 1, prob: 0.5 },
        { value: -1, prob: 0.5 },
      ],
      10,
    );
    expect(indep.persistence).toBeCloseTo(0, 10);
    expect(indep.pRuin).toBeCloseTo(iid.pRuin, 2);
  });
  it("raises ruin probability under positive persistence", () => {
    // Positive drift (up 1, down -0.5, mean 0.25): sticky streaks
    // raise ruin vs the comparable independent walk.
    const sticky = correlatedRuinProb(0.8, 0.8, 1, -0.5, 10);
    const indep = correlatedRuinProb(0.5, 0.5, 1, -0.5, 10);
    expect(sticky.persistence).toBeGreaterThan(0.2);
    expect(sticky.pRuin).toBeGreaterThan(indep.pRuin);
  });
  it("handles empty bankroll", () => {
    expect(correlatedRuinProb(0.6, 0.6, 1, -1, 0).pRuin).toBe(1);
  });
});

describe("survivalClamp (2004.14048)", () => {
  it("clamps into (-1/Xmax, 1/|Xmin|)", () => {
    expect(survivalClamp(2, 1, -1)).toBeCloseTo(1, 12);
    expect(survivalClamp(-2, 1, -1)).toBeCloseTo(-1, 12);
    expect(survivalClamp(0.5, 1, -1)).toBeCloseTo(0.5, 12);
  });
  it("coin example: worst path keeps V(1) > 0", () => {
    // Stake 0.5 on a fair coin, worst return -1: V = 1 - 0.5 = 0.5 > 0.
    const f = survivalClamp(0.5, 1, -1);
    expect(1 + f * -1).toBeGreaterThan(0);
    // Attempted stake 2 is clamped to 1: V = 0, not negative.
    const f2 = survivalClamp(2, 1, -1);
    expect(1 + f2 * -1).toBeGreaterThanOrEqual(0);
  });
});

describe("certifyKellyStake (2412.14144)", () => {
  it("certifies a positive stake on positive edge", () => {
    const res = certifyKellyStake(0.6, 2.0, 0.2);
    expect(res.certified).toBe(true);
    expect(res.edge).toBeCloseTo(0.1, 10);
  });
  it("rejects a positive stake on negative edge", () => {
    expect(certifyKellyStake(0.4, 2.0, 0.2).certified).toBe(false);
  });
  it("certifies a zero stake on non-positive edge", () => {
    expect(certifyKellyStake(0.4, 2.0, 0).certified).toBe(true);
  });
});

describe("priceGapFlag", () => {
  it("flags wide gaps in low-liquidity tiers only", () => {
    expect(priceGapFlag(0.2, "low")).toBe(true);
    expect(priceGapFlag(0.2, "high")).toBe(false);
    expect(priceGapFlag(0.05, "low")).toBe(false);
  });
});

describe("assertNoProgression (1807.11729)", () => {
  it("rejects loss-chasing progressions", () => {
    const res = assertNoProgression({
      name: "martingale",
      dependsOnRecentLosses: true,
      dependsOnEdge: false,
    });
    expect(res.allowed).toBe(false);
  });
  it("allows edge-conditioned Kelly", () => {
    const res = assertNoProgression({
      name: "fractional-kelly",
      dependsOnRecentLosses: false,
      dependsOnEdge: true,
    });
    expect(res.allowed).toBe(true);
  });
  it("rejects rules that are not edge-conditioned", () => {
    const res = assertNoProgression({
      name: "flat",
      dependsOnRecentLosses: false,
      dependsOnEdge: false,
    });
    expect(res.allowed).toBe(false);
  });
});

describe("certifyMaxBetBound (1807.11729)", () => {
  it("returns a finite bound under the stated assumptions", () => {
    const { bound, assumptionsHold } = certifyMaxBetBound(2, 0.55, 100);
    expect(assumptionsHold).toBe(true);
    expect(bound).not.toBeNull();
    expect(bound as number).toBeGreaterThan(0);
    expect(bound as number).toBeLessThan(2 * 100);
  });
  it("returns null when assumptions are violated", () => {
    expect(certifyMaxBetBound(2, 0, 100).bound).toBeNull();
    expect(certifyMaxBetBound(-1, 0.5, 100).assumptionsHold).toBe(false);
  });
});
