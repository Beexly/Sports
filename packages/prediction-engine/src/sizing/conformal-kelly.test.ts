import { describe, expect, it } from "vitest";
import { capBindingFrequency, conformalKellyStake } from "./conformal-kelly";

const params = { fraction: 0.25, perPickCap: 2, grossCap: 10 };

describe("conformal-kelly", () => {
  it("sizes stake as fraction * edge / width^2", () => {
    const r = conformalKellyStake({ edge: 0.08, intervalWidth: 2 }, params);
    expect(r.rawStake).toBeCloseTo((0.25 * 0.08) / 4, 12);
    expect(r.stake).toBeCloseTo((0.25 * 0.08) / 4, 12);
    expect(r.capBound).toBe(false);
  });
  it("shrinks quadratically with interval width", () => {
    const narrow = conformalKellyStake({ edge: 0.08, intervalWidth: 1 }, params);
    const wide = conformalKellyStake({ edge: 0.08, intervalWidth: 2 }, params);
    expect(narrow.stake).toBeCloseTo(4 * wide.stake, 12);
  });
  it("binds the per-pick cap and flags it", () => {
    const r = conformalKellyStake({ edge: 10, intervalWidth: 0.5 }, params);
    expect(r.rawStake).toBeGreaterThan(2);
    expect(r.stake).toBe(2);
    expect(r.capBound).toBe(true);
  });
  it("binds the gross cap", () => {
    const r = conformalKellyStake({ edge: 0.08, intervalWidth: 1 }, params, 9.99);
    expect(r.stake).toBeCloseTo(0.01, 12);
    expect(r.capBound).toBe(true);
  });
  it("stakes zero on non-positive edge or zero width", () => {
    expect(conformalKellyStake({ edge: 0, intervalWidth: 1 }, params).stake).toBe(0);
    expect(conformalKellyStake({ edge: -0.05, intervalWidth: 1 }, params).stake).toBe(0);
    expect(conformalKellyStake({ edge: 0.08, intervalWidth: 0 }, params).stake).toBe(0);
  });
  it("capBindingFrequency measures the gate statistic", () => {
    const rs = [
      conformalKellyStake({ edge: 0.08, intervalWidth: 2 }, params),
      conformalKellyStake({ edge: 10, intervalWidth: 0.5 }, params),
    ];
    expect(capBindingFrequency(rs)).toBeCloseTo(0.5, 12);
    expect(() => capBindingFrequency([])).toThrow();
  });
  it("throws on degenerate inputs", () => {
    expect(() => conformalKellyStake({ edge: 0.1, intervalWidth: 1 }, { ...params, fraction: 0 })).toThrow();
    expect(() => conformalKellyStake({ edge: NaN, intervalWidth: 1 }, params)).toThrow();
  });
});
