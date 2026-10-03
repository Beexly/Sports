
import { describe, expect, it } from "vitest";
import {
  twoStepAwareCriticalValue,
  twoStepAwareReject,
  weightDistanceBar,
  weightsDistinguishable,
} from "./two-step-aware-test";

const IDENT2 = [[1, 0], [0, 1]];
const ZEROS2 = [[0, 0], [0, 0]];

describe("two-step-aware-test", () => {
  it("simulates a positive critical value, monotone in alpha", () => {
    const cv05 = twoStepAwareCriticalValue({ mEtaEta: IDENT2, mEtaGamma: ZEROS2, prRatio: 1, draws: 2000, alpha: 0.05, seed: 42 });
    const cv01 = twoStepAwareCriticalValue({ mEtaEta: IDENT2, mEtaGamma: ZEROS2, prRatio: 1, draws: 2000, alpha: 0.01, seed: 42 });
    expect(cv05).toBeGreaterThan(0);
    expect(cv01).toBeGreaterThanOrEqual(cv05);
  });
  it("is deterministic for a fixed seed", () => {
    const o = { mEtaEta: IDENT2, mEtaGamma: ZEROS2, prRatio: 0.5, draws: 500, seed: 9 };
    expect(twoStepAwareCriticalValue(o)).toBe(twoStepAwareCriticalValue(o));
  });
  it("rejects when P*Delta_P exceeds the critical value", () => {
    expect(twoStepAwareReject(10, 3)).toBe(true);
    expect(twoStepAwareReject(1, 3)).toBe(false);
  });
  it("weight-distance bar is T^{-1/4}", () => {
    expect(weightDistanceBar(10000)).toBeCloseTo(0.1, 10);
    expect(() => weightDistanceBar(0)).toThrow();
  });
  it("kills comparisons below the bar", () => {
    expect(weightsDistinguishable([0.5, 0.5], [0.51, 0.49], 270)).toBe(false);
    expect(weightsDistinguishable([0.5, 0.5], [0.9, 0.1], 270)).toBe(true);
  });
  it("throws on singular Mhat", () => {
    expect(() => twoStepAwareCriticalValue({ mEtaEta: [[0, 0], [0, 0]], mEtaGamma: ZEROS2, prRatio: 1, draws: 10 })).toThrow();
  });
});
