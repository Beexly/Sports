import { describe, expect, it } from "vitest";
import {
  DISPERSION_BAYESIAN_ADAPTERS,
  estimatePhiAdapter,
  gaussCopulaJointAdapter,
  hierarchicalGateAdapter,
  impliedVmrAdapter,
  normalCdfAdapter,
  shrinkEstimateAdapter,
  varianceComponentsAdapter,
} from "./dispersion-bayesian-adapters.js";
import { isFailClosed, isObservation } from "./universal-adapter.js";

describe("dispersion-bayesian-adapters registry", () => {
  it("exposes every adapter", () => {
    expect(Object.keys(DISPERSION_BAYESIAN_ADAPTERS).sort()).toEqual([
      "estimatePhi",
      "gaussCopulaJoint",
      "hierarchicalGate",
      "impliedVmr",
      "normalCdf",
      "shrinkEstimate",
      "varianceComponents",
    ]);
  });
});

describe("estimatePhiAdapter", () => {
  it("estimates dispersion from samples", () => {
    // Overdispersed sample: variance >> mean
    const samples = [0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 20, 20];
    const r = estimatePhiAdapter({ samples });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(r.raw!.n).toBe(12);
  });

  it("fails closed on too-few samples", () => {
    expect(isFailClosed(estimatePhiAdapter({ samples: [1] }))).toBe(true);
    expect(isFailClosed(estimatePhiAdapter(null))).toBe(true);
  });
});

describe("impliedVmrAdapter", () => {
  it("computes 1 + mean/phi", () => {
    const r = impliedVmrAdapter({ mean: 2, phi: 1.5 });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(r.value as number).toBeCloseTo(1 + 2 / 1.5, 5);
  });

  it("fails closed on negative mean", () => {
    expect(isFailClosed(impliedVmrAdapter({ mean: -1, phi: 1 }))).toBe(true);
  });
});

describe("shrinkEstimateAdapter", () => {
  it("shrinks toward the group mean", () => {
    // x=10, groupMean=5, varWithin=1, varBetween=1 → B=0.5 → 0.5*5+0.5*10=7.5
    const r = shrinkEstimateAdapter({
      x: 10,
      groupMean: 5,
      varWithin: 1,
      varBetween: 1,
    });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(r.value as number).toBeCloseTo(7.5, 5);
  });

  it("fails closed on negative variances", () => {
    expect(
      isFailClosed(
        shrinkEstimateAdapter({ x: 1, groupMean: 1, varWithin: -1, varBetween: 1 }),
      ),
    ).toBe(true);
    expect(isFailClosed(shrinkEstimateAdapter(null))).toBe(true);
  });
});

describe("varianceComponentsAdapter", () => {
  it("fits within/between variance components", () => {
    const r = varianceComponentsAdapter({
      groups: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
    });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.raw!.varBetween).toBeGreaterThan(0);
      expect(r.raw!.varWithin).toBeGreaterThan(0);
    }
  });

  it("fails closed on too-few groups", () => {
    expect(isFailClosed(varianceComponentsAdapter({ groups: [[1]] }))).toBe(true);
    expect(isFailClosed(varianceComponentsAdapter(null))).toBe(true);
  });
});

describe("hierarchicalGateAdapter", () => {
  it("returns ADAPT or REJECT", () => {
    const r = hierarchicalGateAdapter({
      brierGain: 0.01,
      phi: 1.2,
      phiPosteriorMass: 0.9,
    });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) expect(["ADAPT", "REJECT"]).toContain(r.value);
  });

  it("fails closed on bad posterior mass", () => {
    expect(
      isFailClosed(
        hierarchicalGateAdapter({ brierGain: 0, phi: 1, phiPosteriorMass: 1.5 }),
      ),
    ).toBe(true);
    expect(isFailClosed(hierarchicalGateAdapter(null))).toBe(true);
  });
});

describe("gaussCopulaJointAdapter / normalCdfAdapter", () => {
  it("computes joint probability under a Gaussian copula", () => {
    const r = gaussCopulaJointAdapter({ p1: 0.5, p2: 0.5, rho: 0.5 });
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value as number).toBeGreaterThan(0);
      expect(r.value as number).toBeLessThanOrEqual(0.5);
    }
  });

  it("fails closed on out-of-range inputs", () => {
    expect(isFailClosed(gaussCopulaJointAdapter({ p1: 0, p2: 0.5, rho: 0.5 }))).toBe(true);
    expect(isFailClosed(gaussCopulaJointAdapter({ p1: 0.5, p2: 0.5, rho: 1.5 }))).toBe(true);
  });

  it("normalCdf is symmetric and standard", () => {
    const z = normalCdfAdapter({ x: 0 });
    expect(isObservation(z)).toBe(true);
    if (isObservation(z)) expect(z.value as number).toBeCloseTo(0.5, 5);

    const one = normalCdfAdapter({ x: 1.96 });
    if (isObservation(one)) expect(one.value as number).toBeCloseTo(0.975, 2);

    expect(isFailClosed(normalCdfAdapter({ x: Number.NaN }))).toBe(true);
    expect(isFailClosed(normalCdfAdapter(null))).toBe(true);
  });
});
