// Tests for 2603.24704 e-value screening (additive; not wired into any publish path).
import { describe, it, expect } from "vitest";
import {
  eValue,
  eValueThreshold,
  eValueSelect,
  realizedAverageLoss,
  eValueGatePasses,
} from "./2603-24704-evalue-screening.js";

describe("eValue", () => {
  it("grows with the standardized selection score", () => {
    expect(eValue(1.0, 0, 1)).toBeCloseTo(Math.exp(0.5), 10);
    expect(eValue(0, 0, 1)).toBeCloseTo(Math.exp(-0.5), 10);
    expect(eValue(2, 0, 1)).toBeGreaterThan(eValue(1, 0, 1));
  });
});

describe("eValueThreshold", () => {
  it("tightens with larger nominal loss budgets", () => {
    const t1 = eValueThreshold(-0.02, 1);
    const t2 = eValueThreshold(-0.1, 1);
    expect(t1).toBeGreaterThan(t2);
    expect(t1).toBeCloseTo(1 / 1.02, 10);
  });
});

describe("eValueSelect", () => {
  it("keeps picks clearing the threshold", () => {
    expect(eValueSelect([0.5, 2.0, 1.0, 3.0], 1.0)).toEqual([1, 2, 3]);
  });
});

describe("realizedAverageLoss", () => {
  it("negates the mean net return", () => {
    expect(realizedAverageLoss([0.1, -0.2, 0.1])).toBeCloseTo(0, 12);
    expect(realizedAverageLoss([0.1, 0.1])).toBeCloseTo(-0.1, 12);
  });
});

describe("eValueGatePasses", () => {
  it("requires ±0.03 loss control and >=70% volume", () => {
    const ok = eValueGatePasses(
      [-0.01, -0.03, -0.02, -0.04],
      -0.02,
      [70, 75, 72, 74],
      [100, 100, 100, 100],
    );
    expect(ok.passes).toBe(true);
    expect(ok.volumeRatio).toBeCloseTo(0.7275, 8);
    // One season outside ±0.03.
    expect(
      eValueGatePasses([-0.01, -0.08, -0.02, -0.04], -0.02, [70, 75, 72, 74], [100, 100, 100, 100]).passes,
    ).toBe(false);
    // Volume too low.
    expect(
      eValueGatePasses([-0.01, -0.03, -0.02, -0.04], -0.02, [60, 60, 60, 60], [100, 100, 100, 100]).passes,
    ).toBe(false);
  });
});
