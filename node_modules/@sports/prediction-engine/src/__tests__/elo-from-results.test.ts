import { describe, it, expect } from "vitest";
import {
  fitEloRatingsFromResults,
  eloFairValueFromRatings,
} from "../elo-from-results.js";

describe("fitEloRatingsFromResults", () => {
  it("raises home rating after consecutive home wins", () => {
    const games = Array.from({ length: 8 }, (_, i) => ({
      homeTeam: "Alpha",
      awayTeam: "Beta",
      homeScore: 2,
      awayScore: 0,
      gameDate: `2026-01-${String(i + 1).padStart(2, "0")}`,
    }));
    const ratings = fitEloRatingsFromResults(games);
    expect(ratings.get("Alpha")!).toBeGreaterThan(ratings.get("Beta")!);
  });

  it("returns null fair value when either team unrated", () => {
    const ratings = fitEloRatingsFromResults([
      {
        homeTeam: "A",
        awayTeam: "B",
        homeScore: 1,
        awayScore: 0,
        gameDate: "2026-01-01",
      },
    ]);
    expect(eloFairValueFromRatings(ratings, "A", "Z")).toBeNull();
  });

  it("produces fair probs that sum to 1", () => {
    const ratings = fitEloRatingsFromResults([
      {
        homeTeam: "A",
        awayTeam: "B",
        homeScore: 3,
        awayScore: 1,
        gameDate: "2026-01-01",
      },
      {
        homeTeam: "B",
        awayTeam: "C",
        homeScore: 0,
        awayScore: 2,
        gameDate: "2026-01-02",
      },
      {
        homeTeam: "A",
        awayTeam: "C",
        homeScore: 2,
        awayScore: 0,
        gameDate: "2026-01-03",
      },
    ]);
    const fv = eloFairValueFromRatings(ratings, "A", "C", {
      now: () => new Date("2026-06-01T00:00:00Z"),
    });
    expect(fv).not.toBeNull();
    expect(fv!.source).toBe("elo");
    expect(fv!.homeFairProb! + fv!.awayFairProb!).toBeCloseTo(1, 3);
  });
});
