import { describe, expect, it } from "vitest";
import {
  evalC51Project,
  evalCfcql,
  evalOptimalStopping,
  evalRegimeKey,
  evalRiskPriceUpdate,
  evalSinkhornStaking,
  evalThinRegimeRetrieval,
} from "./rl-residue-bridge.js";

describe("rl-residue-bridge optimal stopping", () => {
  it("backward-induction stops when reward beats discounted wait", () => {
    const r = evalOptimalStopping({
      immediateReward: [1, 3, 2, 5],
      waitValue: [2, 2, 2, 0],
      discount: 0.9,
      bestLine: 2.1,
      takenLine: 1.9,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.value).toHaveLength(4);
      expect(r.data.stopAt).toHaveLength(4);
      // Terminal is always forced-stop
      expect(r.data.stopAt[3]).toBe(true);
      expect(r.data.clvRegret).toBeCloseTo(0.2, 5);
    }
  });

  it("fail-closes on misaligned or non-finite inputs", () => {
    expect(
      evalOptimalStopping({ immediateReward: [1], waitValue: [1, 2], discount: 0.9 }).ok,
    ).toBe(false);
    expect(
      evalOptimalStopping({ immediateReward: [1], waitValue: [1], discount: 0 }).ok,
    ).toBe(false);
    expect(
      evalOptimalStopping({ immediateReward: [Number.NaN], waitValue: [1], discount: 0.9 }).ok,
    ).toBe(false);
  });

  it("evalC51Project projects onto a categorical support", () => {
    const r = evalC51Project({
      support: [0, 1, 2, 3, 4],
      probs: [0.1, 0.2, 0.4, 0.2, 0.1],
      r: 1,
      gamma: 0.95,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toHaveLength(5);
      const sum = r.data.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 4);
    }
  });

  it("evalC51Project fail-closes on bad gamma or shape", () => {
    expect(
      evalC51Project({ support: [0, 1], probs: [0.5], r: 1, gamma: 0.9 }).ok,
    ).toBe(false);
    expect(
      evalC51Project({ support: [0, 1], probs: [0.5, 0.5], r: 1, gamma: 0 }).ok,
    ).toBe(false);
  });
});

describe("rl-residue-bridge Sinkhorn staking", () => {
  it("computes Wasserstein, transport cost, and scalarized return", () => {
    const r = evalSinkhornStaking({
      xs: [1, 2, 3, 4],
      ys: [2, 3, 4, 5],
      eps: 0.5,
      sample: [1.2, 0.3, 0.05],
      riskPrice: 0.4,
      clvWeight: 1.5,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.wasserstein).toBeGreaterThan(0);
      expect(r.data.transportCost).toBeGreaterThan(0);
      // 1.2 - 0.4*0.3 + 1.5*0.05 = 1.2 - 0.12 + 0.075 = 1.155
      expect(r.data.scalarized).toBeCloseTo(1.155, 4);
    }
  });

  it("evalRiskPriceUpdate returns updated weights", () => {
    const r = evalRiskPriceUpdate({
      weights: [1, 1, 1],
      priceGrid: [0.1, 0.2, 0.3],
      realizedSharpes: [
        [0.5, 0.6, 0.4],
        [0.7, 0.3, 0.5],
        [0.2, 0.4, 0.6],
      ],
      eta: 0.1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toHaveLength(3);
      const sum = r.data.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 4);
    }
  });

  it("fail-closes on bad eps or sample shape", () => {
    expect(
      evalSinkhornStaking({
        xs: [1],
        ys: [2],
        eps: 0,
        sample: [1, 1, 1],
        riskPrice: 0.5,
        clvWeight: 1,
      }).ok,
    ).toBe(false);
  });
});

describe("rl-residue-bridge CFCQL", () => {
  it("penalizes Q-deviation and checks the lower bound", () => {
    const r = evalCfcql({
      qDeviate: 1.2,
      qHistorical: 0.8,
      tdError: 0.3,
      nBets: 4,
      baseLambda: 0.8,
      historicalReturn: 1.0,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.lambda).toBeCloseTo(0.2, 5);
      expect(r.data.penalty).toBeCloseTo(0.2 * 0.4, 5);
      expect(typeof r.data.lowerBoundHolds).toBe("boolean");
    }
  });

  it("fail-closes on nBets < 1 or negative lambda", () => {
    expect(
      evalCfcql({
        qDeviate: 1,
        qHistorical: 0,
        tdError: 0,
        nBets: 0,
        baseLambda: 1,
        historicalReturn: 0,
      }).ok,
    ).toBe(false);
    expect(
      evalCfcql({
        qDeviate: 1,
        qHistorical: 0,
        tdError: 0,
        nBets: 2,
        baseLambda: -1,
        historicalReturn: 0,
      }).ok,
    ).toBe(false);
  });
});

describe("rl-residue-bridge thin-regime retrieval", () => {
  it("fits a power law, flags thin regimes, retrieves neighbors", () => {
    const r = evalThinRegimeRetrieval({
      counts: [100, 40, 15, 8, 5, 3, 2, 1],
      minSamples: 10,
      query: [0.5, 0.3],
      auxPool: [
        { s: [0.5, 0.3] },
        { s: [0.1, 0.2] },
        { s: [0.9, 0.8] },
        { s: [0.55, 0.35] },
      ],
      k: 2,
      main: [{ s: [0.1, 0.1] }, { s: [0.2, 0.2] }],
      upweight: 2,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Number.isFinite(r.data.powerLaw.alpha)).toBe(true);
      expect(r.data.thinRegimes.length).toBeGreaterThan(0);
      expect(r.data.neighbors).toHaveLength(2);
      expect(r.data.batch.transitions.length).toBe(4);
    }
  });

  it("evalRegimeKey bins features into a stable key", () => {
    const r = evalRegimeKey({ features: [0.5, 1.2, -0.3], bins: [0.25, 0.5, 0.1] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(typeof r.data).toBe("string");
  });

  it("fail-closes on empty inputs", () => {
    expect(
      evalThinRegimeRetrieval({
        counts: [],
        query: [1],
        auxPool: [{ s: [1] }],
        main: [{ s: [1] }],
      }).ok,
    ).toBe(false);
    expect(evalRegimeKey({ features: [1], bins: [1, 2] }).ok).toBe(false);
  });
});
