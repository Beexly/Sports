// Tests for decision/2002-03448v1-levy-kelly-staking.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  edgeGate,
  fullKellyFraction,
  numericKellyMaximizer,
  deployFraction,
  stakeForSlate,
  logNormalSanityHolds,
  kellyStakePick,
  kellyStakingGatePasses,
} from "./2002-03448v1-levy-kelly-staking.js";

describe("closed-form reproduction (i)-(iii) to 1e-6 (2002.03448v1)", () => {
  it("(i) closed form equals the numeric log-growth maximizer", () => {
    for (const [p, a, b] of [
      [0.6, 1, 1],
      [0.55, 0.91, 1],
      [0.7, 1.5, 1],
    ] as const) {
      expect(fullKellyFraction(p, a, b)).toBeCloseTo(numericKellyMaximizer(p, a, b), 6);
    }
  });
  it("(ii) fractional scaling f_deploy = kappa * f*", () => {
    expect(deployFraction(0.4, 0.25)).toBeCloseTo(0.1, 6 + 4); // 1e-10 precision check below
    expect(deployFraction(0.4, 0.25)).toBe(0.1);
  });
  it("(iii) stake = f_deploy * bankroll", () => {
    expect(stakeForSlate(0.1, 1000)).toBeCloseTo(100, 10);
  });
  it("even-money textbook case: f* = 2p - 1", () => {
    expect(fullKellyFraction(0.6, 1, 1)).toBeCloseTo(0.2, 10);
    expect(fullKellyFraction(0.5, 1, 1)).toBeCloseTo(0, 10);
    expect(fullKellyFraction(0.4, 1, 1)).toBe(0); // clamped
  });
});

describe("edgeGate", () => {
  it("stakes 0 unless E[r] > 0", () => {
    expect(edgeGate(0.05)).toBe(true);
    expect(edgeGate(0)).toBe(false);
    expect(edgeGate(-0.01)).toBe(false);
  });
});

describe("kellyStakePick", () => {
  it("returns 0 stake when the edge gate fails", () => {
    const r = kellyStakePick(0.6, 1, 1, -0.01, 0.05, 0.5, 1000);
    expect(r.stake).toBe(0);
  });
  it("deploys at fractional kappa on a valid pick", () => {
    const r = kellyStakePick(0.6, 1, 1, 0.2, 0.05, 0.5, 1000, 0.25);
    expect(r.fStar).toBeCloseTo(0.2, 10);
    expect(r.fDeploy).toBeCloseTo(0.05, 10);
    expect(r.stake).toBeCloseTo(50, 10);
    expect(r.kappaUsed).toBe(0.25);
  });
  it("forces kappa down when the log-normal sanity gate fails", () => {
    // |mu| = 0.5 >= sigma^2/2 = 0.125 -> fails.
    const r = kellyStakePick(0.6, 1, 1, 0.2, 0.5, 0.5, 1000, 0.25);
    expect(r.sanityHolds).toBe(false);
    expect(r.kappaUsed).toBeCloseTo(0.125, 10);
  });
  it("uses the aggressive kappa when requested", () => {
    const r = kellyStakePick(0.6, 1, 1, 0.2, 0.05, 0.5, 1000, 0.25, 0.5, true);
    expect(r.kappaUsed).toBe(0.5);
  });
});

describe("logNormalSanityHolds", () => {
  it("encodes |mu_hat| < sigma_hat^2 / 2", () => {
    expect(logNormalSanityHolds(0.05, 0.5)).toBe(true); // 0.05 < 0.125
    expect(logNormalSanityHolds(0.2, 0.5)).toBe(false); // 0.2 >= 0.125
  });
});

describe("kellyStakingGatePasses", () => {
  it("requires beating flat on log-wealth with lower max drawdown", () => {
    expect(kellyStakingGatePasses(0.5, 0.3, 0.15, 0.2)).toBe(true);
    expect(kellyStakingGatePasses(0.29, 0.3, 0.15, 0.2)).toBe(false);
    expect(kellyStakingGatePasses(0.5, 0.3, 0.21, 0.2)).toBe(false);
  });
});
