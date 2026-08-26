import { describe, it, expect } from "vitest";
import {
  recencyWeighted,
  type TimedObservation,
} from "../edge-lab/features/recency-weighted.js";

const obs = (source: string, t: number, prob: number, weight?: number): TimedObservation => ({
  source,
  t,
  prob,
  weight,
});

describe("recencyWeighted", () => {
  it("lambda=1 reduces to the flat weighted mean and plain median", () => {
    const r = recencyWeighted([obs("a", 0, 0.2), obs("b", 1, 0.4), obs("c", 2, 0.8)]);
    expect(r.mean).toBeCloseTo(0.4667, 3);
    expect(r.median).toBe(0.4);
    expect(r.n).toBe(3);
    expect(r.dropped).toEqual([]);
  });

  it("recent observations dominate as lambda shrinks", () => {
    const stream = [obs("a", 0, 0.9), obs("a", 10, 0.2)];
    const flat = recencyWeighted(stream); // lambda = 1
    const decayed = recencyWeighted(stream, { lambda: 0.1 });
    expect(flat.mean).toBeCloseTo(0.55, 8);
    // With λ=0.1 the age-10 obs has weight 0.1 vs 1 → mean pulled toward 0.2.
    expect(decayed.mean).toBeLessThan(flat.mean);
    expect(decayed.median).toBe(0.2);
  });

  it("halfLife parametrization matches lambda = 0.5^(1/h)", () => {
    const stream = [obs("a", 0, 0.9), obs("b", 4, 0.1)];
    const byHalfLife = recencyWeighted(stream, { halfLife: 4 });
    const byLambda = recencyWeighted(stream, { lambda: Math.pow(0.5, 0.25) });
    expect(byHalfLife.mean).toBeCloseTo(byLambda.mean, 12);
  });

  it("rejects both lambda and halfLife together", () => {
    expect(() =>
      recencyWeighted([obs("a", 0, 0.5)], { lambda: 0.9, halfLife: 2 }),
    ).toThrow(/not both/);
  });

  it("rejects out-of-order timestamps fail-closed", () => {
    expect(() => recencyWeighted([obs("a", 5, 0.6), obs("b", 1, 0.4)])).toThrow(/sorted/);
  });

  it("drops invalid entries with sources reported; zero-weight excluded from pool but listed", () => {
    const r = recencyWeighted([
      obs("good", 0, 0.5),
      obs("nan", 1, NaN),
      obs("hi", 2, 1.5),
      obs("zeroW", 3, 0.7, 0),
    ]);
    expect(r.n).toBe(1);
    expect([...r.dropped].sort()).toEqual(["hi", "nan", "zeroW"]);
  });

  it("single observation returns itself for both statistics", () => {
    const r = recencyWeighted([obs("solo", 42, 0.73)]);
    expect(r.mean).toBeCloseTo(0.73, 12);
    expect(r.median).toBe(0.73);
  });

  it("weighted median shifts toward the heavily-weighted side", () => {
    const r = recencyWeighted([
      obs("many", 0, 0.2, 100),
      obs("one", 1, 0.8, 1),
    ]);
    expect(r.median).toBe(0.2);
    expect(r.mean).toBeLessThan(0.25);
  });

  it("fail-closed on empty input and invalid lambda/halfLife", () => {
    expect(() => recencyWeighted([], {})).toThrow();
    expect(() => recencyWeighted([obs("a", 0, 0.5)], { lambda: 1.2 })).toThrow();
    expect(() => recencyWeighted([obs("a", 0, 0.5)], { lambda: -0.5 })).toThrow();
    expect(() => recencyWeighted([obs("a", 0, 0.5)], { halfLife: 0 })).toThrow();
  });
});
