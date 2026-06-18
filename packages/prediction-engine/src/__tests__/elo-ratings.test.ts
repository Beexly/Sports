import { describe, it, expect } from "vitest";
import { computeEloRatings, eloFairValuesForGame, type RatedGame } from "../elo-ratings.js";

function game(home: string, away: string, hs: number, as: number, season = 2025, kickoff = 0): RatedGame {
  return { homeTeam: home, awayTeam: away, homeScore: hs, awayScore: as, season, kickoff };
}

describe("computeEloRatings", () => {
  it("raises a consistent winner above the seed and drops the loser", () => {
    const games: RatedGame[] = [
      game("A", "B", 30, 10, 2025, 1),
      game("A", "B", 24, 17, 2025, 2),
      game("B", "A", 13, 27, 2025, 3), // A wins on the road too
    ];
    const elo = computeEloRatings(games);
    expect(elo.gamesRated).toBe(3);
    expect(elo.ratings.get("A")!).toBeGreaterThan(elo.initialRating);
    expect(elo.ratings.get("B")!).toBeLessThan(elo.initialRating);
    // Zero-sum: total rating is conserved at 2 × seed (no draws here).
    const total = [...elo.ratings.values()].reduce((s, r) => s + r, 0);
    expect(total).toBeCloseTo(2 * elo.initialRating, 0);
  });

  it("skips draws (a tie carries no rating signal)", () => {
    const elo = computeEloRatings([game("A", "B", 20, 20)]);
    expect(elo.gamesRated).toBe(0);
    expect(elo.ratings.size).toBe(0);
  });

  it("respects chronological order via (season, kickoff), not array order", () => {
    const inOrder = computeEloRatings([
      game("A", "B", 30, 0, 2025, 1),
      game("A", "B", 0, 30, 2025, 2),
    ]);
    const shuffled = computeEloRatings([
      game("A", "B", 0, 30, 2025, 2),
      game("A", "B", 30, 0, 2025, 1),
    ]);
    // Same games, same final ratings regardless of input order.
    expect(shuffled.ratings.get("A")).toBeCloseTo(inOrder.ratings.get("A")!, 6);
  });

  it("regresses ratings toward the mean across a season boundary", () => {
    const dominant = [
      game("A", "B", 40, 0, 2024, 1),
      game("A", "B", 40, 0, 2024, 2),
      game("A", "B", 40, 0, 2024, 3),
    ];
    const oneSeason = computeEloRatings(dominant);
    const aHigh = oneSeason.ratings.get("A")!;
    // Same games, then a season flip with one more game: A's rating should be
    // pulled back toward 1500 at the boundary (carryover 0.75 < 1).
    const acrossSeasons = computeEloRatings([
      ...dominant,
      game("A", "B", 40, 0, 2025, 1),
    ]);
    // After regression + one more win, A is still strong but the boundary pulled
    // it down from where an un-regressed continuation would sit.
    const unregressed = computeEloRatings([
      ...dominant,
      game("A", "B", 40, 0, 2024, 4), // same season, no regression
    ]);
    expect(acrossSeasons.ratings.get("A")!).toBeLessThan(unregressed.ratings.get("A")!);
    expect(acrossSeasons.ratings.get("A")!).toBeGreaterThan(0);
    expect(aHigh).toBeGreaterThan(1500);
  });
});

describe("eloFairValuesForGame", () => {
  it("returns a single elo fair value with complementary home/away probs", () => {
    const elo = computeEloRatings([game("A", "B", 30, 10), game("A", "B", 28, 14)]);
    const fv = eloFairValuesForGame(elo, "A", "B");
    expect(fv).toHaveLength(1);
    expect(fv[0]!.source).toBe("elo");
    expect(fv[0]!.homeFairProb! + fv[0]!.awayFairProb!).toBeCloseTo(1, 4);
    // A is the stronger team and at home → > 50% to win.
    expect(fv[0]!.homeFairProb!).toBeGreaterThan(0.5);
  });

  it("declines (empty) when either team is unrated — never guesses", () => {
    const elo = computeEloRatings([game("A", "B", 30, 10)]);
    expect(eloFairValuesForGame(elo, "A", "C")).toEqual([]);
    expect(eloFairValuesForGame(elo, "Z", "B")).toEqual([]);
  });

  it("applies a home-field bump: same rating, home side favored", () => {
    // Two teams that split evenly → equal ratings; home advantage tips the prob.
    const elo = computeEloRatings([
      game("A", "B", 21, 17, 2025, 1),
      game("B", "A", 21, 17, 2025, 2),
    ]);
    const fv = eloFairValuesForGame(elo, "A", "B")[0]!;
    expect(fv.homeFairProb!).toBeGreaterThan(0.5);
  });
});
