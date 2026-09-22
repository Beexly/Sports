import { describe, expect, it } from "vitest";
import { exactMatchAccuracy, harnessScore, statClaimGatePasses } from "./stat-claim-harness-2402.js";

const fx = {
  gameId: "g1", season: 2024, week: 1, homeTeam: "KC", awayTeam: "BAL",
  official: { home_points: 27, away_points: 20, home_pass_yds: 291 },
};

describe("stat-claim harness", () => {
  it("scores exact-match accuracy per fixture", () => {
    const fill = { gameId: "g1", stats: { home_points: 27, away_points: 20, home_pass_yds: 290 }, condition: "A" as const };
    expect(exactMatchAccuracy(fx, fill)).toBeCloseTo(2 / 3, 10);
  });
  it("returns 0 on game-id mismatch or empty official", () => {
    expect(exactMatchAccuracy(fx, { gameId: "g2", stats: {}, condition: "A" })).toBe(0);
    expect(exactMatchAccuracy({ ...fx, official: {} }, { gameId: "g1", stats: {}, condition: "A" })).toBe(0);
  });
  it("computes the B-vs-A delta in percentage points", () => {
    const s = harnessScore(
      [fx],
      [
        { gameId: "g1", stats: { home_points: 0, away_points: 0, home_pass_yds: 0 }, condition: "A" },
        { gameId: "g1", stats: { home_points: 27, away_points: 20, home_pass_yds: 291 }, condition: "B" },
      ],
    );
    expect(s.deltaPp).toBeCloseTo(100, 10);
    expect(statClaimGatePasses(s.deltaPp)).toBe(true);
    expect(statClaimGatePasses(9.9)).toBe(false);
  });
});

