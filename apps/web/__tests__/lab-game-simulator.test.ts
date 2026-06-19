import { describe, it, expect } from "vitest";

import {
  validateGameSimInput,
  runGameSimulation,
  SIM_MIN_ITERATIONS,
  SIM_MAX_ITERATIONS,
  SIM_DEFAULT_ITERATIONS,
  SIM_DISCLAIMER,
  type GameSimInput,
} from "@/lib/lab/game-simulator";

function baseInput(overrides: Partial<GameSimInput> = {}): GameSimInput {
  return {
    homeName: "Home",
    awayName: "Away",
    homeOffense: 24,
    homeDefense: 21,
    awayOffense: 22,
    awayDefense: 23,
    homeFieldAdvantage: 2.5,
    spread: null,
    total: null,
    iterations: 5000,
    seed: 42,
    ...overrides,
  };
}

describe("validateGameSimInput", () => {
  it("rejects non-objects", () => {
    expect(validateGameSimInput(null)).toEqual({
      error: expect.stringContaining("JSON object"),
    });
    expect(validateGameSimInput("nope")).toHaveProperty("error");
    expect(validateGameSimInput(42)).toHaveProperty("error");
  });

  it("requires the four rating fields", () => {
    expect(validateGameSimInput({})).toHaveProperty("error");
    expect(
      validateGameSimInput({ homeOffense: 24, homeDefense: 21, awayOffense: 22 }),
    ).toHaveProperty("error");
  });

  it("accepts numeric strings for ratings", () => {
    const res = validateGameSimInput({
      homeOffense: "24",
      homeDefense: "21",
      awayOffense: "22",
      awayDefense: "23",
    });
    expect(res).not.toHaveProperty("error");
    const v = res as GameSimInput;
    expect(v.homeOffense).toBe(24);
    expect(v.awayDefense).toBe(23);
  });

  it("clamps ratings into 0..80", () => {
    const v = validateGameSimInput({
      homeOffense: 999,
      homeDefense: -50,
      awayOffense: 30,
      awayDefense: 28,
    }) as GameSimInput;
    expect(v.homeOffense).toBe(80);
    expect(v.homeDefense).toBe(0);
  });

  it("defaults iterations and clamps the range", () => {
    const def = validateGameSimInput({
      homeOffense: 24,
      homeDefense: 21,
      awayOffense: 22,
      awayDefense: 23,
    }) as GameSimInput;
    expect(def.iterations).toBe(SIM_DEFAULT_ITERATIONS);

    const low = validateGameSimInput({
      homeOffense: 24,
      homeDefense: 21,
      awayOffense: 22,
      awayDefense: 23,
      iterations: 1,
    }) as GameSimInput;
    expect(low.iterations).toBe(SIM_MIN_ITERATIONS);

    const high = validateGameSimInput({
      homeOffense: 24,
      homeDefense: 21,
      awayOffense: 22,
      awayDefense: 23,
      iterations: 9_999_999,
    }) as GameSimInput;
    expect(high.iterations).toBe(SIM_MAX_ITERATIONS);
  });

  it("defaults and clamps home-field advantage", () => {
    const def = validateGameSimInput({
      homeOffense: 24,
      homeDefense: 21,
      awayOffense: 22,
      awayDefense: 23,
    }) as GameSimInput;
    expect(def.homeFieldAdvantage).toBe(2.5);

    const clamped = validateGameSimInput({
      homeOffense: 24,
      homeDefense: 21,
      awayOffense: 22,
      awayDefense: 23,
      homeFieldAdvantage: 999,
    }) as GameSimInput;
    expect(clamped.homeFieldAdvantage).toBe(10);
  });

  it("keeps spread/total null when absent and clamps when present", () => {
    const absent = validateGameSimInput({
      homeOffense: 24,
      homeDefense: 21,
      awayOffense: 22,
      awayDefense: 23,
    }) as GameSimInput;
    expect(absent.spread).toBeNull();
    expect(absent.total).toBeNull();

    const present = validateGameSimInput({
      homeOffense: 24,
      homeDefense: 21,
      awayOffense: 22,
      awayDefense: 23,
      spread: -100,
      total: 999,
    }) as GameSimInput;
    expect(present.spread).toBe(-40);
    expect(present.total).toBe(200);
  });

  it("truncates over-long team names", () => {
    const v = validateGameSimInput({
      homeOffense: 24,
      homeDefense: 21,
      awayOffense: 22,
      awayDefense: 23,
      homeName: "x".repeat(200),
    }) as GameSimInput;
    expect(v.homeName.length).toBeLessThanOrEqual(48);
  });
});

describe("runGameSimulation", () => {
  it("produces probabilities that sum to ~1", () => {
    const out = runGameSimulation(baseInput());
    const sum =
      out.homeWinProbability + out.awayWinProbability + out.tieProbability;
    expect(sum).toBeGreaterThan(0.99);
    expect(sum).toBeLessThan(1.01);
  });

  it("is deterministic given a seed", () => {
    const a = runGameSimulation(baseInput({ seed: 7 }));
    const b = runGameSimulation(baseInput({ seed: 7 }));
    expect(a.homeWinProbability).toBe(b.homeWinProbability);
    expect(a.avgHomeScore).toBe(b.avgHomeScore);
    expect(a.marginHistogram).toEqual(b.marginHistogram);
  });

  it("favors the stronger team", () => {
    const out = runGameSimulation(
      baseInput({
        homeOffense: 34,
        homeDefense: 14,
        awayOffense: 17,
        awayDefense: 27,
      }),
    );
    expect(out.homeWinProbability).toBeGreaterThan(out.awayWinProbability);
    expect(out.projectedMargin).toBeGreaterThan(0);
  });

  it("reports the iteration count actually run", () => {
    const out = runGameSimulation(baseInput({ iterations: 3000 }));
    expect(out.iterations).toBe(3000);
  });

  it("omits cover/over/market fields when no line is supplied", () => {
    const out = runGameSimulation(baseInput({ spread: null, total: null }));
    expect(out.coverProbability).toBeNull();
    expect(out.overProbability).toBeNull();
    expect(out.marketImpliedHomeWinProbability).toBeNull();
    expect(out.edgeVsMarketPoints).toBeNull();
  });

  it("computes cover/over/edge when a line is supplied", () => {
    const out = runGameSimulation(
      baseInput({ spread: -3, total: 45 }),
    );
    expect(out.coverProbability).not.toBeNull();
    expect(out.overProbability).not.toBeNull();
    expect(out.marketImpliedHomeWinProbability).not.toBeNull();
    expect(out.edgeVsMarketPoints).not.toBeNull();
    expect(out.coverProbability as number).toBeGreaterThanOrEqual(0);
    expect(out.coverProbability as number).toBeLessThanOrEqual(1);
  });

  it("edge is sim minus market in percentage points", () => {
    const out = runGameSimulation(baseInput({ spread: -3 }));
    const market = out.marketImpliedHomeWinProbability as number;
    const expected = Number(
      ((out.homeWinProbability - market) * 100).toFixed(2),
    );
    expect(out.edgeVsMarketPoints).toBe(expected);
  });

  it("margin histogram probabilities are within (0,1] and bounded in count", () => {
    const out = runGameSimulation(baseInput());
    expect(out.marginHistogram.length).toBeGreaterThan(0);
    expect(out.marginHistogram.length).toBeLessThan(120);
    for (const b of out.marginHistogram) {
      expect(b.probability).toBeGreaterThan(0);
      expect(b.probability).toBeLessThanOrEqual(1);
    }
  });

  it("always carries the honesty disclaimer", () => {
    const out = runGameSimulation(baseInput());
    expect(out.disclaimer).toBe(SIM_DISCLAIMER);
    expect(out.disclaimer.toLowerCase()).toContain("not a published pick");
  });

  it("home-field advantage shifts the projected margin", () => {
    const flat = runGameSimulation(
      baseInput({ homeFieldAdvantage: 0, seed: 11 }),
    );
    const withHfa = runGameSimulation(
      baseInput({ homeFieldAdvantage: 7, seed: 11 }),
    );
    expect(withHfa.projectedMargin).toBeGreaterThan(flat.projectedMargin);
  });

  it("scales fair moneyline with win probability sign", () => {
    const out = runGameSimulation(
      baseInput({
        homeOffense: 34,
        homeDefense: 14,
        awayOffense: 16,
        awayDefense: 28,
      }),
    );
    // Strong home favorite => negative (favored) home moneyline.
    expect(out.homeFairMoneyline).toBeLessThan(0);
    expect(out.awayFairMoneyline).toBeGreaterThan(0);
  });
});
