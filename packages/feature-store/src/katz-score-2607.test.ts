import { describe, expect, it } from "vitest";
import {
  katzFeature,
  katzScores,
  type KatzGame,
} from "./katz-score-2607.js";

describe("katz score", () => {
  const teams = ["A", "B", "C", "D"];

  it("ranks teams by win-path strength", () => {
    const games: KatzGame[] = [
      { winner: "A", loser: "B", ageWeeks: 0 },
      { winner: "A", loser: "C", ageWeeks: 0 },
      { winner: "B", loser: "C", ageWeeks: 0 },
      { winner: "C", loser: "D", ageWeeks: 0 },
    ];
    const s = katzScores(games, teams);
    expect(s.get("A")).toBeGreaterThan(s.get("B") ?? 0);
    expect(s.get("B")).toBeGreaterThan(s.get("C") ?? 0);
    expect(s.get("C")).toBeGreaterThan(s.get("D") ?? 0);
  });

  it("weights recent wins above old wins", () => {
    const recent: KatzGame[] = [{ winner: "A", loser: "B", ageWeeks: 0 }];
    const old: KatzGame[] = [{ winner: "A", loser: "B", ageWeeks: 32 }];
    const sRecent = katzScores(recent, ["A", "B"]);
    const sOld = katzScores(old, ["A", "B"]);
    expect(sRecent.get("A")).toBeGreaterThan(sOld.get("A") ?? 0);
    // 32 weeks at 8-week half-life = 4 half-lives -> weight 1/16
    expect(sOld.get("A")).toBeCloseTo((sRecent.get("A") ?? 0) / 16, 9);
  });

  it("rewards transitive win chains within the cutoff", () => {
    // A>B>C>D>E chain: A starts paths of length 1..4 and scores highest
    const games: KatzGame[] = [
      { winner: "A", loser: "B", ageWeeks: 0 },
      { winner: "B", loser: "C", ageWeeks: 0 },
      { winner: "C", loser: "D", ageWeeks: 0 },
      { winner: "D", loser: "E", ageWeeks: 0 },
    ];
    const s = katzScores(games, ["A", "B", "C", "D", "E"]);
    // A: beta + beta^2 + beta^3 + beta^4 ; E lost its only game -> 0
    const beta = 0.3;
    const aScore = beta + beta ** 2 + beta ** 3 + beta ** 4;
    expect(s.get("A")).toBeCloseTo(aScore, 9);
    expect(s.get("A")).toBeGreaterThan(s.get("B") ?? 0);
    expect(s.get("E")).toBe(0);
  });

  it("katzFeature is home-minus-away", () => {
    const s = katzScores([{ winner: "A", loser: "B", ageWeeks: 0 }], ["A", "B"]);
    expect(katzFeature("A", "B", s)).toBeGreaterThan(0);
    expect(katzFeature("B", "A", s)).toBeLessThan(0);
    expect(Number.isNaN(katzFeature("A", "ZZZ", s))).toBe(true);
  });

  it("handles empty and malformed input", () => {
    const s = katzScores([], teams);
    for (const t of teams) expect(s.get(t)).toBe(0);
    const bad = katzScores(
      [
        { winner: "A", loser: "A", ageWeeks: 0 }, // self-game ignored
        { winner: "A", loser: "ZZZ", ageWeeks: 0 }, // unknown team ignored
        { winner: "A", loser: "B", ageWeeks: -1 }, // negative age ignored
      ],
      ["A", "B"],
    );
    expect(bad.get("A")).toBe(0);
    expect(bad.get("B")).toBe(0);
  });
});
