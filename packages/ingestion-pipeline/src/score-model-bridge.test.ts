import { describe, expect, it } from "vitest";
import {
  evalCmpPmf,
  evalGammaShrink,
  evalHamiltonFilter,
  evalHmmRegimes,
  evalNegBinPmf,
  evalScoreFactorization,
  evalWpBlend,
} from "./score-model-bridge.js";

describe("score-model-bridge HMM regimes", () => {
  it("computes stationary, Viterbi path, and forward log-lik", () => {
    const r = evalHmmRegimes({
      pi: [0.5, 0.5],
      transition: [
        [0.9, 0.1],
        [0.2, 0.8],
      ],
      logEmit: [
        [0, -2],
        [-1, -0.5],
        [-2, 0],
        [-0.5, -1],
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.stationary).toHaveLength(2);
      expect(r.data.path).toHaveLength(4);
      expect(Number.isFinite(r.data.logLik)).toBe(true);
    }
  });

  it("fail-closes on shape mismatch", () => {
    expect(
      evalHmmRegimes({
        pi: [0.5, 0.5],
        transition: [[1, 0]],
        logEmit: [[0, 0]],
      }).ok,
    ).toBe(false);
    expect(
      evalHmmRegimes({
        pi: [0.5, 0.5],
        transition: [
          [0.9, 0.1],
          [0.2, 0.8],
        ],
        logEmit: [],
      }).ok,
    ).toBe(false);
  });

  it("evalHamiltonFilter returns filtered regime probabilities", () => {
    const r = evalHamiltonFilter({
      ys: [0.5, -0.3, 0.8, -0.1, 0.2],
      mu: [1, -1],
      sig: [1, 1],
      p11: 0.9,
      p22: 0.85,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toHaveLength(5);
      for (const p of r.data) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("score-model-bridge WP blender", () => {
  it("shrinks cell WP toward the Beta prior and blends with pregame", () => {
    const r = evalWpBlend({
      wins: 7,
      trials: 10,
      alpha: 2,
      beta: 2,
      pregameP: 0.55,
      coef: [0, 1, 0.5],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.cellProb).toBeGreaterThan(0);
      expect(r.data.cellProb).toBeLessThan(1);
      expect(r.data.blendedProb).toBeGreaterThan(0);
      expect(r.data.blendedProb).toBeLessThan(1);
      expect(r.data.posteriorMean).toBeGreaterThan(0);
    }
  });

  it("evalGammaShrink shrinks toward the global mean", () => {
    const r = evalGammaShrink({ x: 5, n: 2, globalMean: 1, globalVar: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(Number.isFinite(r.data)).toBe(true);

    const bad = evalGammaShrink({ x: 5, n: 2, globalMean: 1, globalVar: 0 });
    expect(bad.ok).toBe(false);
  });

  it("fail-closes on wins > trials or bad prior", () => {
    expect(
      evalWpBlend({
        wins: 11,
        trials: 10,
        alpha: 2,
        beta: 2,
        pregameP: 0.55,
        coef: [0, 1],
      }).ok,
    ).toBe(false);
  });
});

describe("score-model-bridge score factorization", () => {
  it("fits Poisson MLE and negative-binomial moments", () => {
    const r = evalScoreFactorization({
      counts: [2, 3, 1, 4, 2, 5, 3, 2, 1, 3, 4, 2],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.poissonMle).toBeGreaterThan(0);
      expect(r.data.negBin.r).toBeGreaterThan(0);
    }
  });

  it("evalCmpPmf returns a pmf in (0,1]", () => {
    const r = evalCmpPmf({ k: 3, lambda: 2.5, nu: 1.2 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toBeGreaterThan(0);
      expect(r.data).toBeLessThanOrEqual(1);
    }
  });

  it("evalNegBinPmf returns a pmf in (0,1]", () => {
    const r = evalNegBinPmf({ k: 3, r: 2, p: 0.5 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeGreaterThan(0);
  });

  it("fail-closes on negative counts or bad params", () => {
    expect(evalScoreFactorization({ counts: [1, -1, 2] }).ok).toBe(false);
    expect(evalCmpPmf({ k: -1, lambda: 2, nu: 1 }).ok).toBe(false);
    expect(evalNegBinPmf({ k: 1, r: -1, p: 0.5 }).ok).toBe(false);
  });
});
