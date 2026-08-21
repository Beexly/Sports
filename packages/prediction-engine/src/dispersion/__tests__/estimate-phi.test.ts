import { describe, expect, it } from "vitest";
import { drawNb } from "../../research/synthetic-nb";
import {
  estimatePhi,
  impliedVmr,
  MIN_SAMPLES_FOR_DISPERSION,
} from "../estimate-phi";

/**
 * Per-sport dispersion estimation.
 *
 * The headline property: feed it MLB-like data and it recovers φ≈3.7; feed it
 * NHL-like data (VMR≈1.0) and it says "poisson" instead of inventing a φ. That is
 * the mechanism that makes NHL drop to a Poisson tail from evidence rather than
 * from a hardcoded per-sport assumption.
 */

/** Draw n NB2 samples at (mu, phi) using the engine's own sampler. */
function nbSamples(mu: number, phi: number, n: number, seed: number): number[] {
  const rng = { state: seed };
  return Array.from({ length: n }, () => drawNb(rng, mu, phi));
}

/** Draw n Poisson samples via NB2 with a huge phi (VMR -> 1). */
function poissonSamples(mu: number, n: number, seed: number): number[] {
  return nbSamples(mu, 1e9, n, seed);
}

const N = 20_000;

describe("estimatePhi — recovers a known dispersion", () => {
  it("recovers MLB-like phi ~3.74 from data generated at that phi", () => {
    const r = estimatePhi(nbSamples(4.3, 3.74, N, 2026));
    expect(r.verdict).toBe("overdispersed");
    expect(r.phi).not.toBeNull();
    // Method-of-moments is noisy in the tail; ±25% is a fair recovery band.
    expect(r.phi! / 3.74).toBeGreaterThan(0.75);
    expect(r.phi! / 3.74).toBeLessThan(1.25);
    expect(r.vmr).toBeGreaterThan(1.9);
  });

  it("recovers a different phi rather than snapping to one value", () => {
    const low = estimatePhi(nbSamples(4.3, 3.0, N, 11));
    const high = estimatePhi(nbSamples(4.3, 8.0, N, 11));
    expect(low.phi!).toBeLessThan(high.phi!);
    // Higher phi => thinner tail => lower VMR.
    expect(low.vmr).toBeGreaterThan(high.vmr);
  });
});

describe("estimatePhi — the NHL case: says Poisson instead of inventing a phi", () => {
  it("classifies VMR~1.0 data as poisson and returns NO phi", () => {
    const r = estimatePhi(poissonSamples(2.8, N, 7));
    expect(r.verdict).toBe("poisson");
    expect(r.phi).toBeNull();
    expect(r.vmr).toBeGreaterThan(0.95);
    expect(r.vmr).toBeLessThan(1.05);
    expect(r.reason).toMatch(/Poisson tail/i);
  });

  it("does not label mild noise around VMR=1 as overdispersion", () => {
    // Several seeds; none should be called overdispersed.
    for (const seed of [1, 2, 3, 4, 5]) {
      expect(estimatePhi(poissonSamples(4.3, N, seed)).verdict).toBe("poisson");
    }
  });
});

describe("estimatePhi — refuses to guess", () => {
  it("reports insufficient-data below the sample floor", () => {
    const r = estimatePhi(nbSamples(4.3, 3.74, MIN_SAMPLES_FOR_DISPERSION - 1, 5));
    expect(r.verdict).toBe("insufficient-data");
    expect(r.phi).toBeNull();
    expect(r.reason).toContain("sampling noise");
  });

  it("flags under-dispersion instead of forcing a negative or huge phi", () => {
    // Constant data: variance 0, far below the mean.
    const r = estimatePhi(new Array(1000).fill(4));
    expect(r.verdict).toBe("underdispersed");
    expect(r.phi).toBeNull();
    expect(r.reason).toMatch(/cannot represent under-dispersion/i);
  });

  it("handles an all-zero / degenerate sample without dividing by zero", () => {
    const r = estimatePhi(new Array(1000).fill(0));
    expect(r.phi).toBeNull();
    expect(Number.isFinite(r.vmr)).toBe(true);
  });

  it("ignores non-finite and negative entries rather than propagating NaN", () => {
    const good = nbSamples(4.3, 3.74, N, 3);
    const dirty = [...good, NaN, Infinity, -5];
    const r = estimatePhi(dirty);
    expect(r.n).toBe(good.length);
    expect(Number.isFinite(r.phi!)).toBe(true);
  });
});

describe("impliedVmr — inverse of the estimator", () => {
  it("round-trips against estimatePhi", () => {
    const r = estimatePhi(nbSamples(4.3, 3.74, N, 99));
    expect(impliedVmr(r.mean, r.phi!)).toBeCloseTo(r.vmr, 2);
  });

  it("shows why phi=12 was wrong for MLB", () => {
    // The observed MLB VMR is ~2.15; phi=12 implies ~1.36.
    expect(impliedVmr(4.3, 12)).toBeLessThan(1.4);
    expect(impliedVmr(4.3, 3.74)).toBeGreaterThan(2.1);
  });
});
