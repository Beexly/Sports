import { describe, it, expect } from "vitest";
import {
  gammaP,
  logGamma,
  csgCdf,
  csgPointMassZero,
  csgQuantile,
  csgCrps,
  csgParamsFromEnsemble,
  semiLocalClusterKey,
  crpss,
} from "@/lib/calibration/emos-csg-weather";

// ============================================================
// arXiv 2212.12504v1 — CSG EMOS weather. Additive only.
// ============================================================

describe("CSG EMOS weather — 2212.12504v1", () => {
  it("gammaP matches known values", () => {
    // P(1, x) = 1 - e^-x.
    expect(gammaP(1, 1)).toBeCloseTo(1 - Math.exp(-1), 8);
    expect(gammaP(2, 0)).toBe(0);
  });

  it("logGamma matches known values", () => {
    expect(logGamma(1)).toBeCloseTo(0, 10);
    expect(logGamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 8);
  });

  it("csgCdf has a point mass at zero and tends to 1", () => {
    const p = { k: 2, theta: 1, delta: 0.5 };
    expect(csgCdf(-1, p)).toBe(0);
    expect(csgCdf(0, p)).toBeCloseTo(csgPointMassZero(p), 10);
    expect(csgPointMassZero(p)).toBeGreaterThan(0);
    expect(csgCdf(1e5, p)).toBeCloseTo(1, 6);
  });

  it("csgQuantile inverts csgCdf", () => {
    const p = { k: 2, theta: 1, delta: 0.5 };
    for (const q of [0.1, 0.5, 0.9]) {
      const x = csgQuantile(q, p);
      expect(csgCdf(x, p)).toBeCloseTo(q, 4);
    }
    expect(csgQuantile(0.01, p)).toBe(0); // inside the point mass
  });

  it("csgCrps is non-negative and rewards sharp correct forecasts", () => {
    const p = { k: 4, theta: 0.5, delta: 0.2 };
    const good = csgCrps(1.0, p);
    const bad = csgCrps(8.0, p);
    expect(good).toBeGreaterThanOrEqual(0);
    expect(bad).toBeGreaterThan(good);
  });

  it("csgParamsFromEnsemble links ensemble moments to CSG params", () => {
    const coefs = { a: 0.1, b: 0.9, c: 0.01, d: 0.5, delta: 0.2 };
    const p = csgParamsFromEnsemble(2, 0.5, coefs);
    expect(p.k).toBeGreaterThan(0);
    expect(p.theta).toBeGreaterThan(0);
    expect(p.k * p.theta).toBeCloseTo(0.1 + 0.9 * 2, 8);
  });

  it("semiLocalClusterKey buckets spread", () => {
    expect(semiLocalClusterKey("dome", 0.1)).toBe("dome|spread-bucket-0");
    expect(semiLocalClusterKey("dome", 0.9)).toBe("dome|spread-bucket-2");
    expect(semiLocalClusterKey("cold", 0.9)).not.toBe(semiLocalClusterKey("dome", 0.9));
  });

  it("crpss is 0 for equal skill, positive for better", () => {
    expect(crpss(1, 1)).toBeCloseTo(0, 10);
    expect(crpss(0.8, 1)).toBeCloseTo(0.2, 10);
    expect(crpss(1, 0)).toBe(0);
  });
});
