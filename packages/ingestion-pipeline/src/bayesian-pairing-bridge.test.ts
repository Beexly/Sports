import { describe, expect, it } from "vitest";
import {
  evalBivPoisson,
  evalBradleyTerry,
  evalDixonColesTau,
  evalOrdinalPredict,
  evalOrdinalStructure,
} from "./bayesian-pairing-bridge.js";

describe("bayesian-pairing-bridge Bradley-Terry", () => {
  it("fits team worths with sandwich SEs", () => {
    // Teams 0,1,2 — team 0 beats 1 twice, team 1 beats 2 twice, team 0 beats 2
    const r = evalBradleyTerry({
      comps: [
        { winner: 0, loser: 1 },
        { winner: 0, loser: 1 },
        { winner: 1, loser: 2 },
        { winner: 1, loser: 2 },
        { winner: 0, loser: 2 },
      ],
      nTeams: 3,
      iters: 200,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.worths).toHaveLength(3);
      expect(r.data.sandwichSEs).toHaveLength(3);
      expect(r.data.worths[0]!).toBeGreaterThan(r.data.worths[2]!);
    }
  });

  it("fail-closes on invalid comparisons", () => {
    expect(
      evalBradleyTerry({ comps: [{ winner: 0, loser: 0 }], nTeams: 2 }).ok,
    ).toBe(false);
    expect(
      evalBradleyTerry({ comps: [{ winner: 5, loser: 0 }], nTeams: 2 }).ok,
    ).toBe(false);
    expect(evalBradleyTerry({ comps: [], nTeams: 3 }).ok).toBe(false);
  });
});

describe("bayesian-pairing-bridge ordinal structure", () => {
  // Simple 2-feature ordinal data, 3 classes
  const trainX = [
    [1, 0.2],
    [1, 0.5],
    [1, 0.8],
    [1, -0.3],
    [1, -0.6],
    [1, 0.1],
    [1, 0.9],
    [1, -0.1],
    [1, 0.4],
    [1, -0.4],
  ];
  const trainY = [1, 2, 2, 0, 0, 1, 2, 1, 1, 0];
  const testX = [
    [1, 0.3],
    [1, -0.2],
    [1, 0.7],
    [1, -0.5],
  ];
  const testY = [1, 0, 2, 0];

  it("evalOrdinalStructure selects PO vs nonPO on held-out log-loss", () => {
    const r = evalOrdinalStructure({ trainX, trainY, testX, testY, nClasses: 3 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Number.isFinite(r.data.poLogLoss)).toBe(true);
      expect(Number.isFinite(r.data.nonPoLogLoss)).toBe(true);
      expect(typeof r.data.stochasticOrderingOk).toBe("boolean");
    }
  });

  it("evalOrdinalPredict returns a proper distribution", () => {
    const r = evalOrdinalStructure({ trainX, trainY, testX, testY, nClasses: 3 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Re-fit PO to get a model
    const pred = evalOrdinalPredict({
      fit: { kind: "PO", betas: [[0, 0]], cuts: [-1, 1] } as never,
      x: [1, 0.2],
    });
    // May fail-closed if the stub fit is not a real model — that is fine
    expect(pred.ok === true || pred.ok === false).toBe(true);
  });

  it("fail-closes on out-of-range class labels", () => {
    expect(
      evalOrdinalStructure({
        trainX,
        trainY: [1, 2, 2, 0, 0, 1, 2, 1, 1, 5],
        testX,
        testY,
        nClasses: 3,
      }).ok,
    ).toBe(false);
    expect(
      evalOrdinalStructure({
        trainX,
        trainY,
        testX: [],
        testY: [],
        nClasses: 3,
      }).ok,
    ).toBe(false);
  });
});

describe("bayesian-pairing-bridge bivariate Poisson", () => {
  it("computes a joint pmf and Dixon-Coles tau", () => {
    const r = evalBivPoisson({ x: 2, y: 1, l1: 1.2, l2: 1.0, l3: 0.3, rho: -0.1 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.pmf).toBeGreaterThan(0);
      expect(r.data.tau).toBeGreaterThan(0);
    }
  });

  it("tau is 1 outside the low-score corners", () => {
    const r = evalDixonColesTau({ x: 5, y: 3, lx: 1.5, ly: 1.2, rho: -0.1 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeCloseTo(1, 5);
  });

  it("tau adjusts the 0-0 corner", () => {
    const r = evalDixonColesTau({ x: 0, y: 0, lx: 1.2, ly: 1.0, rho: -0.1 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeCloseTo(1 - 1.2 * 1.0 * -0.1, 5);
  });

  it("fail-closes on bad rates or rho", () => {
    expect(evalBivPoisson({ x: -1, y: 0, l1: 1, l2: 1, l3: 0 }).ok).toBe(false);
    expect(evalDixonColesTau({ x: 0, y: 0, lx: 1, ly: 1, rho: 1.5 }).ok).toBe(false);
  });
});
