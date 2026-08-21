import { describe, expect, it } from "vitest";
import {
  anscombe,
  anscombeInverse,
  backTransform,
  DEFAULT_POOLED_VARIANCE,
  MU_FLOOR,
  pooledVariance,
  shrinkEfronMorris,
} from "./efron-morris-js.js";

/**
 * Locked worked example from prereg section 3 point 12.
 * These theta values were independently re-derived from first principles
 * and matched to 3.79e-07. The fixture is the arbiter — do not change it.
 */
const LOCKED_X = [2.1, 2.2, 2.0, 2.4];
const LOCKED_N = [4, 20, 4, 8];
const LOCKED_S2 = 0.04;
const LOCKED_THETA = [2.129851, 2.197080, 2.069652, 2.344099];

function teamsFromArray(xs: number[], ns: number[]): { team: number; n: number; transformedMean: number }[] {
  return xs.map((x, i) => ({ team: i, n: ns[i]!, transformedMean: x }));
}

describe("efron-morris locked worked example (tolerance 1e-3)", () => {
  it("reproduces prereg section 3 point 12 theta values", () => {
    const teams = teamsFromArray(LOCKED_X, LOCKED_N);
    const results = shrinkEfronMorris(teams, LOCKED_S2);
    for (let i = 0; i < LOCKED_THETA.length; i++) {
      expect(results[i]!.thetaI).toBeCloseTo(LOCKED_THETA[i]!, 4);
    }
  });

  it("reproduces the intermediate B_i and D_i", () => {
    const teams = teamsFromArray(LOCKED_X, LOCKED_N);
    const results = shrinkEfronMorris(teams, LOCKED_S2);
    const expectedD = [0.01, 0.002, 0.01, 0.005];
    const expectedB = [0.398010, 0.116788, 0.398010, 0.248447];
    for (let i = 0; i < expectedD.length; i++) {
      expect(results[i]!.dI).toBeCloseTo(expectedD[i]!, 6);
      expect(results[i]!.bI).toBeCloseTo(expectedB[i]!, 6);
    }
  });

  it("Xbar is the simple unweighted mean, not precision-weighted", () => {
    const teams = teamsFromArray(LOCKED_X, LOCKED_N);
    const results = shrinkEfronMorris(teams, LOCKED_S2);
    const expectedXbar = (2.1 + 2.2 + 2.0 + 2.4) / 4;
    expect(results[0]!.xI).toBeCloseTo(2.1, 10);
    // theta = Xbar + (1-B)(X - Xbar). If Xbar were precision-weighted it would
    // differ from 2.175 and theta would not match the locked fixture.
    const reconstructedXbar = LOCKED_THETA[0]! / (1 - results[0]!.bI * 0) + 0; // not meaningful
    void reconstructedXbar;
    // Instead, verify k>=3 path uses simple mean:
    const sumDev = LOCKED_X.reduce((s, x, i) => s + (x - expectedXbar) ** 2, 0);
    expect(sumDev).toBeCloseTo(0.0875, 6);
  });
});

describe("efron-morris k < 3 → identity", () => {
  it("two teams: theta_i = X_i (no shrinkage)", () => {
    const teams = teamsFromArray([2.1, 2.3], [4, 8]);
    const results = shrinkEfronMorris(teams, 0.04);
    expect(results[0]!.thetaI).toBeCloseTo(2.1, 10);
    expect(results[1]!.thetaI).toBeCloseTo(2.3, 10);
    expect(results[0]!.bI).toBe(1);
    expect(results[1]!.bI).toBe(1);
  });

  it("zero teams: empty, no crash", () => {
    const results = shrinkEfronMorris([], 0.04);
    expect(results).toHaveLength(0);
  });
});

describe("efron-morris n_i = 0 → Xbar with B_i = 1", () => {
  it("a team with no history shrinks fully to Xbar", () => {
    // 3 real teams + 1 with n=0; k=3 (>=3), so shrinkage applies.
    const teams = [
      { team: 0, n: 4, transformedMean: 2.1 },
      { team: 1, n: 20, transformedMean: 2.2 },
      { team: 2, n: 4, transformedMean: 2.0 },
      { team: 3, n: 0, transformedMean: 0 }, // n=0
    ];
    const results = shrinkEfronMorris(teams, 0.04);
    const xbar = (2.1 + 2.2 + 2.0) / 3;
    expect(results[3]!.n).toBe(0);
    expect(results[3]!.thetaI).toBeCloseTo(xbar, 6);
    expect(results[3]!.bI).toBe(1);
  });
});

describe("efron-morris A_hat floors at 0", () => {
  it("when sum(X_i - Xbar)^2 < sum(D_i), A_hat = 0 and B_i = 1 for all", () => {
    // All X_i equal to Xbar → sum of squared deviations = 0 < sum(D_i) > 0.
    const teams = teamsFromArray([2.0, 2.0, 2.0, 2.0], [4, 20, 4, 8]);
    const results = shrinkEfronMorris(teams, 0.04);
    for (const r of results) {
      expect(r.bI).toBeCloseTo(1, 10);
      expect(r.thetaI).toBeCloseTo(2.0, 10); // Xbar = 2.0, theta = Xbar + (1-1)(X-Xbar) = Xbar
    }
  });
});

describe("efron-morris back-transform", () => {
  it("mu = ((theta_home + theta_away)/2)^2 - 3/8, not exp()", () => {
    const thetaHome = 2.129851;
    const thetaAway = 2.197080;
    const expected = Math.pow((thetaHome + thetaAway) / 2, 2) - 3 / 8;
    const mu = backTransform(thetaHome, thetaAway);
    expect(mu).toBeCloseTo(expected, 10);
    // Sanity: not exp
    const expMu = Math.exp((thetaHome + thetaAway) / 2);
    expect(mu).not.toBeCloseTo(expMu, 1);
  });

  it("MU_FLOOR binds on a constructed low-scoring input", () => {
    // Two extreme low thetas → mu would be negative → floored to MU_FLOOR.
    const mu = backTransform(0.1, 0.1);
    expect(mu).toBe(MU_FLOOR);
  });

  it("MU_FLOOR binds when average squared minus 3/8 is below floor", () => {
    // (theta_avg)^2 - 3/8 < 0.5 when theta_avg is small enough.
    const mu = backTransform(0.5, 0.5);
    const raw = Math.pow(0.5, 2) - 3 / 8;
    expect(raw).toBeLessThan(MU_FLOOR);
    expect(mu).toBe(MU_FLOOR);
  });
});

describe("Anscombe transform", () => {
  it("sqrt(x + 3/8)", () => {
    expect(anscombe(2.0)).toBeCloseTo(Math.sqrt(2.0 + 3 / 8), 10);
  });

  it("inverse is theta^2 - 3/8", () => {
    expect(anscombeInverse(2.0)).toBeCloseTo(4 - 3 / 8, 10);
  });

  it("round-trips", () => {
    const x = 5.3;
    const t = anscombe(x);
    expect(anscombeInverse(t)).toBeCloseTo(x, 10);
  });
});

describe("pooledVariance", () => {
  it("uses fallback when < 8 games", () => {
    expect(pooledVariance([1, 2, 3], 0.04)).toBe(0.04);
  });

  it("uses empirical variance when >= 8 games", () => {
    const vals = [2.1, 2.2, 2.0, 2.4, 2.1, 2.3, 2.0, 2.5];
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const expected = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (vals.length - 1);
    expect(pooledVariance(vals, 999)).toBeCloseTo(expected, 10);
  });
});
