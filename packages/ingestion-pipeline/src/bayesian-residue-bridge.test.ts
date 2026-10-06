import { describe, expect, it } from "vitest";
import {
  evalAbcSsm,
  evalAr1Forecast,
  evalArxFit,
  evalGaussCopulaJoint,
  evalHawkesGridFit,
  evalLassoBic,
  evalNmfArchetypes,
  evalOuWinProb,
  evalRidgeFit,
} from "./bayesian-residue-bridge.js";

describe("bayesian-residue-bridge copula + NMF", () => {
  it("evalGaussCopulaJoint returns a joint probability", () => {
    const r = evalGaussCopulaJoint({ p1: 0.5, p2: 0.5, rho: 0.5 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toBeGreaterThan(0);
      expect(r.data).toBeLessThanOrEqual(0.5);
    }
  });

  it("fail-closes on out-of-range rho or p", () => {
    expect(evalGaussCopulaJoint({ p1: 0, p2: 0.5, rho: 0.5 }).ok).toBe(false);
    expect(evalGaussCopulaJoint({ p1: 0.5, p2: 0.5, rho: 1.5 }).ok).toBe(false);
  });

  it("evalNmfArchetypes assigns archetypes and reports ARI", () => {
    // H is (k archetypes x n samples)
    const H = [
      [0.9, 0.8, 0.1, 0.2],
      [0.1, 0.2, 0.9, 0.8],
    ];
    const r = evalNmfArchetypes({
      H,
      truth: [0, 0, 1, 1],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.assignments).toHaveLength(4);
      expect(r.data.randIndex === null || Number.isFinite(r.data.randIndex)).toBe(true);
    }
  });
});

describe("bayesian-residue-bridge sparse-form HMM", () => {
  it("evalLassoBic selects lambda and reports BIC", () => {
    const X = Array.from({ length: 20 }, (_, i) => [1, i * 0.1, (i % 3) * 0.5]);
    const y = X.map((x) => 2 * x[0]! + 0.5 * x[1]! + 0.1 * x[2]! + 0.01);
    const r = evalLassoBic({ X, y, lambdaGrid: [0.01, 0.1, 1.0] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.beta).toHaveLength(3);
      expect(Number.isFinite(r.data.bic)).toBe(true);
    }
  });

  it("fail-closes on misaligned X/y", () => {
    expect(
      evalLassoBic({ X: [[1], [2]], y: [1], lambdaGrid: [0.1] }).ok,
    ).toBe(false);
  });
});

describe("bayesian-residue-bridge workload availability", () => {
  it("evalRidgeFit fits and optionally predicts", () => {
    const X = [
      [1, 0.5],
      [1, 1.0],
      [1, 1.5],
      [1, 2.0],
    ];
    const y = [1, 0, 1, 1];
    const r = evalRidgeFit({ X, y, lambda: 0.1, predict: true });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.beta).toHaveLength(2);
      expect(r.data.predictions).toHaveLength(4);
      expect(r.data.logLoss).not.toBeNull();
    }
  });

  it("evalArxFit fits an ARX model", () => {
    const r = evalArxFit({
      Y: [1, 2, 3, 4, 5, 6],
      Xexog: [[1], [1], [1], [1], [1], [1]],
      p: 1,
      lambda: 0.1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.length).toBeGreaterThan(0);
  });

  it("fail-closes on bad lambda or shape", () => {
    expect(
      evalRidgeFit({ X: [[1]], y: [1], lambda: -1 }).ok,
    ).toBe(false);
    expect(
      evalArxFit({ Y: [1], Xexog: [], p: 1, lambda: 0.1 }).ok,
    ).toBe(false);
  });
});

describe("bayesian-residue-bridge dynamic probit VB", () => {
  it("evalAr1Forecast updates state and forecasts", () => {
    const r = evalAr1Forecast({
      state: { level: 0, variance: 1 } as never,
      observation: 0.5,
      phi: 0.8,
      stateVar: 1,
      obsVar: 0.5,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Number.isFinite(r.data.mean)).toBe(true);
      expect(r.data.variance).toBeGreaterThan(0);
    }
  });

  it("evalOuWinProb returns P(lead stays positive)", () => {
    const r = evalOuWinProb({ lead: 7, theta: 0.5, sigma: 1.5, tRemain: 300 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toBeGreaterThan(0);
      expect(r.data).toBeLessThanOrEqual(1);
    }
  });

  it("fail-closes on bad phi or sigma", () => {
    expect(
      evalAr1Forecast({
        state: { level: 0, variance: 1 } as never,
        observation: 0.5,
        phi: 1.5,
        stateVar: 1,
        obsVar: 0.5,
      }).ok,
    ).toBe(false);
    expect(evalOuWinProb({ lead: 0, theta: 0, sigma: 0, tRemain: 10 }).ok).toBe(false);
  });
});

describe("bayesian-residue-bridge ABC-SSM + Hawkes", () => {
  it("evalAbcSsm simulates seasons and retains the closest draws", () => {
    const r = evalAbcSsm({
      params: { persistence: 0.7, innovSd: 0.5, homeEffect: 2.5, tailDf: 8 },
      nTeams: 6,
      gamesPerTeam: 4,
      observedMargins: [3, -2, 7, 1, -4, 2, 5, -1],
      nParam: 30,
      retainFrac: 0.3,
      seed: 42,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.observedScore).toHaveLength(4);
      expect(r.data.simulatedScores).toHaveLength(30);
      expect(r.data.retainedIndices).toHaveLength(9);
    }
  });

  it("evalHawkesGridFit fits mu/alpha/beta by grid", () => {
    const events = [0.5, 1.2, 1.5, 3.0, 3.2, 5.0, 7.5, 7.6, 7.8, 10.0];
    const r = evalHawkesGridFit({
      events,
      T: 12,
      muGrid: [0.1, 0.3],
      alphaGrid: [0.2, 0.5],
      betaGrid: [1.0, 2.0],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.mu).toBeGreaterThan(0);
      expect(Number.isFinite(r.data.ll)).toBe(true);
    }
  });

  it("fail-closes on empty events or bad retainFrac", () => {
    expect(
      evalAbcSsm({
        params: { persistence: 0.7, innovSd: 0.5, homeEffect: 2.5, tailDf: 8 },
        nTeams: 4,
        gamesPerTeam: 2,
        observedMargins: [1, 2],
        nParam: 10,
        retainFrac: 0.3,
      }).ok,
    ).toBe(false);
    expect(
      evalHawkesGridFit({
        events: [1],
        T: 10,
        muGrid: [0.1],
        alphaGrid: [0.1],
        betaGrid: [1],
      }).ok,
    ).toBe(false);
  });
});
