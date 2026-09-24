// Tests for decision/2411-18374-analytic-drawdown-pricer.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  phi,
  drawdownExceedanceProb,
  analyticDrawdownCdf,
  drawupExceedanceProb,
  fitReturnProcess,
  drawdownHardStop,
  monteCarloDrawdownProb,
  jumpDiffusionMonteCarloDrawdownProb,
  drawdownPricerGatePasses,
} from "./2411-18374-analytic-drawdown-pricer.js";

describe("phi (2411.18374)", () => {
  it("matches known normal CDF values", () => {
    expect(phi(0)).toBeCloseTo(0.5, 6);
    expect(phi(1.96)).toBeCloseTo(0.975, 3);
    expect(phi(-1.96)).toBeCloseTo(0.025, 3);
  });
});

describe("drawdownExceedanceProb", () => {
  it("is monotone in depth, horizon, drift, and vol", () => {
    // Deeper barrier -> less likely to be breached.
    expect(drawdownExceedanceProb(0.1, 0.3, 1, 0.1)).toBeGreaterThan(
      drawdownExceedanceProb(0.1, 0.3, 1, 0.3),
    );
    // Longer horizon -> more likely.
    expect(drawdownExceedanceProb(0.1, 0.3, 2, 0.2)).toBeGreaterThan(
      drawdownExceedanceProb(0.1, 0.3, 0.25, 0.2),
    );
    // More positive drift -> less drawdown.
    expect(drawdownExceedanceProb(-0.2, 0.3, 1, 0.2)).toBeGreaterThan(
      drawdownExceedanceProb(0.3, 0.3, 1, 0.2),
    );
    // More vol -> more drawdown.
    expect(drawdownExceedanceProb(0.1, 0.5, 1, 0.2)).toBeGreaterThan(
      drawdownExceedanceProb(0.1, 0.2, 1, 0.2),
    );
  });
  it("is a valid probability; degenerate inputs return 0", () => {
    for (const p of [
      drawdownExceedanceProb(0.1, 0.3, 1, 0.2),
      drawdownExceedanceProb(-0.5, 1, 2, 0.5),
      drawdownExceedanceProb(0, 0.5, 1, 0.3),
    ]) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
    expect(drawdownExceedanceProb(0.1, 0, 1, 0.2)).toBe(0);
    expect(drawdownExceedanceProb(0.1, 0.3, 0, 0.2)).toBe(0);
    expect(drawdownExceedanceProb(0.1, 0.3, -1, 0.2)).toBe(0);
  });
  it("matches the driftless closed-form series", () => {
    // Independent reimplementation of the documented driftless branch:
    // w_n = (n+1/2) pi / h, c_n = 2(-1)^n / (h w_n).
    const driftlessExceedance = (sigma: number, T: number, D: number): number => {
      const h = Math.log(1 / (1 - D)) / sigma;
      let surv = 0;
      for (let n = 0; n < 2000; n++) {
        const w = ((n + 0.5) * Math.PI) / h;
        const term = ((2 * (n % 2 === 0 ? 1 : -1)) / (h * w)) * Math.exp(-((w * w * T) / 2));
        surv += term;
        if (n > 8 && Math.abs(term) < 1e-13) break;
      }
      return 1 - Math.min(Math.max(surv, 0), 1);
    };
    for (const [sigma, T, D] of [
      [0.5, 1, 0.3],
      [0.3, 2, 0.2],
      [1, 0.5, 0.4],
    ] as const) {
      expect(drawdownExceedanceProb(0, sigma, T, D)).toBeCloseTo(
        driftlessExceedance(sigma, T, D),
        10,
      );
    }
  });
  it("is stable in the bound-state regime (positive drift, deep barrier)", () => {
    // mu = 1, sigma = 1, D = 0.7: nu = -1, h = ln(1/0.3) = 1.2 > 1/|nu|,
    // so the bound state is active (this regime returned exactly 0 before
    // the k = 0 root fix).
    const base = drawdownExceedanceProb(1, 1, 1, 0.7);
    expect(base).toBeGreaterThan(0);
    expect(base).toBeLessThan(1);
    // Continuity: small nudges move the price only slightly (no pole blowup).
    for (const [mu, D] of [
      [1.001, 0.7],
      [0.999, 0.7],
      [1, 0.701],
      [1, 0.699],
    ] as const) {
      expect(Math.abs(drawdownExceedanceProb(mu, 1, 1, D) - base)).toBeLessThan(0.01);
    }
    // Agrees with Monte Carlo within simulation tolerance.
    const mc = monteCarloDrawdownProb(1, 1, 1, 0.7, 12000, 1500, 925);
    expect(Math.abs(base - mc) / mc).toBeLessThan(0.15);
  });
});

describe("analyticDrawdownCdf", () => {
  it("is the complement of the exceedance probability", () => {
    expect(analyticDrawdownCdf(0.1, 0.3, 1, 0.2)).toBeCloseTo(
      1 - drawdownExceedanceProb(0.1, 0.3, 1, 0.2),
      12,
    );
    expect(analyticDrawdownCdf(0.1, 0.3, 1, 1)).toBe(1);
    expect(analyticDrawdownCdf(0.1, 0.3, 1, 0)).toBe(0);
  });
});

describe("drawupExceedanceProb", () => {
  it("delegates exactly: drawup(mu) = drawdown(-mu) with the log-matched barrier", () => {
    expect(drawupExceedanceProb(0.15, 0.3, 1, 0.2)).toBeCloseTo(
      drawdownExceedanceProb(-0.15, 0.3, 1, 0.2 / 1.2),
      12,
    );
  });
});

describe("fitReturnProcess / drawdownHardStop", () => {
  it("fits mu/sigma from log-growth history", () => {
    const { mu, sigma } = fitReturnProcess([0.1, 0.12, 0.08, 0.11, 0.09]);
    expect(mu).toBeCloseTo(0.1, 10);
    expect(sigma).toBeGreaterThan(0);
    expect(sigma).toBeLessThan(0.05);
  });
  it("trips the hard stop when drawdown risk exceeds budget", () => {
    // High vol, negative drift: >5% chance of a 20% drawdown over a week.
    expect(drawdownHardStop(-0.5, 1.2, 1 / 52, 0.2, 0.05)).toBe(true);
    // Calm positive drift: no stop.
    expect(drawdownHardStop(2.0, 0.1, 1 / 52, 0.2, 0.05)).toBe(false);
  });
});

describe("analytic vs Monte Carlo (gate cells)", () => {
  it("passes the 5% mean / 10% max gate on the agreement grid", () => {
    const grid: Array<[number, number, number, number, number]> = [
      // mu, sigma, T, D, seed
      [0.05, 0.4, 1, 0.25, 921],
      [0.0, 0.5, 1, 0.3, 922],
      [-0.2, 0.3, 1, 0.2, 923],
      [0.1, 0.3, 1, 0.15, 924],
      [0.3, 0.6, 1, 0.4, 926],
    ];
    const cells = grid.map(([mu, sigma, T, D, seed]) => ({
      analytic: drawdownExceedanceProb(mu, sigma, T, D),
      mc: monteCarloDrawdownProb(mu, sigma, T, D, 12000, 1500, seed),
    }));
    const { passes, meanRelErr, maxRelErr } = drawdownPricerGatePasses(cells);
    expect(passes).toBe(true);
    expect(meanRelErr).toBeLessThanOrEqual(0.05);
    expect(maxRelErr).toBeLessThanOrEqual(0.1);
  });
});

describe("drawdownPricerGatePasses (exact gate behavior)", () => {
  it("passes within tolerance, fails outside, fails on empty", () => {
    expect(
      drawdownPricerGatePasses([
        { analytic: 0.5, mc: 0.51 },
        { analytic: 0.3, mc: 0.29 },
      ]).passes,
    ).toBe(true);
    // One cell beyond 10% relative -> fail.
    expect(
      drawdownPricerGatePasses([
        { analytic: 0.5, mc: 0.51 },
        { analytic: 0.3, mc: 0.4 },
      ]).passes,
    ).toBe(false);
    // Mean beyond 5% with no cell beyond 10% -> fail.
    const r = drawdownPricerGatePasses([
      { analytic: 0.5, mc: 0.53 },
      { analytic: 0.5, mc: 0.53 },
    ]);
    expect(r.passes).toBe(false);
    expect(r.meanRelErr).toBeCloseTo(0.03 / 0.53, 6);
    expect(r.maxRelErr).toBeCloseTo(0.03 / 0.53, 6);
    expect(drawdownPricerGatePasses([]).passes).toBe(false);
  });
  it("handles mc = 0 cells via the near-zero fallback", () => {
    expect(drawdownPricerGatePasses([{ analytic: 0.005, mc: 0 }]).passes).toBe(true);
    expect(drawdownPricerGatePasses([{ analytic: 0.05, mc: 0 }]).passes).toBe(false);
  });
});

describe("jumpDiffusionMonteCarloDrawdownProb", () => {
  it("with lambda = 0 agrees with the diffusion simulator", () => {
    const base = monteCarloDrawdownProb(0.05, 0.4, 1, 0.25, 20000, 800, 909);
    const jd = jumpDiffusionMonteCarloDrawdownProb(
      0.05, 0.4, 1, 0.25, 0, -0.1, 0.05, 20000, 800, 910,
    );
    expect(Math.abs(base - jd)).toBeLessThan(0.03);
  });
  it("downward jumps raise drawdown risk", () => {
    const noJump = jumpDiffusionMonteCarloDrawdownProb(
      0.05, 0.4, 1, 0.25, 0, -0.1, 0.05, 20000, 800, 911,
    );
    const jumps = jumpDiffusionMonteCarloDrawdownProb(
      0.05, 0.4, 1, 0.25, 2, -0.1, 0.05, 20000, 800, 911,
    );
    expect(jumps).toBeGreaterThan(noJump);
  });
});
