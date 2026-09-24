import { describe, expect, it } from "vitest";
import {
  fitWinsRegression,
  maeNullTable,
  predictWins,
  scheduleAdjustedDiff,
  tableMae,
} from "./parsimonious-season";

describe("parsimonious-season", () => {
  it("maeNullTable matches the paper's exact formula", () => {
    // n=20: (400-1)/20/3 = 6.65
    expect(maeNullTable(20)).toBeCloseTo(6.65, 10);
    // n=32 (NFL): (1024-1)/32/3
    expect(maeNullTable(32)).toBeCloseTo(1023 / 96, 10);
    expect(() => maeNullTable(1)).toThrow();
  });

  it("scheduleAdjustedDiff removes fixture imbalance", () => {
    const games = [
      { team: "A", opponent: "X", pointDiff: 10, oppStrength: 7 }, // beat a good team by 10
      { team: "B", opponent: "Y", pointDiff: 10, oppStrength: -7 }, // beat a bad team by 10
    ];
    const d = scheduleAdjustedDiff(games);
    expect(d["A"]).toBeLessThan(d["B"] ?? 0); // A's win is discounted by SOS
    expect(d["A"]).toBeCloseTo(3, 12);
    expect(d["B"]).toBeCloseTo(17, 12);
  });

  it("fitWinsRegression recovers the signal", () => {
    const early = { A: 5, B: 0, C: -5, D: 2, E: -2 };
    const wins = { A: 12, B: 8, C: 4, D: 10, E: 6 };
    const m = fitWinsRegression(early, wins);
    expect(m.slope).toBeGreaterThan(0);
    expect(m.rSquared).toBeGreaterThan(0.9);
    const pred = predictWins({ F: 3 }, m);
    expect(pred["F"]).toBeGreaterThan(8);
    expect(() => fitWinsRegression({ A: 1 }, { A: 1 })).toThrow("≥ 3");
  });

  it("tableMae scores the horse race", () => {
    expect(tableMae({ A: 10, B: 6 }, { A: 12, B: 6 })).toBe(1);
    expect(() => tableMae({}, { A: 1 })).toThrow();
  });
});
