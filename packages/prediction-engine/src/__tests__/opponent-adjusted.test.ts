import { describe, it, expect } from "vitest";
import { opponentAdjustedRatings, type TeamGameEfficiency } from "../opponent-adjusted.js";

// Both perspectives of one game (offense scored vs defense allowed are mirror values).
function matchup(home: string, away: string, homeOff: number, awayOff: number): TeamGameEfficiency[] {
  return [
    { team: home, opponent: away, offValue: homeOff, defValue: awayOff },
    { team: away, opponent: home, offValue: awayOff, defValue: homeOff },
  ];
}

describe("opponentAdjustedRatings", () => {
  it("returns nothing for no games", () => {
    expect(opponentAdjustedRatings([])).toEqual([]);
  });

  it("credits the same raw output more against a tougher defense", () => {
    // T is a strong defense (suppresses X and Y); W is weak (X and Y feast).
    // A scores 0.2 against weak W; B scores the SAME 0.2 against strong T.
    const games: TeamGameEfficiency[] = [
      ...matchup("X", "T", 0.0, 0.1),
      ...matchup("Y", "T", 0.0, 0.1),
      ...matchup("X", "W", 0.4, 0.1),
      ...matchup("Y", "W", 0.4, 0.1),
      ...matchup("A", "W", 0.2, 0.1), // A vs weak D
      ...matchup("B", "T", 0.2, 0.1), // B vs strong D
    ];
    const ratings = opponentAdjustedRatings(games);
    const A = ratings.find((r) => r.team === "A")!;
    const B = ratings.find((r) => r.team === "B")!;

    expect(A.rawOff).toBeCloseTo(0.2, 3);
    expect(B.rawOff).toBeCloseTo(0.2, 3);
    // Same raw, but B did it vs a tough defense → boosted; A vs a weak D → penalized.
    expect(B.adjOff).toBeGreaterThan(B.rawOff);
    expect(A.adjOff).toBeLessThan(A.rawOff);
    expect(B.adjOff).toBeGreaterThan(A.adjOff);
  });

  it("ranks a transitively stronger team highest and is roughly centered", () => {
    // S beats M beats W; S handles W easily.
    const games: TeamGameEfficiency[] = [
      ...matchup("S", "M", 0.25, 0.05),
      ...matchup("M", "W", 0.25, 0.05),
      ...matchup("S", "W", 0.35, 0.0),
    ];
    const ratings = opponentAdjustedRatings(games);
    expect(ratings[0]!.team).toBe("S"); // sorted by overall desc
    expect(ratings.findIndex((r) => r.team === "S")).toBeLessThan(ratings.findIndex((r) => r.team === "W"));
    // Overall ratings are relative to an average schedule → roughly zero-sum.
    const avgOverall = ratings.reduce((s, r) => s + r.overall, 0) / ratings.length;
    expect(Math.abs(avgOverall)).toBeLessThan(0.2);
  });

  it("converges (more iterations barely move the result)", () => {
    const games: TeamGameEfficiency[] = [
      ...matchup("A", "B", 0.2, 0.0),
      ...matchup("B", "C", 0.1, 0.1),
      ...matchup("C", "A", 0.0, 0.2),
    ];
    const at25 = opponentAdjustedRatings(games, { iterations: 25 }).find((r) => r.team === "A")!;
    const at60 = opponentAdjustedRatings(games, { iterations: 60 }).find((r) => r.team === "A")!;
    expect(at60.overall).toBeCloseTo(at25.overall, 3);
  });
});
