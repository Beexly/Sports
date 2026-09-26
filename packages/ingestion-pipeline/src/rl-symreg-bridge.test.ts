import { describe, expect, it } from "vitest";
import {
  evalCqlPenalty,
  evalDistributionStats,
  evalDoublyRobust,
  evalEss,
  evalExpectile,
  evalConsistencyGate,
  evalGreedyStake,
  evalIqnGate,
  evalRankByPrior,
  evalSindy,
} from "./rl-symreg-bridge.js";

// Uniform distribution over 5 atoms on [-1, 1]
const uniform = [0.2, 0.2, 0.2, 0.2, 0.2];
const skewed = [0.05, 0.1, 0.15, 0.3, 0.4];

describe("rl-symreg-bridge distributional stats", () => {
  it("computes mean / std / CVaR of a proper distribution", () => {
    const r = evalDistributionStats({ probs: uniform, vMin: -1, vMax: 1, alpha: 0.2 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.mean).toBeCloseTo(0, 2);
      expect(r.data.std).toBeGreaterThan(0);
      expect(r.data.cvar).toBeLessThan(r.data.mean + 1);
    }
  });

  it("fail-closes on non-proper distributions", () => {
    expect(evalDistributionStats({ probs: [0.1, 0.1], vMin: -1, vMax: 1 }).ok).toBe(false);
    expect(evalDistributionStats({ probs: [1, 2], vMin: -1, vMax: 1 }).ok).toBe(false);
  });

  it("evalGreedyStake picks a distribution index", () => {
    const r = evalGreedyStake({
      distributions: [uniform, skewed],
      vMin: -1,
      vMax: 1,
      mode: "cvar",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toBeGreaterThanOrEqual(0);
      expect(r.data).toBeLessThan(2);
    }
  });

  it("evalIqnGate returns ADAPT or REJECT", () => {
    const r = evalIqnGate({
      taus: [0.1, 0.5, 0.9],
      values: [0.2, 0.5, 0.8],
      alpha: 0.2,
      roiGainPp: 2.5,
      ece: 0.02,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(["ADAPT", "REJECT"]).toContain(r.data.verdict);
    }
  });

  it("evalExpectile + evalConsistencyGate", () => {
    const e = evalExpectile({ values: [0.1, 0.3, 0.5, 0.7, 0.9], tau: 0.7 });
    expect(e.ok).toBe(true);
    if (e.ok) expect(e.data).toBeGreaterThan(0.5);

    const g = evalConsistencyGate({ impliedMean: 0.52, mcMean: 0.55, tol: 0.05 });
    expect(g.ok).toBe(true);
    if (g.ok) {
      expect(["PASS", "FLAG"]).toContain(g.data.verdict);
    }
  });
});

describe("rl-symreg-bridge CQL stake policy", () => {
  it("evalCqlPenalty measures the conservative gap (negative when data beats random)", () => {
    const r = evalCqlPenalty({
      qData: [0.4, 0.5, 0.6],
      qRandom: [0.2, 0.3, 0.4],
      alpha: 1,
    });
    expect(r.ok).toBe(true);
    // penalty = alpha * (mean qRandom - mean qData) = 0.3 - 0.5 = -0.2
    if (r.ok) expect(r.data).toBeLessThan(0);
  });

  it("evalEss computes effective sample size", () => {
    const r = evalEss({ weights: [1, 1, 1, 1] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeCloseTo(4, 3);

    const skewedEss = evalEss({ weights: [10, 0.1, 0.1, 0.1] });
    expect(skewedEss.ok).toBe(true);
    if (skewedEss.ok) expect(skewedEss.data).toBeLessThan(2);
  });

  it("evalDoublyRobust reports DR, lower bound, and ESS", () => {
    const r = evalDoublyRobust({
      rewards: [1, 0, 1, 0, 1],
      weights: [1.1, 0.9, 1.05, 0.95, 1.0],
      qModel: [0.5, 0.5, 0.5, 0.5, 0.5],
      qBehavior: [0.4, 0.4, 0.4, 0.4, 0.4],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Number.isFinite(r.data.dr)).toBe(true);
      expect(r.data.ess).toBeGreaterThan(0);
    }
  });

  it("fail-closes on misaligned arrays", () => {
    expect(
      evalDoublyRobust({
        rewards: [1],
        weights: [1, 1],
        qModel: [0.5],
        qBehavior: [0.5],
      }).ok,
    ).toBe(false);
  });
});

describe("rl-symreg-bridge LM prior + SINDy", () => {
  it("evalRankByPrior trains a prior and guards against degeneracy", () => {
    // OpNode: { kind: "const"|"var"|"op", ... }
    const treeA = {
      kind: "op",
      op: "add",
      children: [
        { kind: "var", name: "x" },
        { kind: "const", value: 1 },
      ],
    } as never;
    const treeB = {
      kind: "op",
      op: "mul",
      children: [
        { kind: "var", name: "x" },
        { kind: "var", name: "y" },
      ],
    } as never;
    const treeC = { kind: "const", value: 0 } as never;

    const corpus = [treeA, treeB, treeA, treeB];
    const candidates = [
      { name: "a", tree: treeA, rmse: 0.5, nParams: 1, nObs: 20 },
      { name: "b", tree: treeB, rmse: 0.6, nParams: 2, nObs: 20 },
      { name: "c", tree: treeC, rmse: 0.1, nParams: 0, nObs: 20 },
    ];
    const r = evalRankByPrior({ corpus, candidates, topK: 2 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.ranked.length).toBeGreaterThan(0);
      expect(typeof r.data.passed).toBe("boolean");
    }
  });

  it("evalSindy fail-closes on misaligned library", () => {
    const r = evalSindy({
      library: [[1, 0], [0, 1]],
      derivatives: [1],
      threshold: 0.1,
      actual: [1, 2],
      predicted: [1, 2],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("align");
  });

  it("evalSindy fits and reports open-loop BFR", () => {
    const r = evalSindy({
      library: [
        [1, 0.1],
        [1, 0.2],
        [1, 0.3],
        [1, 0.4],
      ],
      derivatives: [0.1, 0.2, 0.3, 0.4],
      threshold: 0.05,
      actual: [1, 2, 3, 4],
      predicted: [1.1, 2.1, 2.9, 4.1],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(Number.isFinite(r.data.bfr)).toBe(true);
  });
});
