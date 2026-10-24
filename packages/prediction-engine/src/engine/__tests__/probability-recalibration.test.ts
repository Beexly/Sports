import { describe, expect, it } from "vitest";
import {
  ENGINE_WEIGHT,
  PROB_CEIL,
  PROB_FLOOR,
  expectedBrier,
  recalibrateProbability,
} from "../probability-recalibration";

describe("the fitted constant", () => {
  it("weights the market heavily — the engine earned only 15%", () => {
    expect(ENGINE_WEIGHT).toBe(0.15);
  });

  it("mixes at that weight exactly", () => {
    const r = recalibrateProbability(0.62, 0.52);
    expect(r?.prob).toBeCloseTo(0.15 * 0.62 + 0.85 * 0.52, 10);
    expect(r?.engineWeight).toBe(0.15);
    expect(r?.placed).toBe(true);
  });

  it("pulls an overconfident number toward the market", () => {
    const engine = 0.68;
    const market = 0.56;
    const r = recalibrateProbability(engine, market)!;
    expect(r.prob).toBeLessThan(engine);
    expect(r.prob).toBeGreaterThan(market);
  });
});

describe("missing inputs", () => {
  it("passes the engine figure through when there is no market, and flags it", () => {
    const r = recalibrateProbability(0.61, null)!;
    expect(r.prob).toBe(0.61);
    expect(r.placed).toBe(false);
    expect(r.engineWeight).toBe(1);
  });

  it("uses the market alone when the engine has nothing", () => {
    const r = recalibrateProbability(null, 0.57)!;
    expect(r.prob).toBe(0.57);
    expect(r.engineWeight).toBe(0);
    expect(r.placed).toBe(false);
  });

  it("returns null when both are unusable — no invented 0.5", () => {
    expect(recalibrateProbability(null, null)).toBeNull();
    expect(recalibrateProbability(Number.NaN, undefined)).toBeNull();
  });

  it("treats out-of-range values as missing", () => {
    // Both unusable -> null rather than an invented 0.5.
    expect(recalibrateProbability(0, 1)).toBeNull();
    expect(recalibrateProbability(1.4, 0.5)?.engineWeight).toBe(0);
    expect(recalibrateProbability(1.4, 0.5)?.prob).toBe(0.5);
  });
});

describe("clamping", () => {
  it("stays inside the publishable band", () => {
    expect(recalibrateProbability(0.999, 0.999)!.prob).toBeLessThanOrEqual(PROB_CEIL);
    expect(recalibrateProbability(0.001, 0.001)!.prob).toBeGreaterThanOrEqual(PROB_FLOOR);
  });

  it("is monotone in each argument", () => {
    const lo = recalibrateProbability(0.40, 0.50)!.prob;
    const hi = recalibrateProbability(0.60, 0.50)!.prob;
    expect(hi).toBeGreaterThan(lo);
    const mlo = recalibrateProbability(0.50, 0.40)!.prob;
    const mhi = recalibrateProbability(0.50, 0.60)!.prob;
    expect(mhi).toBeGreaterThan(mlo);
  });
});

describe("expected brier", () => {
  it("lands between the two inputs — documented lower bound, not the measured figure", () => {
    const v = expectedBrier(0.2532, 0.2158);
    expect(v).toBeGreaterThan(0.2158);
    expect(v).toBeLessThan(0.2532);
  });
});
