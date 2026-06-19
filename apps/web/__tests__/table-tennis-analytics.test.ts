import { describe, it, expect } from "vitest";
import {
  isGameWon,
  isMatchWon,
  deuceRequired,
  servicePattern,
  endChangeRequired,
  gameScore,
  rallyLengthDistribution,
  firstStrikeRate,
  serveWinRate,
  strokeDistribution,
  errorRate,
  winnerRate,
  serveEffectiveness,
  serveVariety,
  imitationRate,
  serveEdge,
  ttEloExpected,
  ttEloUpdate,
  ttRatingClass,
  tournamentRatingChange,
  pointsPerGame,
  longestStreak,
  momentumShift,
  clutchPerformance,
  comebackFrequency,
  worldRankingPoints,
  rankingProjection,
  dkTTPoints,
  dkProjection,
} from "@/lib/sports/table-tennis-analytics";

// ---------------------------------------------------------------------------
// 1. isGameWon
// ---------------------------------------------------------------------------
describe("isGameWon", () => {
  it("returns true for 11-0", () => {
    expect(isGameWon(11, 0)).toBe(true);
  });
  it("returns true for 11-9", () => {
    expect(isGameWon(11, 9)).toBe(true);
  });
  it("returns false for 10-9 (not at 11 yet)", () => {
    expect(isGameWon(10, 9)).toBe(false);
  });
  it("returns false for 11-10 (no 2-point lead)", () => {
    expect(isGameWon(11, 10)).toBe(false);
  });
  it("returns true for 12-10 (deuce resolved)", () => {
    expect(isGameWon(12, 10)).toBe(true);
  });
  it("returns false for 12-11 (still in deuce)", () => {
    expect(isGameWon(12, 11)).toBe(false);
  });
  it("returns true for 15-13", () => {
    expect(isGameWon(15, 13)).toBe(true);
  });
  it("returns false when opponent leads 11-9", () => {
    expect(isGameWon(9, 11)).toBe(false);
  });
  it("returns false at 10-10 (deuce, no winner)", () => {
    expect(isGameWon(10, 10)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. isMatchWon
// ---------------------------------------------------------------------------
describe("isMatchWon", () => {
  it("best-of-3: wins at 2 games", () => {
    expect(isMatchWon(2, 1, 3)).toBe(true);
  });
  it("best-of-3: 1-1 is not won", () => {
    expect(isMatchWon(1, 1, 3)).toBe(false);
  });
  it("best-of-5: wins at 3 games", () => {
    expect(isMatchWon(3, 2, 5)).toBe(true);
  });
  it("best-of-5: 2-2 is not won", () => {
    expect(isMatchWon(2, 2, 5)).toBe(false);
  });
  it("best-of-7: wins at 4 games", () => {
    expect(isMatchWon(4, 3, 7)).toBe(true);
  });
  it("best-of-7: 3-3 is not won", () => {
    expect(isMatchWon(3, 3, 7)).toBe(false);
  });
  it("throws on unsupported bestOf", () => {
    expect(() => isMatchWon(3, 0, 9)).toThrow();
  });
  it("opponent winning 2 games in best-of-3 returns false for me", () => {
    expect(isMatchWon(0, 2, 3)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. deuceRequired
// ---------------------------------------------------------------------------
describe("deuceRequired", () => {
  it("true at 10-10", () => {
    expect(deuceRequired(10, 10)).toBe(true);
  });
  it("true at 11-10 (within 1 and high score ≥10)", () => {
    expect(deuceRequired(11, 10)).toBe(true);
  });
  it("true at 10-11 symmetric", () => {
    expect(deuceRequired(10, 11)).toBe(true);
  });
  it("false at 11-9 (2-point lead, no deuce)", () => {
    expect(deuceRequired(11, 9)).toBe(false);
  });
  it("false at 9-9 (not at 10 yet)", () => {
    expect(deuceRequired(9, 9)).toBe(false);
  });
  it("false at 12-10 (resolved by 2-point lead)", () => {
    expect(deuceRequired(12, 10)).toBe(false);
  });
  it("true at 15-14", () => {
    expect(deuceRequired(15, 14)).toBe(true);
  });
  it("false at 15-13", () => {
    expect(deuceRequired(15, 13)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. servicePattern
// ---------------------------------------------------------------------------
describe("servicePattern", () => {
  it("player 1 serves on point 0 (start of game)", () => {
    expect(servicePattern(0, 1)).toBe(1);
  });
  it("player 1 serves on point 1", () => {
    expect(servicePattern(1, 1)).toBe(1);
  });
  it("player 2 serves on point 2", () => {
    expect(servicePattern(2, 1)).toBe(2);
  });
  it("player 2 serves on point 3", () => {
    expect(servicePattern(3, 1)).toBe(2);
  });
  it("player 1 serves on point 4", () => {
    expect(servicePattern(4, 1)).toBe(1);
  });
  it("player 2 starts serving: serves on point 0", () => {
    expect(servicePattern(0, 2)).toBe(2);
  });
  it("player 2 starts serving: player 1 serves on point 2", () => {
    expect(servicePattern(2, 2)).toBe(1);
  });
  // Deuce phase: totalPoints >= 20
  it("at deuce (point 20), player 1 starter serves", () => {
    expect(servicePattern(20, 1)).toBe(1);
  });
  it("at deuce (point 21), alternates to player 2 when player 1 started", () => {
    expect(servicePattern(21, 1)).toBe(2);
  });
  it("at deuce (point 22), back to player 1 when player 1 started", () => {
    expect(servicePattern(22, 1)).toBe(1);
  });
  it("at deuce (point 20), player 2 started → player 2 serves", () => {
    expect(servicePattern(20, 2)).toBe(2);
  });
  it("at deuce (point 21), player 2 started → player 1 serves", () => {
    expect(servicePattern(21, 2)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 5. endChangeRequired
// ---------------------------------------------------------------------------
describe("endChangeRequired", () => {
  it("requires change at 5 points in the last game (best-of-5, game 5)", () => {
    expect(endChangeRequired(5, 5, 5)).toBe(true);
  });
  it("does NOT require change at 4 points in last game", () => {
    expect(endChangeRequired(4, 5, 5)).toBe(false);
  });
  it("does NOT require change in non-last game", () => {
    expect(endChangeRequired(5, 3, 5)).toBe(false);
  });
  it("last game in best-of-7 is game 7", () => {
    expect(endChangeRequired(5, 7, 7)).toBe(true);
  });
  it("last game in best-of-3 is game 3", () => {
    expect(endChangeRequired(5, 3, 3)).toBe(true);
  });
  it("game 6 of best-of-7 is not last game", () => {
    expect(endChangeRequired(5, 6, 7)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. gameScore
// ---------------------------------------------------------------------------
describe("gameScore", () => {
  it("counts rally winners correctly", () => {
    const rallies: (1 | 2)[] = [1, 1, 2, 1, 2, 2, 1];
    const result = gameScore(rallies);
    expect(result.p1).toBe(4);
    expect(result.p2).toBe(3);
    expect(result.winner).toBeNull();
  });
  it("returns winner=1 when player 1 reaches 11 with 2-point lead", () => {
    const rallies: (1 | 2)[] = Array(11).fill(1) as (1 | 2)[];
    const result = gameScore(rallies);
    expect(result.winner).toBe(1);
  });
  it("returns winner=2 when player 2 wins", () => {
    const rallies: (1 | 2)[] = Array(11).fill(2) as (1 | 2)[];
    const result = gameScore(rallies);
    expect(result.winner).toBe(2);
  });
  it("returns null at 10-10 (deuce, no winner yet)", () => {
    const rallies: (1 | 2)[] = [
      ...Array(10).fill(1),
      ...Array(10).fill(2),
    ] as (1 | 2)[];
    const result = gameScore(rallies);
    expect(result.winner).toBeNull();
  });
  it("player 1 wins deuce at 12-10", () => {
    const rallies: (1 | 2)[] = [
      ...Array(10).fill(1),
      ...Array(10).fill(2),
      1,
      1,
    ] as (1 | 2)[];
    const result = gameScore(rallies);
    expect(result.winner).toBe(1);
    expect(result.p1).toBe(12);
    expect(result.p2).toBe(10);
  });
  it("empty rallies returns null winner and 0-0", () => {
    const result = gameScore([]);
    expect(result.p1).toBe(0);
    expect(result.p2).toBe(0);
    expect(result.winner).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 7. rallyLengthDistribution
// ---------------------------------------------------------------------------
describe("rallyLengthDistribution", () => {
  it("returns zeros for empty input", () => {
    const r = rallyLengthDistribution([]);
    expect(r.short).toBe(0);
    expect(r.medium).toBe(0);
    expect(r.long).toBe(0);
    expect(r.avgLength).toBe(0);
  });
  it("classifies ≤3 as short", () => {
    const r = rallyLengthDistribution([1, 2, 3]);
    expect(r.short).toBe(1);
    expect(r.medium).toBe(0);
    expect(r.long).toBe(0);
  });
  it("classifies 4-8 as medium", () => {
    const r = rallyLengthDistribution([4, 5, 8]);
    expect(r.medium).toBe(1);
  });
  it("classifies ≥9 as long", () => {
    const r = rallyLengthDistribution([9, 10, 15]);
    expect(r.long).toBe(1);
  });
  it("computes correct fractions for mixed rallies", () => {
    // 2 short, 2 medium, 1 long → fractions 0.4, 0.4, 0.2
    const r = rallyLengthDistribution([1, 3, 4, 8, 9]);
    expect(r.short).toBeCloseTo(0.4);
    expect(r.medium).toBeCloseTo(0.4);
    expect(r.long).toBeCloseTo(0.2);
  });
  it("computes correct average", () => {
    const r = rallyLengthDistribution([2, 4, 6]);
    expect(r.avgLength).toBeCloseTo(4);
  });
});

// ---------------------------------------------------------------------------
// 8. firstStrikeRate
// ---------------------------------------------------------------------------
describe("firstStrikeRate", () => {
  it("returns 0 when totalPoints is 0", () => {
    expect(firstStrikeRate(0, 0)).toBe(0);
  });
  it("returns 0.5 for 5 out of 10", () => {
    expect(firstStrikeRate(5, 10)).toBeCloseTo(0.5);
  });
  it("returns 1 when all points won on first ball", () => {
    expect(firstStrikeRate(10, 10)).toBeCloseTo(1);
  });
  it("handles fractional result", () => {
    expect(firstStrikeRate(1, 3)).toBeCloseTo(1 / 3);
  });
});

// ---------------------------------------------------------------------------
// 9. serveWinRate
// ---------------------------------------------------------------------------
describe("serveWinRate", () => {
  it("returns 0 for empty arrays", () => {
    const r = serveWinRate([], []);
    expect(r.onServe).toBe(0);
    expect(r.onReturn).toBe(0);
  });
  it("computes serve win rate correctly", () => {
    const r = serveWinRate([1, 1, 0, 1], [0, 0, 1]);
    expect(r.onServe).toBeCloseTo(0.75);
    expect(r.onReturn).toBeCloseTo(1 / 3);
  });
  it("handles all-wins scenario", () => {
    const r = serveWinRate([1, 1, 1], [1, 1]);
    expect(r.onServe).toBe(1);
    expect(r.onReturn).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 10. strokeDistribution
// ---------------------------------------------------------------------------
describe("strokeDistribution", () => {
  it("returns empty map for empty input", () => {
    expect(strokeDistribution([]).size).toBe(0);
  });
  it("counts correctly", () => {
    const m = strokeDistribution(["forehand", "backhand", "forehand"]);
    expect(m.get("forehand")).toBe(2);
    expect(m.get("backhand")).toBe(1);
  });
  it("handles single stroke type", () => {
    const m = strokeDistribution(["topspin", "topspin", "topspin"]);
    expect(m.get("topspin")).toBe(3);
    expect(m.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 11. errorRate and winnerRate
// ---------------------------------------------------------------------------
describe("errorRate", () => {
  it("returns 0 when total is 0", () => {
    expect(errorRate(0, 0)).toBe(0);
  });
  it("computes correctly", () => {
    expect(errorRate(3, 10)).toBeCloseTo(0.3);
  });
});

describe("winnerRate", () => {
  it("returns 0 when total is 0", () => {
    expect(winnerRate(0, 0)).toBe(0);
  });
  it("computes correctly", () => {
    expect(winnerRate(7, 10)).toBeCloseTo(0.7);
  });
});

// ---------------------------------------------------------------------------
// 12. serveEffectiveness
// ---------------------------------------------------------------------------
describe("serveEffectiveness", () => {
  it("returns empty map for empty input", () => {
    expect(serveEffectiveness([]).size).toBe(0);
  });
  it("computes win rate by type", () => {
    const serves = [
      { type: "heavy-topspin", won: true },
      { type: "heavy-topspin", won: false },
      { type: "short-backspin", won: true },
    ];
    const m = serveEffectiveness(serves);
    expect(m.get("heavy-topspin")?.count).toBe(2);
    expect(m.get("heavy-topspin")?.winRate).toBeCloseTo(0.5);
    expect(m.get("short-backspin")?.count).toBe(1);
    expect(m.get("short-backspin")?.winRate).toBeCloseTo(1);
  });
  it("handles all losses", () => {
    const m = serveEffectiveness([
      { type: "flat", won: false },
      { type: "flat", won: false },
    ]);
    expect(m.get("flat")?.winRate).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 13. serveVariety
// ---------------------------------------------------------------------------
describe("serveVariety", () => {
  it("returns 0 for empty array", () => {
    expect(serveVariety([])).toBe(0);
  });
  it("returns 0 for single serve type", () => {
    expect(serveVariety([{ type: "flat" }, { type: "flat" }])).toBe(0);
  });
  it("returns log2(2)=1 for two equally distributed types", () => {
    const serves = [{ type: "a" }, { type: "b" }];
    expect(serveVariety(serves)).toBeCloseTo(1);
  });
  it("returns log2(3) for three equally distributed types", () => {
    const serves = [{ type: "a" }, { type: "b" }, { type: "c" }];
    expect(serveVariety(serves)).toBeCloseTo(Math.log2(3));
  });
  it("higher entropy for more variety", () => {
    const lowVariety = [{ type: "a" }, { type: "a" }, { type: "b" }];
    const highVariety = [{ type: "a" }, { type: "b" }, { type: "c" }];
    expect(serveVariety(highVariety)).toBeGreaterThan(serveVariety(lowVariety));
  });
});

// ---------------------------------------------------------------------------
// 14. imitationRate
// ---------------------------------------------------------------------------
describe("imitationRate", () => {
  it("returns 0 for empty arrays", () => {
    expect(imitationRate([], [])).toBe(0);
  });
  it("computes rate of unreturned serves", () => {
    const serves = [
      { side: "forehand" as const },
      { side: "backhand" as const },
      { side: "forehand" as const },
    ];
    const returns = [
      { returned: false },
      { returned: true },
      { returned: false },
    ];
    expect(imitationRate(serves, returns)).toBeCloseTo(2 / 3);
  });
  it("uses min length when mismatched", () => {
    const serves = [
      { side: "forehand" as const },
      { side: "forehand" as const },
    ];
    const returns = [{ returned: false }];
    // Only 1 comparison, 1 unreturned → rate = 1
    expect(imitationRate(serves, returns)).toBeCloseTo(1);
  });
  it("returns 0 when all are returned", () => {
    const serves = [{ side: "forehand" as const }];
    const returns = [{ returned: true }];
    expect(imitationRate(serves, returns)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 15. serveEdge
// ---------------------------------------------------------------------------
describe("serveEdge", () => {
  it("positive edge when my rate is higher", () => {
    expect(serveEdge(0.7, 0.5)).toBeCloseTo(0.2);
  });
  it("negative edge when opponent rate is higher", () => {
    expect(serveEdge(0.4, 0.6)).toBeCloseTo(-0.2);
  });
  it("zero edge when equal", () => {
    expect(serveEdge(0.6, 0.6)).toBeCloseTo(0);
  });
});

// ---------------------------------------------------------------------------
// 16. ttEloExpected
// ---------------------------------------------------------------------------
describe("ttEloExpected", () => {
  it("returns 0.5 for equal ratings", () => {
    expect(ttEloExpected(1500, 1500)).toBeCloseTo(0.5);
  });
  it("returns > 0.5 when A is stronger", () => {
    expect(ttEloExpected(1600, 1400)).toBeGreaterThan(0.5);
  });
  it("returns < 0.5 when A is weaker", () => {
    expect(ttEloExpected(1400, 1600)).toBeLessThan(0.5);
  });
  it("expected for 400-point gap is ~0.909", () => {
    // 1/(1+10^(400/400)) = 1/(1+10) = 1/11 ≈ 0.0909 for weaker player
    expect(ttEloExpected(1500, 1900)).toBeCloseTo(1 / 11, 4);
  });
  it("expected for stronger side of 400-point gap is ~0.909", () => {
    expect(ttEloExpected(1900, 1500)).toBeCloseTo(10 / 11, 4);
  });
});

// ---------------------------------------------------------------------------
// 17. ttEloUpdate
// ---------------------------------------------------------------------------
describe("ttEloUpdate", () => {
  it("winner gains points, loser loses points", () => {
    const { newA, newB } = ttEloUpdate(1500, 1500, 1);
    expect(newA).toBeGreaterThan(1500);
    expect(newB).toBeLessThan(1500);
  });
  it("rating sum is conserved", () => {
    const { newA, newB } = ttEloUpdate(1600, 1400, 1);
    expect(newA + newB).toBeCloseTo(3000);
  });
  it("draw keeps ratings symmetric for equal players", () => {
    const { newA, newB } = ttEloUpdate(1500, 1500, 0.5);
    expect(newA).toBeCloseTo(1500);
    expect(newB).toBeCloseTo(1500);
  });
  it("uses default K=32", () => {
    const { newA } = ttEloUpdate(1500, 1500, 1);
    expect(newA).toBeCloseTo(1516); // 1500 + 32*(1-0.5) = 1516
  });
  it("respects custom K-factor", () => {
    const { newA } = ttEloUpdate(1500, 1500, 1, 16);
    expect(newA).toBeCloseTo(1508); // 1500 + 16*(1-0.5) = 1508
  });
  it("underdog winning gains more points", () => {
    const { newA: weakWins } = ttEloUpdate(1200, 1800, 1);
    const { newA: strongWins } = ttEloUpdate(1800, 1200, 1);
    const weakGain = weakWins - 1200;
    const strongGain = strongWins - 1800;
    expect(weakGain).toBeGreaterThan(strongGain);
  });
});

// ---------------------------------------------------------------------------
// 18. ttRatingClass
// ---------------------------------------------------------------------------
describe("ttRatingClass", () => {
  it("below 1000 → beginner", () => {
    expect(ttRatingClass(999)).toBe("beginner");
    expect(ttRatingClass(0)).toBe("beginner");
  });
  it("exactly 1000 → club", () => {
    expect(ttRatingClass(1000)).toBe("club");
  });
  it("1000-1499 → club", () => {
    expect(ttRatingClass(1250)).toBe("club");
  });
  it("exactly 1500 → national", () => {
    expect(ttRatingClass(1500)).toBe("national");
  });
  it("1500-1999 → national", () => {
    expect(ttRatingClass(1750)).toBe("national");
  });
  it("exactly 2000 → international", () => {
    expect(ttRatingClass(2000)).toBe("international");
  });
  it("2000-2499 → international", () => {
    expect(ttRatingClass(2300)).toBe("international");
  });
  it("exactly 2500 → world_class", () => {
    expect(ttRatingClass(2500)).toBe("world_class");
  });
  it("above 2500 → world_class", () => {
    expect(ttRatingClass(2800)).toBe("world_class");
  });
});

// ---------------------------------------------------------------------------
// 19. tournamentRatingChange
// ---------------------------------------------------------------------------
describe("tournamentRatingChange", () => {
  it("returns 0 for empty results", () => {
    expect(tournamentRatingChange(1500, [])).toBe(0);
  });
  it("winning all games increases rating", () => {
    const change = tournamentRatingChange(1500, [
      { opponentRating: 1500, won: true },
      { opponentRating: 1500, won: true },
    ]);
    expect(change).toBeGreaterThan(0);
  });
  it("losing all games decreases rating", () => {
    const change = tournamentRatingChange(1500, [
      { opponentRating: 1500, won: false },
      { opponentRating: 1500, won: false },
    ]);
    expect(change).toBeLessThan(0);
  });
  it("applies updates sequentially (not all at initial rating)", () => {
    // Two wins from 1500 vs 1500 each time.
    // First win: newA = 1500 + 32*(1-0.5) = 1516
    // Second win: opponent still 1500, expected = 1/(1+10^((1500-1516)/400)) ≈ 0.523
    //   newA = 1516 + 32*(1-0.523) ≈ 1531.26
    // Net change ≈ 31.26 (sequential, not 32)
    const change = tournamentRatingChange(1500, [
      { opponentRating: 1500, won: true },
      { opponentRating: 1500, won: true },
    ]);
    expect(change).toBeGreaterThan(30);
    expect(change).toBeLessThan(33);
  });
});

// ---------------------------------------------------------------------------
// 20. pointsPerGame
// ---------------------------------------------------------------------------
describe("pointsPerGame", () => {
  it("returns 0 for empty array", () => {
    const r = pointsPerGame([]);
    expect(r.avgP1).toBe(0);
    expect(r.avgP2).toBe(0);
  });
  it("computes averages correctly", () => {
    const r = pointsPerGame([
      { p1: 11, p2: 7 },
      { p1: 9, p2: 11 },
      { p1: 11, p2: 5 },
    ]);
    expect(r.avgP1).toBeCloseTo(31 / 3);
    expect(r.avgP2).toBeCloseTo(23 / 3);
  });
  it("handles single game", () => {
    const r = pointsPerGame([{ p1: 11, p2: 3 }]);
    expect(r.avgP1).toBe(11);
    expect(r.avgP2).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// 21. longestStreak
// ---------------------------------------------------------------------------
describe("longestStreak", () => {
  it("returns 0 for empty array", () => {
    expect(longestStreak([], 1)).toBe(0);
  });
  it("counts basic streak for player 1", () => {
    const points: (1 | 2)[] = [1, 1, 2, 1, 1, 1];
    expect(longestStreak(points, 1)).toBe(3);
  });
  it("counts streak for player 2", () => {
    const points: (1 | 2)[] = [1, 2, 2, 2, 1, 2];
    expect(longestStreak(points, 2)).toBe(3);
  });
  it("streak resets on opponent point", () => {
    const points: (1 | 2)[] = [1, 1, 2, 1];
    expect(longestStreak(points, 1)).toBe(2);
  });
  it("entire sequence is one streak", () => {
    const points: (1 | 2)[] = [1, 1, 1, 1, 1];
    expect(longestStreak(points, 1)).toBe(5);
  });
  it("player with no points has streak 0", () => {
    const points: (1 | 2)[] = [1, 1, 1];
    expect(longestStreak(points, 2)).toBe(0);
  });
  it("alternating points gives streak of 1", () => {
    const points: (1 | 2)[] = [1, 2, 1, 2, 1];
    expect(longestStreak(points, 1)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 22. momentumShift
// ---------------------------------------------------------------------------
describe("momentumShift", () => {
  it("returns empty array when points < windowSize", () => {
    const result = momentumShift([1, 1, 2] as (1 | 2)[], 5);
    expect(result).toHaveLength(0);
  });
  it("default window=5 with 5 points returns one value", () => {
    const points: (1 | 2)[] = [1, 1, 1, 2, 2];
    const result = momentumShift(points);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeCloseTo(0.6);
  });
  it("window=3 on 5 points returns 3 values", () => {
    const points: (1 | 2)[] = [1, 2, 1, 2, 1];
    const result = momentumShift(points, 3);
    expect(result).toHaveLength(3);
  });
  it("all player 1 points gives 1.0 momentum throughout", () => {
    const points: (1 | 2)[] = [1, 1, 1, 1, 1];
    const result = momentumShift(points, 5);
    expect(result[0]).toBe(1);
  });
  it("all player 2 points gives 0.0 momentum", () => {
    const points: (1 | 2)[] = [2, 2, 2, 2, 2];
    const result = momentumShift(points, 5);
    expect(result[0]).toBe(0);
  });
  it("sliding window moves correctly", () => {
    // [1,1,1,2,2,2]: windows of 3: [1,1,1]=1.0, [1,1,2]=0.67, [1,2,2]=0.33, [2,2,2]=0.0
    const points: (1 | 2)[] = [1, 1, 1, 2, 2, 2];
    const result = momentumShift(points, 3);
    expect(result).toHaveLength(4);
    expect(result[0]).toBeCloseTo(1.0);
    expect(result[1]).toBeCloseTo(2 / 3);
    expect(result[2]).toBeCloseTo(1 / 3);
    expect(result[3]).toBeCloseTo(0);
  });
});

// ---------------------------------------------------------------------------
// 23. clutchPerformance
// ---------------------------------------------------------------------------
describe("clutchPerformance", () => {
  it("returns 0 for empty array", () => {
    expect(clutchPerformance([])).toBe(0);
  });
  it("ignores non-clutch points (below threshold)", () => {
    const points = [
      { score: [5, 3] as [number, number], winner: 1 as const },
      { score: [3, 5] as [number, number], winner: 2 as const },
    ];
    expect(clutchPerformance(points)).toBe(0);
  });
  it("counts clutch points correctly", () => {
    const points = [
      // clutch: 10-9, diff=1, high=10 ≥ 9
      { score: [10, 9] as [number, number], winner: 1 as const },
      // clutch: 9-10, diff=1, high=10 ≥ 9
      { score: [9, 10] as [number, number], winner: 2 as const },
      // clutch: 9-9, diff=0
      { score: [9, 9] as [number, number], winner: 1 as const },
    ];
    // 3 clutch points; player 1 wins 2 → 2/3
    expect(clutchPerformance(points)).toBeCloseTo(2 / 3);
  });
  it("custom threshold works", () => {
    const points = [
      { score: [8, 7] as [number, number], winner: 1 as const },
    ];
    // With threshold=7: 8≥7 and diff=1 → clutch
    expect(clutchPerformance(points, 7)).toBeCloseTo(1);
    // With default threshold=9: 8 < 9 → not clutch → returns 0
    expect(clutchPerformance(points)).toBe(0);
  });
  it("returns 0 when player 1 wins no clutch points", () => {
    const points = [
      { score: [10, 9] as [number, number], winner: 2 as const },
    ];
    expect(clutchPerformance(points)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 24. comebackFrequency
// ---------------------------------------------------------------------------
describe("comebackFrequency", () => {
  it("returns 0 for empty array", () => {
    expect(comebackFrequency([])).toBe(0);
  });
  it("returns 0 when no eligible games (loser scored < 5)", () => {
    // 11-3: loser scored 3 < 5 → not eligible
    expect(comebackFrequency([{ p1: 11, p2: 3 }])).toBe(0);
  });
  it("deuce game counts as comeback", () => {
    // 12-10: winnerScore=12 > 11, loserScore=10 ≥ 5 → comeback
    const result = comebackFrequency([{ p1: 12, p2: 10 }]);
    expect(result).toBeCloseTo(1);
  });
  it("handles multiple games", () => {
    const games = [
      { p1: 12, p2: 10 }, // eligible + comeback
      { p1: 11, p2: 9 },  // eligible (loser=9≥5), winner=11 (not > 11) → not comeback
    ];
    const result = comebackFrequency(games);
    // 1 comeback / 2 eligible = 0.5
    expect(result).toBeCloseTo(0.5);
  });
});

// ---------------------------------------------------------------------------
// 25. worldRankingPoints
// ---------------------------------------------------------------------------
describe("worldRankingPoints", () => {
  it("grand_slam 1st place = 2000", () => {
    expect(worldRankingPoints("grand_slam", 1)).toBe(2000);
  });
  it("grand_slam 2nd place = 1400", () => {
    expect(worldRankingPoints("grand_slam", 2)).toBe(1400);
  });
  it("grand_slam 3rd place = 1000", () => {
    expect(worldRankingPoints("grand_slam", 3)).toBe(1000);
  });
  it("grand_slam 4th place = 750", () => {
    expect(worldRankingPoints("grand_slam", 4)).toBe(750);
  });
  it("grand_slam 5th-8th place = 500", () => {
    expect(worldRankingPoints("grand_slam", 5)).toBe(500);
    expect(worldRankingPoints("grand_slam", 6)).toBe(500);
    expect(worldRankingPoints("grand_slam", 7)).toBe(500);
    expect(worldRankingPoints("grand_slam", 8)).toBe(500);
  });
  it("grand_slam 9th place = 0", () => {
    expect(worldRankingPoints("grand_slam", 9)).toBe(0);
  });
  it("wtt_star 1st = 1000", () => {
    expect(worldRankingPoints("wtt_star", 1)).toBe(1000);
  });
  it("wtt_star 2nd = 700", () => {
    expect(worldRankingPoints("wtt_star", 2)).toBe(700);
  });
  it("wtt_star 3rd = 500", () => {
    expect(worldRankingPoints("wtt_star", 3)).toBe(500);
  });
  it("wtt_star 4th = 375", () => {
    expect(worldRankingPoints("wtt_star", 4)).toBe(375);
  });
  it("wtt_star 5th-8th = 250", () => {
    expect(worldRankingPoints("wtt_star", 5)).toBe(250);
    expect(worldRankingPoints("wtt_star", 8)).toBe(250);
  });
  it("wtt_contender 1st = 500", () => {
    expect(worldRankingPoints("wtt_contender", 1)).toBe(500);
  });
  it("wtt_contender 2nd = 350", () => {
    expect(worldRankingPoints("wtt_contender", 2)).toBe(350);
  });
  it("wtt_contender 3rd = 250", () => {
    expect(worldRankingPoints("wtt_contender", 3)).toBe(250);
  });
  it("wtt_contender 4th = 187", () => {
    expect(worldRankingPoints("wtt_contender", 4)).toBe(187);
  });
  it("wtt_contender 5th-8th = 125", () => {
    expect(worldRankingPoints("wtt_contender", 5)).toBe(125);
  });
  it("olympics 1st = 2200", () => {
    expect(worldRankingPoints("olympics", 1)).toBe(2200);
  });
  it("olympics 2nd = 1540", () => {
    expect(worldRankingPoints("olympics", 2)).toBe(1540);
  });
  it("olympics bronze (3rd) = 1100", () => {
    expect(worldRankingPoints("olympics", 3)).toBe(1100);
  });
  it("olympics 4th = 1100", () => {
    expect(worldRankingPoints("olympics", 4)).toBe(1100);
  });
  it("olympics beyond 4th = 0", () => {
    expect(worldRankingPoints("olympics", 5)).toBe(0);
    expect(worldRankingPoints("olympics", 9)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 26. rankingProjection
// ---------------------------------------------------------------------------
describe("rankingProjection", () => {
  it("returns currentPoints for empty tournaments", () => {
    expect(rankingProjection(5000, [])).toBe(5000);
  });
  it("adds points for each tournament", () => {
    const total = rankingProjection(5000, [
      { type: "grand_slam", estimatedPlace: 1 },
      { type: "wtt_star", estimatedPlace: 2 },
    ]);
    expect(total).toBe(5000 + 2000 + 700);
  });
  it("handles multiple tournaments of same type", () => {
    const total = rankingProjection(0, [
      { type: "wtt_contender", estimatedPlace: 1 },
      { type: "wtt_contender", estimatedPlace: 1 },
    ]);
    expect(total).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// 27. dkTTPoints
// ---------------------------------------------------------------------------
describe("dkTTPoints", () => {
  it("win with 3 games won, 20 points scored, 15 points against", () => {
    const pts = dkTTPoints({
      gamesWon: 3,
      gamesLost: 0,
      totalPoints: 20,
      pointsAgainst: 15,
      won: true,
    });
    // 20 (win) + 6 (games) + 2.0 (points) - 1.5 (against) = 26.5
    expect(pts).toBeCloseTo(26.5);
  });
  it("loss gives 0 win bonus", () => {
    const pts = dkTTPoints({
      gamesWon: 1,
      gamesLost: 3,
      totalPoints: 40,
      pointsAgainst: 55,
      won: false,
    });
    // 0 + 2 + 4 - 5.5 = 0.5
    expect(pts).toBeCloseTo(0.5);
  });
  it("calculates correctly for minimal case: win with 0 points", () => {
    const pts = dkTTPoints({
      gamesWon: 0,
      gamesLost: 0,
      totalPoints: 0,
      pointsAgainst: 0,
      won: true,
    });
    expect(pts).toBe(20);
  });
  it("points against reduce score", () => {
    const pts = dkTTPoints({
      gamesWon: 2,
      gamesLost: 1,
      totalPoints: 30,
      pointsAgainst: 60,
      won: true,
    });
    // 20 + 4 + 3 - 6 = 21
    expect(pts).toBeCloseTo(21);
  });
});

// ---------------------------------------------------------------------------
// 28. dkProjection
// ---------------------------------------------------------------------------
describe("dkProjection", () => {
  it("returns 0 for empty array", () => {
    expect(dkProjection([])).toBe(0);
  });
  it("single result returns its dk score × 3/3 = itself", () => {
    const result = {
      gamesWon: 3,
      gamesLost: 0,
      totalPoints: 33,
      pointsAgainst: 27,
      won: true,
    };
    expect(dkProjection([result])).toBeCloseTo(dkTTPoints(result));
  });
  it("most recent result (index -1) gets weight 3", () => {
    const old = {
      gamesWon: 0,
      gamesLost: 3,
      totalPoints: 15,
      pointsAgainst: 33,
      won: false,
    };
    const recent = {
      gamesWon: 3,
      gamesLost: 0,
      totalPoints: 33,
      pointsAgainst: 15,
      won: true,
    };
    // old weight=1, recent weight=3 → (1×dkOld + 3×dkRecent) / 4
    const dkOld = dkTTPoints(old);
    const dkRecent = dkTTPoints(recent);
    const expected = (dkOld + 3 * dkRecent) / 4;
    expect(dkProjection([old, recent])).toBeCloseTo(expected);
  });
  it("three results: oldest two weight 1, most recent weight 3", () => {
    const r1 = {
      gamesWon: 1,
      gamesLost: 2,
      totalPoints: 20,
      pointsAgainst: 25,
      won: false,
    };
    const r2 = {
      gamesWon: 2,
      gamesLost: 1,
      totalPoints: 25,
      pointsAgainst: 20,
      won: true,
    };
    const r3 = {
      gamesWon: 3,
      gamesLost: 0,
      totalPoints: 33,
      pointsAgainst: 15,
      won: true,
    };
    const s1 = dkTTPoints(r1);
    const s2 = dkTTPoints(r2);
    const s3 = dkTTPoints(r3);
    const expected = (s1 + s2 + 3 * s3) / 5;
    expect(dkProjection([r1, r2, r3])).toBeCloseTo(expected);
  });
});
