import { describe, expect, it } from "vitest";
import {
  brierScore,
  saaAggregate,
  saaRegret,
  saaUpdate,
  saaWeights,
} from "./saa-brier-aggregator";

describe("saa-brier-aggregator", () => {
  it("favors the expert with lower cumulative Brier loss", () => {
    const w = saaWeights([0.1, 0.9]);
    expect(w[0]!).toBeGreaterThan(w[1]!);
    expect(w[0]! + w[1]!).toBeCloseTo(1, 12);
    expect(w[0]).toBeCloseTo(Math.exp(-0.1) / (Math.exp(-0.1) + Math.exp(-0.9)), 12);
  });

  it("returns [] for empty input", () => {
    expect(saaWeights([])).toEqual([]);
  });

  it("falls back to uniform on degenerate (all +Inf) losses", () => {
    expect(saaWeights([Infinity, Infinity])).toEqual([0.5, 0.5]);
  });

  it("aggregates as the weighted mean and validates lengths", () => {
    expect(saaAggregate([0.2, 0.8], [0.25, 0.75])).toBeCloseTo(0.65, 12);
    expect(() => saaAggregate([], [])).toThrow("empty");
    expect(() => saaAggregate([0.5], [0.5, 0.5])).toThrow("mismatch");
  });

  it("online update accumulates Brier loss and reweights", () => {
    const losses = [0, 0];
    const { weights } = saaUpdate([0.9, 0.1], 1, losses);
    // expert 1 was nearly perfect, expert 2 nearly wrong
    expect(losses[0]).toBeCloseTo(0.01, 12);
    expect(losses[1]).toBeCloseTo(0.81, 12);
    expect(weights[0]).toBeGreaterThan(0.65); // exp(-0.01)/(exp(-0.01)+exp(-0.81)) ≈ 0.69
  });

  it("regret is non-positive when the aggregate beats the best expert", () => {
    expect(saaRegret(0.15, 0.2)).toBeCloseTo(-0.05, 12);
  });

  it("brierScore rejects out-of-range probabilities", () => {
    expect(() => brierScore(1.5, 1)).toThrow("out of range");
    expect(brierScore(0.7, 1)).toBeCloseTo(0.09, 12);
  });
});
