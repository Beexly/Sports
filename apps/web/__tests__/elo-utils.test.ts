import { describe, it, expect } from "vitest";
import {
  expectedScore,
  expectedScoreWithHome,
  kFactor,
  updateElo,
  updateEloWithConfig,
  marginOfVictoryMultiplier,
  updateEloWithMov,
  predictWinProbability,
  revertToMean,
  spreadFromElo,
  winProbFromSpread,
  buildLeaderboard,
  ratingDifference,
  eloToPercentile,
  type EloConfig,
  type TeamRating,
} from "@/lib/sports/elo-utils";

// ── expectedScore ──────────────────────────────────────────────────────────

describe("expectedScore", () => {
  it("returns 0.5 when ratings are equal", () => {
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5, 5);
  });

  it("returns ~0.909 when A is 400 points higher than B", () => {
    // 1 / (1 + 10^((1500-1900)/400)) = 1 / (1 + 10^(-1)) = 1 / 1.1 ≈ 0.909
    expect(expectedScore(1900, 1500)).toBeCloseTo(0.909, 2);
  });

  it("returns ~0.091 when A is 400 points lower than B", () => {
    expect(expectedScore(1500, 1900)).toBeCloseTo(0.091, 2);
  });

  it("returns ~0.76 when A is 200 points higher", () => {
    // 1 / (1 + 10^(-200/400)) = 1 / (1 + 10^(-0.5)) ≈ 0.76
    expect(expectedScore(1700, 1500)).toBeCloseTo(0.76, 2);
  });

  it("returns a value strictly between 0 and 1", () => {
    const score = expectedScore(2000, 1000);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it("is symmetric: expectedScore(A,B) + expectedScore(B,A) = 1", () => {
    const a = expectedScore(1600, 1400);
    const b = expectedScore(1400, 1600);
    expect(a + b).toBeCloseTo(1, 10);
  });

  it("handles very large rating differences", () => {
    const score = expectedScore(3000, 1000);
    expect(score).toBeGreaterThan(0.99);
  });

  it("handles identical low ratings", () => {
    expect(expectedScore(800, 800)).toBeCloseTo(0.5, 5);
  });
});

// ── expectedScoreWithHome ──────────────────────────────────────────────────

describe("expectedScoreWithHome", () => {
  it("gives home team a higher expected score when equal ratings", () => {
    const homeScore = expectedScoreWithHome(1500, 1500, 65, true);
    expect(homeScore).toBeGreaterThan(0.5);
  });

  it("gives away team a lower expected score when equal ratings", () => {
    const awayScore = expectedScoreWithHome(1500, 1500, 65, false);
    expect(awayScore).toBeLessThan(0.5);
  });

  it("with no home advantage returns same as expectedScore", () => {
    const noAdv = expectedScoreWithHome(1600, 1400, 0, true);
    const plain = expectedScore(1600, 1400);
    expect(noAdv).toBeCloseTo(plain, 10);
  });

  it("home advantage correctly boosts A rating before calculation", () => {
    // A is home with +65 advantage → effectively A=1565 vs B=1500
    const withHome = expectedScoreWithHome(1500, 1500, 65, true);
    const equivalent = expectedScore(1565, 1500);
    expect(withHome).toBeCloseTo(equivalent, 10);
  });

  it("B home advantage boosts B's rating", () => {
    const awayForA = expectedScoreWithHome(1500, 1500, 65, false);
    const equivalent = expectedScore(1500, 1565);
    expect(awayForA).toBeCloseTo(equivalent, 10);
  });

  it("returns value between 0 and 1", () => {
    const score = expectedScoreWithHome(1500, 1500, 100, true);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});

// ── kFactor ───────────────────────────────────────────────────────────────

describe("kFactor", () => {
  it("returns 32 for teams with fewer than 30 games played", () => {
    expect(kFactor(0)).toBe(32);
    expect(kFactor(15)).toBe(32);
    expect(kFactor(29)).toBe(32);
  });

  it("returns 20 for teams at or above 30 games played", () => {
    expect(kFactor(30)).toBe(20);
    expect(kFactor(100)).toBe(20);
  });

  it("respects custom newTeamK", () => {
    expect(kFactor(5, { newTeamK: 40 })).toBe(40);
  });

  it("respects custom establishedK", () => {
    expect(kFactor(50, { establishedK: 16 })).toBe(16);
  });

  it("respects custom threshold", () => {
    expect(kFactor(10, { threshold: 15 })).toBe(32); // still new
    expect(kFactor(15, { threshold: 15 })).toBe(20); // now established
  });

  it("returns custom establishedK at exact threshold", () => {
    expect(kFactor(30, { threshold: 30, establishedK: 16 })).toBe(16);
  });

  it("handles zero games played", () => {
    expect(kFactor(0)).toBe(32);
  });
});

// ── updateElo ─────────────────────────────────────────────────────────────

describe("updateElo", () => {
  it("winner gains positive rating change", () => {
    const result = updateElo(1500, 1500, 1, 0, 32);
    expect(result.ratingChangeA).toBeGreaterThan(0);
  });

  it("loser loses rating", () => {
    const result = updateElo(1500, 1500, 1, 0, 32);
    expect(result.ratingChangeB).toBeLessThan(0);
  });

  it("rating changes sum to zero (zero-sum)", () => {
    const result = updateElo(1500, 1600, 1, 0, 32);
    expect(result.ratingChangeA + result.ratingChangeB).toBeCloseTo(0, 10);
  });

  it("zero-sum holds for a draw", () => {
    const result = updateElo(1500, 1600, 0, 0, 32);
    expect(result.ratingChangeA + result.ratingChangeB).toBeCloseTo(0, 10);
  });

  it("draw produces small changes when ratings are equal", () => {
    const result = updateElo(1500, 1500, 0.5, 0.5, 32);
    expect(Math.abs(result.ratingChangeA)).toBeLessThan(1);
    expect(Math.abs(result.ratingChangeB)).toBeLessThan(1);
  });

  it("underdog win produces larger gain than expected", () => {
    // Underdog A beats favourite B
    const result = updateElo(1300, 1700, 1, 0, 32);
    // A gains more than 16 (since they were heavily disadvantaged)
    expect(result.ratingChangeA).toBeGreaterThan(16);
  });

  it("favourite win produces smaller gain (less surprise)", () => {
    const result = updateElo(1700, 1300, 1, 0, 32);
    expect(result.ratingChangeA).toBeLessThan(10);
  });

  it("newRatingA equals ratingA + ratingChangeA", () => {
    const result = updateElo(1500, 1600, 1, 0, 20);
    expect(result.newRatingA).toBeCloseTo(1500 + result.ratingChangeA, 10);
  });

  it("newRatingB equals ratingB + ratingChangeB", () => {
    const result = updateElo(1500, 1600, 1, 0, 20);
    expect(result.newRatingB).toBeCloseTo(1600 + result.ratingChangeB, 10);
  });

  it("expectedA + expectedB = 1", () => {
    const result = updateElo(1500, 1600, 1, 0, 32);
    expect(result.expectedA + result.expectedB).toBeCloseTo(1, 10);
  });

  it("handles K=0 → no rating change", () => {
    const result = updateElo(1500, 1500, 1, 0, 0);
    expect(result.ratingChangeA).toBeCloseTo(0, 10);
    expect(result.ratingChangeB).toBeCloseTo(0, 10);
  });
});

// ── updateEloWithConfig ────────────────────────────────────────────────────

describe("updateEloWithConfig", () => {
  const config: EloConfig = {
    k: 32,
    homeAdvantage: 65,
    initialRating: 1500,
  };

  it("applies home advantage when A is home", () => {
    const home = updateEloWithConfig(1500, 1500, 1, 0, config, true, 50);
    const away = updateEloWithConfig(1500, 1500, 1, 0, config, false, 50);
    // Home team already has expected advantage, so home winner gains less
    expect(home.ratingChangeA).toBeLessThan(away.ratingChangeA);
  });

  it("rating changes are zero-sum", () => {
    const result = updateEloWithConfig(1500, 1600, 1, 0, config, true, 50);
    expect(result.ratingChangeA + result.ratingChangeB).toBeCloseTo(0, 10);
  });

  it("uses the config K-factor", () => {
    const configK40: EloConfig = { ...config, k: 40 };
    const result = updateEloWithConfig(1500, 1500, 1, 0, configK40, false, 50);
    // Equal ratings, A is away (B gets home advantage → expectedA < 0.5), A wins → change > 20
    // k * (1 - expectedA) where expectedA < 0.5 → change > 40*0.5 = 20
    expect(result.ratingChangeA).toBeGreaterThan(20);
    expect(result.ratingChangeA).toBeLessThan(40);
  });

  it("away team loss produces negative change for A when B is home favourite", () => {
    const result = updateEloWithConfig(1500, 1700, 0, 1, config, false, 50);
    expect(result.ratingChangeA).toBeLessThan(0);
  });

  it("expectedA and expectedB are set correctly from home-adjusted ratings", () => {
    const result = updateEloWithConfig(1500, 1500, 1, 0, config, true, 50);
    // With +65 home advantage for A: expectedA > 0.5
    expect(result.expectedA).toBeGreaterThan(0.5);
  });
});

// ── marginOfVictoryMultiplier ──────────────────────────────────────────────

describe("marginOfVictoryMultiplier", () => {
  it("returns minimum 1.0 for any result", () => {
    expect(marginOfVictoryMultiplier(1, 0)).toBeGreaterThanOrEqual(1.0);
    expect(marginOfVictoryMultiplier(100, 500)).toBeGreaterThanOrEqual(1.0);
  });

  it("large win gives higher multiplier than small win", () => {
    const blowout = marginOfVictoryMultiplier(35, 100);
    const close = marginOfVictoryMultiplier(3, 100);
    expect(blowout).toBeGreaterThan(close);
  });

  it("single point win gives multiplier of at least 1.0 (min clamp)", () => {
    // ln(2) * (2.2 / (50*0.001 + 2.2)) ≈ 0.678, which is below 1.0 → clamped to 1.0
    const mov = marginOfVictoryMultiplier(1, 50);
    expect(mov).toBe(1.0);
  });

  it("returns minimum 1.0 when formula produces less than 1", () => {
    // Very small score diff, large elo diff → could give <1 raw value
    const mov = marginOfVictoryMultiplier(0, 1000);
    expect(mov).toBeGreaterThanOrEqual(1.0);
  });

  it("higher elo diff reduces multiplier (autocorrelation adjustment)", () => {
    const strongFav = marginOfVictoryMultiplier(21, 300);
    const weakFav = marginOfVictoryMultiplier(21, 50);
    expect(weakFav).toBeGreaterThan(strongFav);
  });

  it("uses ln(|scoreDiff| + 1) formula component", () => {
    const scoreDiff = 14;
    const eloDiff = 100;
    const expected = Math.log(scoreDiff + 1) * (2.2 / (eloDiff * 0.001 + 2.2));
    expect(marginOfVictoryMultiplier(scoreDiff, eloDiff)).toBeCloseTo(
      Math.max(1.0, expected),
      10
    );
  });
});

// ── updateEloWithMov ──────────────────────────────────────────────────────

describe("updateEloWithMov", () => {
  it("winner gains more in blowout than in close game", () => {
    const blowout = updateEloWithMov(1500, 1500, 1, 0, 35, 7, 32);
    const close = updateEloWithMov(1500, 1500, 1, 0, 21, 17, 32);
    expect(blowout.ratingChangeA).toBeGreaterThan(close.ratingChangeA);
  });

  it("loser loses more in blowout than in close game", () => {
    const blowout = updateEloWithMov(1500, 1500, 1, 0, 35, 7, 32);
    const close = updateEloWithMov(1500, 1500, 1, 0, 21, 17, 32);
    expect(blowout.ratingChangeB).toBeLessThan(close.ratingChangeB);
  });

  it("draw uses standard update (no MOV multiplier)", () => {
    const movResult = updateEloWithMov(1500, 1500, 0.5, 0.5, 21, 21, 32);
    const plainResult = updateElo(1500, 1500, 0.5, 0.5, 32);
    expect(movResult.ratingChangeA).toBeCloseTo(plainResult.ratingChangeA, 10);
  });

  it("rating changes are still zero-sum with MOV", () => {
    const result = updateEloWithMov(1500, 1600, 1, 0, 28, 10, 32);
    expect(result.ratingChangeA + result.ratingChangeB).toBeCloseTo(0, 8);
  });

  it("newRatingA reflects the change correctly", () => {
    const result = updateEloWithMov(1500, 1500, 1, 0, 21, 7, 32);
    expect(result.newRatingA).toBeCloseTo(1500 + result.ratingChangeA, 10);
  });

  it("B wins → B gains rating, A loses rating", () => {
    const result = updateEloWithMov(1500, 1500, 0, 1, 7, 28, 32);
    expect(result.ratingChangeB).toBeGreaterThan(0);
    expect(result.ratingChangeA).toBeLessThan(0);
  });
});

// ── predictWinProbability ─────────────────────────────────────────────────

describe("predictWinProbability", () => {
  it("returns 0.5 for equal teams with no home advantage", () => {
    expect(predictWinProbability(1500, 1500)).toBeCloseTo(0.5, 5);
  });

  it("favourite has probability > 0.5", () => {
    expect(predictWinProbability(1700, 1500)).toBeGreaterThan(0.5);
  });

  it("underdog has probability < 0.5", () => {
    expect(predictWinProbability(1300, 1500)).toBeLessThan(0.5);
  });

  it("home advantage increases win probability for home team", () => {
    const withHome = predictWinProbability(1500, 1500, 65, true);
    const noHome = predictWinProbability(1500, 1500, 0, false);
    expect(withHome).toBeGreaterThan(noHome);
  });

  it("returns value between 0 and 1", () => {
    const p = predictWinProbability(2000, 1000, 65, true);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });

  it("home disadvantage (away team) reduces A probability", () => {
    const awayA = predictWinProbability(1500, 1500, 65, false);
    expect(awayA).toBeLessThan(0.5);
  });
});

// ── revertToMean ──────────────────────────────────────────────────────────

describe("revertToMean", () => {
  it("1700 with fraction 0.3 → 1640", () => {
    // 1700 + 0.3 * (1500 - 1700) = 1700 - 60 = 1640
    expect(revertToMean(1700, 0.3)).toBeCloseTo(1640, 5);
  });

  it("fraction 0 → no change", () => {
    expect(revertToMean(1700, 0)).toBe(1700);
  });

  it("fraction 1 → full reversion to mean", () => {
    expect(revertToMean(1700, 1)).toBeCloseTo(1500, 5);
  });

  it("fraction 0.5 → halfway to mean", () => {
    expect(revertToMean(1600, 0.5)).toBeCloseTo(1550, 5);
  });

  it("below mean reverts upward", () => {
    // 1300 + 0.3 * (1500 - 1300) = 1300 + 60 = 1360
    expect(revertToMean(1300, 0.3)).toBeCloseTo(1360, 5);
  });

  it("custom mean is respected", () => {
    // 1600 + 0.5 * (1400 - 1600) = 1600 - 100 = 1500
    expect(revertToMean(1600, 0.5, 1400)).toBeCloseTo(1500, 5);
  });

  it("at the mean → no change regardless of fraction", () => {
    expect(revertToMean(1500, 0.5)).toBeCloseTo(1500, 5);
  });
});

// ── spreadFromElo ─────────────────────────────────────────────────────────

describe("spreadFromElo", () => {
  it("0 elo diff → 0 spread", () => {
    expect(spreadFromElo(0)).toBeCloseTo(0, 10);
  });

  it("100 elo diff → -4 spread for team A", () => {
    // -100 * 0.04 = -4
    expect(spreadFromElo(100)).toBeCloseTo(-4, 5);
  });

  it("negative elo diff → positive spread (A is underdog)", () => {
    expect(spreadFromElo(-100)).toBeCloseTo(4, 5);
  });

  it("250 elo diff → -10 spread", () => {
    expect(spreadFromElo(250)).toBeCloseTo(-10, 5);
  });

  it("custom pointsPerElo is applied", () => {
    // With pointsPerElo = 0.08: -100 * 0.08 = -8
    expect(spreadFromElo(100, 0.08)).toBeCloseTo(-8, 5);
  });

  it("approximately 25 elo ≈ 1 point with default conversion", () => {
    expect(spreadFromElo(25)).toBeCloseTo(-1, 5);
  });
});

// ── winProbFromSpread ─────────────────────────────────────────────────────

describe("winProbFromSpread", () => {
  it("0 spread → 0.5 win probability", () => {
    expect(winProbFromSpread(0)).toBeCloseTo(0.5, 3);
  });

  it("negative spread (favourite) → probability > 0.5", () => {
    expect(winProbFromSpread(-3)).toBeGreaterThan(0.5);
  });

  it("positive spread (underdog) → probability < 0.5", () => {
    expect(winProbFromSpread(3)).toBeLessThan(0.5);
  });

  it("clamps to maximum of 0.95", () => {
    expect(winProbFromSpread(-1000)).toBe(0.95);
  });

  it("clamps to minimum of 0.05", () => {
    expect(winProbFromSpread(1000)).toBe(0.05);
  });

  it("larger spread → more extreme probability", () => {
    const p3 = winProbFromSpread(-3);
    const p7 = winProbFromSpread(-7);
    expect(p7).toBeGreaterThan(p3);
  });

  it("custom stdDev changes the probability", () => {
    const pDefault = winProbFromSpread(-3);
    const pLowStd = winProbFromSpread(-3, 7);
    // Lower stdDev → more confident → higher probability for favourite
    expect(pLowStd).toBeGreaterThan(pDefault);
  });
});

// ── buildLeaderboard ──────────────────────────────────────────────────────

describe("buildLeaderboard", () => {
  const teams: TeamRating[] = [
    { teamId: "A", rating: 1400, gamesPlayed: 10, wins: 4, losses: 6, draws: 0 },
    { teamId: "B", rating: 1700, gamesPlayed: 10, wins: 8, losses: 2, draws: 0 },
    { teamId: "C", rating: 1550, gamesPlayed: 10, wins: 6, losses: 4, draws: 0 },
  ];

  it("sorts teams by rating descending", () => {
    const sorted = buildLeaderboard(teams);
    expect(sorted[0].teamId).toBe("B");
    expect(sorted[1].teamId).toBe("C");
    expect(sorted[2].teamId).toBe("A");
  });

  it("does not mutate the original array", () => {
    const original = [...teams];
    buildLeaderboard(teams);
    expect(teams[0].teamId).toBe(original[0].teamId);
  });

  it("returns a new array", () => {
    const sorted = buildLeaderboard(teams);
    expect(sorted).not.toBe(teams);
  });

  it("handles empty array", () => {
    expect(buildLeaderboard([])).toEqual([]);
  });

  it("handles single team", () => {
    const single = buildLeaderboard([teams[0]]);
    expect(single).toHaveLength(1);
    expect(single[0].teamId).toBe("A");
  });
});

// ── ratingDifference ──────────────────────────────────────────────────────

describe("ratingDifference", () => {
  it("returns positive value when A is higher rated", () => {
    expect(ratingDifference(1600, 1400)).toBe(200);
  });

  it("returns negative value when B is higher rated", () => {
    expect(ratingDifference(1400, 1600)).toBe(-200);
  });

  it("returns 0 for equal ratings", () => {
    expect(ratingDifference(1500, 1500)).toBe(0);
  });

  it("handles large differences", () => {
    expect(ratingDifference(2000, 1000)).toBe(1000);
  });

  it("handles fractional ratings", () => {
    expect(ratingDifference(1500.5, 1499.5)).toBeCloseTo(1, 10);
  });
});

// ── eloToPercentile ───────────────────────────────────────────────────────

describe("eloToPercentile", () => {
  it("returns 1/3 for a rating that strictly beats 1 of 3 teams", () => {
    // 1500 in [1400, 1500, 1600]: strictly beats 1400 only → 1/3
    const percentile = eloToPercentile(1500, [1400, 1500, 1600]);
    expect(percentile).toBeCloseTo(1 / 3, 5);
  });

  it("top-rated team has highest percentile", () => {
    const p = eloToPercentile(1700, [1400, 1500, 1600, 1700]);
    // Beats 3 out of 4 → 0.75
    expect(p).toBeCloseTo(0.75, 5);
  });

  it("bottom-rated team returns 0", () => {
    const p = eloToPercentile(1400, [1400, 1500, 1600]);
    expect(p).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(eloToPercentile(1500, [])).toBe(0);
  });

  it("a team that beats everyone returns (n-1)/n", () => {
    const ratings = [1400, 1450, 1500, 1550];
    const p = eloToPercentile(1600, ratings);
    expect(p).toBeCloseTo(4 / 4, 5); // beats all 4 → 1.0
  });

  it("a team in a league of one equal team returns 0", () => {
    const p = eloToPercentile(1500, [1500]);
    expect(p).toBe(0);
  });

  it("returns value between 0 and 1", () => {
    const p = eloToPercentile(1550, [1400, 1500, 1600, 1650]);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });
});
