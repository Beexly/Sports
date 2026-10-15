/**
 * Characterization tests — PE-048 totals abstention sigma (gate-sweep
 * batch 1, 2026-10-15). Pins the boundary/empty-input contracts the
 * co-located test does not cover. The module's `mu` parameters are a
 * generic regression mean supplied by a caller (none exists); the module
 * contains no spread_line reference and derives nothing from market
 * lines — sign-convention audit: no μ contact.
 * Registry: intelligence/gate-wiring/shadow-registry.json (weight 0).
 */
import { describe, expect, it } from "vitest";
import {
  ENABLED,
  gaussianNll,
  kappaFromSigma,
  pidAbstentionStep,
  recalibrateTau,
  sigmaCalibration,
  totalsAbstentionGatePasses,
  totalsPublishRule,
} from "./2104-08236v1-totals-abstention-sigma.js";

describe("PE-048 — flag and publish-rule boundary", () => {
  it("pins ENABLED === false (module ships disabled)", () => {
    expect(ENABLED).toBe(false);
  });

  it("totalsPublishRule is inclusive at sigma === tau", () => {
    expect(totalsPublishRule(10, 10)).toBe(true);
    expect(totalsPublishRule(10.0001, 10)).toBe(false);
    expect(totalsPublishRule(9.9999, 10)).toBe(true);
  });
});

describe("PE-048 — empty-input and numeric-floor contracts", () => {
  it("kappaFromSigma([]) defaults to 1", () => {
    expect(kappaFromSigma([])).toBe(1);
  });

  it("recalibrateTau([]) returns Infinity (publish nothing)", () => {
    expect(recalibrateTau([], 0.8)).toBe(Infinity);
  });

  it("sigmaCalibration of no rows returns the neutral { mean: 0, std: 1 }", () => {
    expect(sigmaCalibration([], [], [])).toEqual({ mean: 0, std: 1 });
  });

  it("gaussianNll floors sigma at 1e-6 so sigma = 0 stays finite", () => {
    const v = gaussianNll(5, 5, 0);
    expect(Number.isFinite(v)).toBe(true);
    // 0.5*0 + log(1e-6) + 0.5*log(2*pi) = -12.8966...
    expect(v).toBeCloseTo(-12.8966, 3);
  });
});

describe("PE-048 — controller and gate boundaries", () => {
  it("pidAbstentionStep never lets alpha fall below the 0.01 floor", () => {
    const { alpha } = pidAbstentionStep(
      { integral: 0, prevError: 0 },
      1, // observed abstention rate
      0, // target rate -> maximally negative error
      0.01,
    );
    expect(alpha).toBe(0.01);
  });

  it("gate passes at exactly the 0.5-point MAE gap with z edges inclusive", () => {
    expect(totalsAbstentionGatePasses(10, 9.5, 0.2, 1.2)).toBe(true);
    expect(totalsAbstentionGatePasses(10, 9.5, -0.2, 0.8)).toBe(true);
  });

  it("gate fails just outside the calibration band even with a large MAE gap", () => {
    expect(totalsAbstentionGatePasses(10, 9.0, 0.21, 1.0)).toBe(false);
    expect(totalsAbstentionGatePasses(10, 9.0, 0, 0.79)).toBe(false);
  });

  it("gate fails when neither the absolute nor the relative MAE bar is met", () => {
    expect(totalsAbstentionGatePasses(10, 9.9, 0, 1)).toBe(false);
  });
});
