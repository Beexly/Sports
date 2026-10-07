import { describe, it, expect } from "vitest";
import { devigProportional, detectEv } from "../edge-lab/features/ev-detector.js";

describe("devigProportional", () => {
  it("strips margin so fair probs sum to 1", () => {
    // Classic 110/110 American ≈ 1.909/1.909 decimal: Σ implied ≈ 1.0476
    const { fairProbs, marginTotal } = devigProportional([1.909, 1.909]);
    expect(marginTotal).toBeGreaterThan(1);
    expect(fairProbs[0]! + fairProbs[1]!).toBeCloseTo(1, 12);
    expect(fairProbs[0]!).toBeCloseTo(0.5, 10);
  });

  it("asymmetric book: margin shrinks BOTH raw implieds proportionally", () => {
    const odds = [1.5, 2.8]; // raw implied: 0.667 / 0.357, margin ≈ 1.0238
    const { fairProbs, marginTotal } = devigProportional(odds);
    expect(fairProbs[0]!).toBeLessThan(1 / 1.5); // shrunk by /margin
    expect(fairProbs[1]!).toBeLessThan(1 / 2.8);
    expect(fairProbs[0]! + fairProbs[1]!).toBeCloseTo(1, 12);
    expect(marginTotal).toBeCloseTo(1 / 1.5 + 1 / 2.8, 12);
  });

  it("fail closed on bad books", () => {
    expect(() => devigProportional([2.0])).toThrow();
    expect(() => devigProportional([2.0, Number.NaN])).toThrow();
    expect(() => devigProportional([2.0, 1.0])).toThrow(); // odds must be > 1
    expect(() => devigProportional([2.0, -1.5])).toThrow();
  });
});

describe("detectEv", () => {
  const book = [1.5, 2.8];

  it("model at RAW implied is NOT break-even once the margin is stripped", () => {
    const r = detectEv(1 / 1.5, 0, book);
    // Naive detector calls this EV 0 (model == raw implied). Corrected shows
    // the true -EV: fair prob for the favorite is raw/margin < raw, so the
    // model's edge over FAIR is negative and Kelly says don't bet.
    expect(r.fairProbBook).toBeLessThan(1 / 1.5);
    expect(r.edge).toBeGreaterThan(0); // model > devigged fair...
    expect(r.evPerUnit).toBeLessThan(0); // ...but still -EV after margin
    expect(r.kellyFraction).toBeLessThan(0);
  });

  it("positive edge and Kelly when model beats devigged fair prob", () => {
    const r = detectEv(0.72, 1, book); // fair for outcome 1 is ~0.3486
    expect(r.edge).toBeGreaterThan(0);
    expect(r.evPerUnit).toBeGreaterThan(0);
    expect(r.kellyFraction).toBeGreaterThan(0);
    // Kelly identity: f* = evPerUnit / b
    const b = 2.8 - 1;
    expect(r.kellyFraction).toBeCloseTo(r.evPerUnit / b, 12);
  });

  it("marginTotal is surfaced so callers can log book quality", () => {
    const r = detectEv(0.5, 0, book);
    expect(r.marginTotal).toBeCloseTo(1 / 1.5 + 1 / 2.8, 12);
  });

  it("fail closed on invalid model prob or index", () => {
    expect(() => detectEv(1.2, 0, book)).toThrow();
    expect(() => detectEv(Number.NaN, 0, book)).toThrow();
    expect(() => detectEv(0.5, 2, book)).toThrow();
    expect(() => detectEv(0.5, -1, book)).toThrow();
  });
});
