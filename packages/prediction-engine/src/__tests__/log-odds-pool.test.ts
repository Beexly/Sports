import { describe, it, expect } from "vitest";
import {
  logOddsPool,
  logitClamped,
  logistic,
  isFiniteUnit,
} from "../edge-lab/features/log-odds-pool.js";

const m = (source: string, prob: number, weight?: number) => ({ source, prob, weight });

describe("logitClamped / logistic roundtrip", () => {
  it("roundtrips interior probabilities", () => {
    for (const p of [0.01, 0.25, 0.5, 0.75, 0.99]) {
      expect(logistic(logitClamped(p))).toBeCloseTo(p, 10);
    }
  });

  it("keeps 0 and 1 finite (clamped, never ±Infinity)", () => {
    expect(Number.isFinite(logitClamped(0))).toBe(true);
    expect(Number.isFinite(logitClamped(1))).toBe(true);
  });
});

describe("isFiniteUnit", () => {
  it("accepts finite unit interval, rejects NaN/Inf/out-of-range", () => {
    expect(isFiniteUnit(0.5)).toBe(true);
    expect(isFiniteUnit(0)).toBe(true);
    expect(isFiniteUnit(1)).toBe(true);
    expect(isFiniteUnit(NaN)).toBe(false);
    expect(isFiniteUnit(Infinity)).toBe(false);
    expect(isFiniteUnit(-0.1)).toBe(false);
    expect(isFiniteUnit(1.1)).toBe(false);
    expect(isFiniteUnit("0.5" as unknown)).toBe(false);
  });
});

describe("logOddsPool", () => {
  it("geometric mean of odds more extreme than arithmetic mean for same-side probs", () => {
    const r = logOddsPool([m("a", 0.55), m("b", 0.7)], 1);
    // log-odds pooling is pulled toward extremes vs arithmetic mean
    expect(r.geometricMeanOfOdds).toBeGreaterThan(r.arithmeticMean);
    expect(r.arithmeticMean).toBeCloseTo(0.625, 10);
  });

  it("symmetric probs around 0.5 pool to exactly 0.5 under both methods", () => {
    const r = logOddsPool([m("a", 0.2), m("b", 0.8)], 1);
    expect(r.geometricMeanOfOdds).toBeCloseTo(0.5, 10);
    expect(r.arithmeticMean).toBeCloseTo(0.5, 10);
  });

  it("matches arithmetic mean when all members agree", () => {
    const r = logOddsPool([m("a", 0.6), m("b", 0.6), m("c", 0.6)], 1);
    expect(r.geometricMeanOfOdds).toBeCloseTo(0.6, 10);
    expect(r.extremized).not.toBeNaN();
  });

  it("extremization exponent > 1 pushes away from 0.5, < 1 shrinks toward it", () => {
    const members = [m("a", 0.7), m("b", 0.75), m("c", 0.65)];
    const up = logOddsPool(members, 1.4);
    const base = logOddsPool(members, 1);
    const down = logOddsPool(members, 0.7);
    expect(up.extremized).toBeGreaterThan(base.geometricMeanOfOdds);
    expect(down.extremized).toBeLessThan(base.geometricMeanOfOdds);
    expect(base.extremized).toBeCloseTo(base.geometricMeanOfOdds, 12);
  });

  it("respects weights: a heavy source drags the pool", () => {
    const r = logOddsPool([m("a", 0.9, 10), m("b", 0.3, 1)], 1);
    expect(r.geometricMeanOfOdds).toBeGreaterThan(0.7);
  });

  it("drops non-finite/out-of-range members fail-closed style, never imputes", () => {
    const r = logOddsPool([m("good", 0.5), m("nan", NaN), m("hi", 1.5), m("neg", -0.1), m("zeroW", 0.9, 0)], 1);
    expect(r.n).toBe(1);
    expect([...r.dropped].sort()).toEqual(["hi", "nan", "neg", "zeroW"]);
  });

  it("throws on empty input, all-dropped input, or bad exponent", () => {
    expect(() => logOddsPool([], 1)).toThrow();
    expect(() => logOddsPool([m("bad", NaN)], 1)).toThrow();
    expect(() => logOddsPool([m("a", 0.5)], 0)).toThrow();
    expect(() => logOddsPool([m("a", 0.5)], -2)).toThrow();
    expect(() => logOddsPool([m("a", 0.5)], NaN)).toThrow();
  });
});
