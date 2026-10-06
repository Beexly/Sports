import { describe, expect, it } from "vitest";
import { fieldArithmetic } from "./derive";
import { FIELD, type FieldSnap } from "./field";

describe("fieldArithmetic", () => {
  it("returns null when passers array is empty", () => {
    const emptySnap: FieldSnap = {
      ol: [{ team: "BAL", ol: 4, out: 2 }],
      nullTeams: ["DAL"],
      passers: [],
      min: 0,
      median: 0,
      max: 0,
    };
    const result = fieldArithmetic(emptySnap, []);
    expect(result).toBeNull();
  });

  it("calculates correct statistics for sealed FIELD snapshot and Watson weeks", () => {
    const watsonWeeks = [
      { week: "0", ttt: "2.794", attempts: "115" },
      { week: "1", ttt: "2.850", attempts: "30" },
      { week: "2", ttt: "2.750", attempts: "28" },
    ];

    const result = fieldArithmetic(FIELD, watsonWeeks);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.n).toBe(37);
    expect(result.attempts).toBe(3121);
    expect(result.mean).toBeCloseTo(2.847, 3);
    expect(result.weighted).toBeCloseTo(2.844, 3);

    // Quantile checks on sorted TTT values
    const sorted = [...FIELD.passers].map((p) => p.ttt).sort((a, b) => a - b);
    // n = 37. q1 index = round(36 * 0.25) = 9; q3 index = round(36 * 0.75) = 27
    expect(result.q1).toBe(sorted[9]);
    expect(result.q3).toBe(sorted[27]);

    // OL checks
    expect(result.lineRows).toBe(41);
    expect(result.lineOut).toBe(15);
    expect(result.reporting).toBe(25);
    expect(result.nullTeams).toBe(7);

    // Below fixture <= 2.1
    expect(result.belowFixture).toBe(0);

    // Drift checks
    expect(result.seasonTtt).toBe(2.794);
    expect(result.drift).toHaveLength(2);
    expect(result.drift[0]).toEqual({
      week: "1",
      ttt: 2.85,
      attempts: 30,
      delta: 2.85 - 2.794,
    });
    expect(result.drift[1]).toEqual({
      week: "2",
      ttt: 2.75,
      attempts: 28,
      delta: 2.75 - 2.794,
    });
  });

  it("handles zero total attempts without divide by zero (weighted is null)", () => {
    const zeroAttSnap: FieldSnap = {
      ol: [],
      nullTeams: [],
      passers: [
        { name: "Passer A", team: "AAA", ttt: 2.5, att: 0, gsis: "00-1" },
        { name: "Passer B", team: "BBB", ttt: 3.0, att: 0, gsis: "00-2" },
      ],
      min: 2.5,
      median: 2.75,
      max: 3.0,
    };

    const result = fieldArithmetic(zeroAttSnap, []);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.attempts).toBe(0);
    expect(result.weighted).toBeNull();
    expect(result.mean).toBe(2.75);
  });

  it("counts passers below or at fixture threshold 2.1", () => {
    const snap: FieldSnap = {
      ol: [],
      nullTeams: [],
      passers: [
        { name: "Passer A", team: "AAA", ttt: 2.0, att: 10, gsis: "00-1" },
        { name: "Passer B", team: "BBB", ttt: 2.1, att: 10, gsis: "00-2" },
        { name: "Passer C", team: "CCC", ttt: 2.11, att: 10, gsis: "00-3" },
      ],
      min: 2.0,
      median: 2.1,
      max: 2.11,
    };

    const result = fieldArithmetic(snap, []);
    expect(result?.belowFixture).toBe(2);
  });

  it("returns empty drift array if week '0' is missing from watsonWeeks", () => {
    const watsonWeeks = [
      { week: "1", ttt: "2.850", attempts: "30" },
      { week: "2", ttt: "2.750", attempts: "28" },
    ];

    const result = fieldArithmetic(FIELD, watsonWeeks);
    expect(result?.seasonTtt).toBeNull();
    expect(result?.drift).toEqual([]);
  });

  it("returns empty drift array if seasonTtt is not finite", () => {
    const watsonWeeks = [
      { week: "0", ttt: "invalid_number", attempts: "115" },
      { week: "1", ttt: "2.850", attempts: "30" },
    ];

    const result = fieldArithmetic(FIELD, watsonWeeks);
    expect(result?.seasonTtt).toBeNaN();
    expect(result?.drift).toEqual([]);
  });
});
