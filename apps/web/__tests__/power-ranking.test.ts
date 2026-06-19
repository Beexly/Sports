import { describe, it, expect } from "vitest";
import {
  pointDifferential,
  normalizeToRange,
  compositeScore,
  buildPowerRankings,
  rankByRecord,
  strengthAdjustedRecord,
  tierLabel,
  rankDelta,
  topN,
  bottomN,
  filterByTier,
  averageScore,
  medianRank,
  powerRankingSummary,
  type TeamMetrics,
  type PowerScore,
  type PowerTier,
} from "@/lib/sports/power-ranking";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeMetrics = (overrides: Partial<TeamMetrics> = {}): TeamMetrics => ({
  teamId: "t1",
  teamName: "Team One",
  winRate: 0.6,
  pointsFor: 110,
  pointsAgainst: 100,
  strengthOfSchedule: 0.5,
  recentForm: 0.6,
  ...overrides,
});

// ─── pointDifferential ───────────────────────────────────────────────────────

describe("pointDifferential", () => {
  it("returns positive when pointsFor > pointsAgainst", () => {
    expect(pointDifferential(28, 17)).toBe(11);
  });

  it("returns negative when pointsFor < pointsAgainst", () => {
    expect(pointDifferential(17, 28)).toBe(-11);
  });

  it("returns 0 for equal values", () => {
    expect(pointDifferential(20, 20)).toBe(0);
  });

  it("handles decimal values", () => {
    expect(pointDifferential(110.5, 100.5)).toBeCloseTo(10);
  });

  it("handles large numbers", () => {
    expect(pointDifferential(200, 150)).toBe(50);
  });
});

// ─── normalizeToRange ────────────────────────────────────────────────────────

describe("normalizeToRange", () => {
  it("normalizes to [0, 100] by default", () => {
    const result = normalizeToRange([0, 50, 100]);
    expect(result[0]).toBeCloseTo(0);
    expect(result[1]).toBeCloseTo(50);
    expect(result[2]).toBeCloseTo(100);
  });

  it("all-same values map to midpoint 50", () => {
    const result = normalizeToRange([7, 7, 7]);
    expect(result).toEqual([50, 50, 50]);
  });

  it("single value maps to midpoint 50", () => {
    const result = normalizeToRange([42]);
    expect(result).toEqual([50]);
  });

  it("normalizes with custom range [0, 10]", () => {
    const result = normalizeToRange([0, 5, 10], 0, 10);
    expect(result[0]).toBeCloseTo(0);
    expect(result[1]).toBeCloseTo(5);
    expect(result[2]).toBeCloseTo(10);
  });

  it("handles custom range [20, 80]", () => {
    const result = normalizeToRange([0, 100], 20, 80);
    expect(result[0]).toBeCloseTo(20);
    expect(result[1]).toBeCloseTo(80);
  });

  it("returns empty array for empty input", () => {
    expect(normalizeToRange([])).toEqual([]);
  });

  it("minimum value maps to min of range", () => {
    const result = normalizeToRange([1, 3, 5], 0, 100);
    expect(result[0]).toBeCloseTo(0);
  });

  it("maximum value maps to max of range", () => {
    const result = normalizeToRange([1, 3, 5], 0, 100);
    expect(result[2]).toBeCloseTo(100);
  });

  it("preserves order of values", () => {
    const input = [30, 10, 20];
    const result = normalizeToRange(input);
    expect(result[0]).toBeGreaterThan(result[1]!);
    expect(result[0]).toBeGreaterThan(result[2]!);
  });

  it("negative input values handled correctly", () => {
    const result = normalizeToRange([-10, 0, 10]);
    expect(result[0]).toBeCloseTo(0);
    expect(result[1]).toBeCloseTo(50);
    expect(result[2]).toBeCloseTo(100);
  });
});

// ─── compositeScore ──────────────────────────────────────────────────────────

describe("compositeScore", () => {
  it("returns a value in [0, 100]", () => {
    const score = compositeScore(makeMetrics());
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("uses eloScore=50 when eloRating is not provided", () => {
    // With default weights and known inputs, elo contributes 0.05 * 50 = 2.5
    const metrics = makeMetrics({ eloRating: undefined });
    // Calculate expected manually:
    // winRateScore = 0.6 * 100 = 60
    // pointDiffScore = clamp((10 + 30)/60 * 100) = clamp(66.67) = 66.67
    // sosScore = 0.5 * 100 = 50
    // formScore = 0.6 * 100 = 60
    // eloScore = 50
    // score = 0.35*60 + 0.25*66.67 + 0.15*50 + 0.20*60 + 0.05*50
    //       = 21 + 16.67 + 7.5 + 12 + 2.5 = 59.67
    const score = compositeScore(metrics);
    expect(score).toBeCloseTo(59.67, 1);
  });

  it("uses provided eloRating in score", () => {
    const metricsNoElo = makeMetrics({ eloRating: undefined });
    const metricsWithElo = makeMetrics({ eloRating: 1500 });
    // eloScore with 1500: clamp((1500-1000)/1000 * 100) = 50
    // eloScore with undefined: 50
    // Both should be the same at 1500 elo
    expect(compositeScore(metricsNoElo)).toBeCloseTo(
      compositeScore(metricsWithElo),
      1
    );
  });

  it("high elo rating (>2000) clamps to 100", () => {
    const metrics = makeMetrics({ eloRating: 3000 });
    const metricsMaxElo = makeMetrics({ eloRating: 2000 });
    // Both should produce same elo contribution since both clamp to 100
    expect(compositeScore(metrics)).toBeCloseTo(compositeScore(metricsMaxElo), 5);
  });

  it("low elo rating (<1000) clamps to 0", () => {
    const metrics = makeMetrics({ eloRating: 500 });
    const metricsMinElo = makeMetrics({ eloRating: 1000 });
    // 500 elo → clamp((500-1000)/1000*100, 0, 100) = clamp(-50, 0, 100) = 0
    // 1000 elo → clamp(0, 0, 100) = 0
    expect(compositeScore(metrics)).toBeCloseTo(compositeScore(metricsMinElo), 5);
  });

  it("extreme positive point diff clamps pointDiffScore to 100", () => {
    const metrics = makeMetrics({ pointsFor: 200, pointsAgainst: 100 });
    // diff = 100, (100+30)/60*100 = 216.67, clamped to 100
    const score = compositeScore(metrics);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("extreme negative point diff clamps pointDiffScore to 0", () => {
    const metrics = makeMetrics({ pointsFor: 50, pointsAgainst: 200 });
    // diff = -150, (-150+30)/60*100 = -200, clamped to 0
    const score = compositeScore(metrics);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("respects custom weights", () => {
    const metrics = makeMetrics({ winRate: 1.0, recentForm: 0 });
    // With all weight on winRate → high score
    const scoreHeavyWinRate = compositeScore(metrics, {
      winRate: 0.9,
      pointDiff: 0.025,
      sos: 0.025,
      form: 0.025,
      elo: 0.025,
    });
    // With all weight on form → lower (form=0)
    const scoreHeavyForm = compositeScore(metrics, {
      winRate: 0.025,
      pointDiff: 0.025,
      sos: 0.025,
      form: 0.9,
      elo: 0.025,
    });
    expect(scoreHeavyWinRate).toBeGreaterThan(scoreHeavyForm);
  });

  it("perfect team scores close to 100", () => {
    const perfect = makeMetrics({
      winRate: 1.0,
      pointsFor: 130,
      pointsAgainst: 100,
      strengthOfSchedule: 1.0,
      recentForm: 1.0,
      eloRating: 2000,
    });
    const score = compositeScore(perfect);
    expect(score).toBeGreaterThan(80);
  });

  it("worst team scores close to 0", () => {
    const worst = makeMetrics({
      winRate: 0,
      pointsFor: 70,
      pointsAgainst: 130,
      strengthOfSchedule: 0,
      recentForm: 0,
      eloRating: 1000,
    });
    const score = compositeScore(worst);
    expect(score).toBeLessThan(20);
  });
});

// ─── buildPowerRankings ──────────────────────────────────────────────────────

describe("buildPowerRankings", () => {
  const teams: TeamMetrics[] = [
    makeMetrics({ teamId: "t1", teamName: "Alpha", winRate: 0.9, recentForm: 0.9, pointsFor: 120, strengthOfSchedule: 0.8, eloRating: 1800 }),
    makeMetrics({ teamId: "t2", teamName: "Beta", winRate: 0.5, recentForm: 0.5, pointsFor: 105, strengthOfSchedule: 0.5 }),
    makeMetrics({ teamId: "t3", teamName: "Gamma", winRate: 0.2, recentForm: 0.2, pointsFor: 90, strengthOfSchedule: 0.3, eloRating: 1100 }),
  ];

  it("returns array sorted descending by score", () => {
    const rankings = buildPowerRankings(teams);
    for (let i = 1; i < rankings.length; i++) {
      expect(rankings[i - 1]!.score).toBeGreaterThanOrEqual(rankings[i]!.score);
    }
  });

  it("rank 1 is the best team", () => {
    const rankings = buildPowerRankings(teams);
    expect(rankings[0]!.rank).toBe(1);
    expect(rankings[0]!.teamId).toBe("t1");
  });

  it("assigns 1-indexed consecutive ranks", () => {
    const rankings = buildPowerRankings(teams);
    rankings.forEach((r, idx) => {
      expect(r.rank).toBe(idx + 1);
    });
  });

  it("assigns elite tier to top team", () => {
    const rankings = buildPowerRankings(teams);
    expect(rankings[0]!.tier).toBe("elite");
  });

  it("assigns bottom tier to worst team", () => {
    const rankings = buildPowerRankings(teams);
    const last = rankings[rankings.length - 1]!;
    expect(["weak", "bottom"]).toContain(last.tier);
  });

  it("includes correct component values", () => {
    const rankings = buildPowerRankings(teams);
    const top = rankings[0]!;
    expect(top.components.winRateScore).toBeCloseTo(90); // 0.9 * 100
    expect(top.components.strengthScore).toBeCloseTo(80); // 0.8 * 100
    expect(top.components.formScore).toBeCloseTo(90); // 0.9 * 100
  });

  it("handles single team", () => {
    const rankings = buildPowerRankings([teams[0]!]);
    expect(rankings).toHaveLength(1);
    expect(rankings[0]!.rank).toBe(1);
  });

  it("handles empty array", () => {
    expect(buildPowerRankings([])).toEqual([]);
  });

  it("team without eloRating gets eloScore=50", () => {
    const team = makeMetrics({ teamId: "tx", eloRating: undefined });
    const rankings = buildPowerRankings([team]);
    expect(rankings[0]!.components.eloScore).toBe(50);
  });

  it("team with eloRating 1500 gets eloScore=50", () => {
    const team = makeMetrics({ teamId: "tx", eloRating: 1500 });
    const rankings = buildPowerRankings([team]);
    expect(rankings[0]!.components.eloScore).toBeCloseTo(50);
  });

  it("tier assignment: score>=75 is elite", () => {
    const team = makeMetrics({
      teamId: "tx",
      winRate: 1.0,
      recentForm: 1.0,
      pointsFor: 130,
      strengthOfSchedule: 1.0,
      eloRating: 2000,
    });
    const rankings = buildPowerRankings([team]);
    expect(rankings[0]!.tier).toBe("elite");
  });

  it("tier assignment: score in [40, 59] is average", () => {
    // Craft a team with average metrics
    const team = makeMetrics({
      teamId: "tx",
      winRate: 0.5,
      recentForm: 0.5,
      pointsFor: 100,
      pointsAgainst: 100,
      strengthOfSchedule: 0.5,
      eloRating: undefined,
    });
    const rankings = buildPowerRankings([team]);
    // winRateScore=50, pointDiffScore=50, sosScore=50, formScore=50, eloScore=50 → score=50
    expect(rankings[0]!.tier).toBe("average");
    expect(rankings[0]!.score).toBeCloseTo(50);
  });

  it("respects custom weights passed through", () => {
    const rankings1 = buildPowerRankings(teams);
    const rankings2 = buildPowerRankings(teams, { winRate: 0.99, pointDiff: 0.0025, sos: 0.0025, form: 0.0025, elo: 0.0025 });
    // Both should rank t1 first regardless
    expect(rankings1[0]!.teamId).toBe(rankings2[0]!.teamId);
  });
});

// ─── rankByRecord ────────────────────────────────────────────────────────────

describe("rankByRecord", () => {
  it("ranks by win percentage descending", () => {
    const teams = [
      { teamId: "a", teamName: "A", wins: 5, losses: 5 },
      { teamId: "b", teamName: "B", wins: 8, losses: 2 },
      { teamId: "c", teamName: "C", wins: 2, losses: 8 },
    ];
    const result = rankByRecord(teams);
    expect(result[0]!.teamId).toBe("b");
    expect(result[1]!.teamId).toBe("a");
    expect(result[2]!.teamId).toBe("c");
  });

  it("computes winPct correctly (no draws)", () => {
    const teams = [{ teamId: "a", teamName: "A", wins: 7, losses: 3 }];
    const result = rankByRecord(teams);
    expect(result[0]!.winPct).toBeCloseTo(0.7);
  });

  it("counts draws as 0.5 wins", () => {
    const teams = [
      { teamId: "a", teamName: "A", wins: 5, losses: 5, draws: 2 },
    ];
    const result = rankByRecord(teams);
    // (5 + 2*0.5) / (5+5+2) = 6/12 = 0.5
    expect(result[0]!.winPct).toBeCloseTo(0.5);
  });

  it("tie in winPct is broken by wins descending", () => {
    const teams = [
      { teamId: "a", teamName: "A", wins: 6, losses: 4 }, // 0.6
      { teamId: "b", teamName: "B", wins: 9, losses: 6 }, // 0.6
    ];
    const result = rankByRecord(teams);
    expect(result[0]!.teamId).toBe("b"); // 9 wins beats 6 wins
  });

  it("assigns 1-indexed consecutive ranks", () => {
    const teams = [
      { teamId: "a", teamName: "A", wins: 5, losses: 5 },
      { teamId: "b", teamName: "B", wins: 8, losses: 2 },
    ];
    const result = rankByRecord(teams);
    expect(result[0]!.rank).toBe(1);
    expect(result[1]!.rank).toBe(2);
  });

  it("handles 0-0 record (no games)", () => {
    const teams = [{ teamId: "a", teamName: "A", wins: 0, losses: 0 }];
    const result = rankByRecord(teams);
    expect(result[0]!.winPct).toBe(0);
  });

  it("handles empty array", () => {
    expect(rankByRecord([])).toEqual([]);
  });

  it("handles draws=undefined (treated as 0)", () => {
    const teams = [{ teamId: "a", teamName: "A", wins: 7, losses: 3 }];
    const result = rankByRecord(teams);
    expect(result[0]!.winPct).toBeCloseTo(0.7);
  });
});

// ─── strengthAdjustedRecord ──────────────────────────────────────────────────

describe("strengthAdjustedRecord", () => {
  it("high SOS boosts adjusted wins", () => {
    const { adjWins } = strengthAdjustedRecord(10, 5, 0.8);
    // adjWins = 10 * (1 + 0.8 - 0.5) = 10 * 1.3 = 13
    expect(adjWins).toBeCloseTo(13);
  });

  it("high SOS reduces adjusted losses", () => {
    const { adjLosses } = strengthAdjustedRecord(10, 5, 0.8);
    // adjLosses = 5 * (1 + (1-0.8) - 0.5) = 5 * 0.7 = 3.5
    expect(adjLosses).toBeCloseTo(3.5);
  });

  it("low SOS penalizes adjusted wins", () => {
    const { adjWins } = strengthAdjustedRecord(10, 5, 0.2);
    // adjWins = 10 * (1 + 0.2 - 0.5) = 10 * 0.7 = 7
    expect(adjWins).toBeCloseTo(7);
  });

  it("low SOS increases adjusted losses", () => {
    const { adjLosses } = strengthAdjustedRecord(10, 5, 0.2);
    // adjLosses = 5 * (1 + (1-0.2) - 0.5) = 5 * 1.3 = 6.5
    expect(adjLosses).toBeCloseTo(6.5);
  });

  it("neutral SOS (0.5) leaves win/loss unchanged", () => {
    const { adjWins, adjLosses } = strengthAdjustedRecord(10, 5, 0.5);
    expect(adjWins).toBeCloseTo(10);
    expect(adjLosses).toBeCloseTo(5);
  });

  it("adjWinRate is clamped to [0, 1]", () => {
    // Edge: 0 wins, 0 losses → adjWinRate = 0
    const { adjWinRate } = strengthAdjustedRecord(0, 0, 0.5);
    expect(adjWinRate).toBe(0);
  });

  it("computes adjWinRate correctly", () => {
    const { adjWinRate, adjWins, adjLosses } = strengthAdjustedRecord(10, 5, 0.8);
    expect(adjWinRate).toBeCloseTo(adjWins / (adjWins + adjLosses));
  });

  it("all wins with high SOS gives high adjWinRate", () => {
    const { adjWinRate } = strengthAdjustedRecord(10, 0, 0.9);
    expect(adjWinRate).toBeCloseTo(1);
  });

  it("all losses with low SOS gives low adjWinRate", () => {
    const { adjWinRate } = strengthAdjustedRecord(0, 10, 0.1);
    expect(adjWinRate).toBeCloseTo(0);
  });
});

// ─── tierLabel ───────────────────────────────────────────────────────────────

describe("tierLabel", () => {
  it('elite → "Elite"', () => {
    expect(tierLabel("elite")).toBe("Elite");
  });

  it('strong → "Strong"', () => {
    expect(tierLabel("strong")).toBe("Strong");
  });

  it('average → "Average"', () => {
    expect(tierLabel("average")).toBe("Average");
  });

  it('weak → "Below Average"', () => {
    expect(tierLabel("weak")).toBe("Below Average");
  });

  it('bottom → "Bottom Tier"', () => {
    expect(tierLabel("bottom")).toBe("Bottom Tier");
  });
});

// ─── rankDelta ───────────────────────────────────────────────────────────────

describe("rankDelta", () => {
  it("moved up: label is ↑N", () => {
    const result = rankDelta(3, 6);
    expect(result.label).toBe("↑3");
  });

  it("moved up: direction is 'up'", () => {
    expect(rankDelta(1, 5).direction).toBe("up");
  });

  it("moved up: delta is positive", () => {
    expect(rankDelta(2, 7).delta).toBe(5);
  });

  it("moved down: label is ↓N", () => {
    const result = rankDelta(5, 2);
    expect(result.label).toBe("↓3");
  });

  it("moved down: direction is 'down'", () => {
    expect(rankDelta(8, 3).direction).toBe("down");
  });

  it("moved down: delta is negative", () => {
    expect(rankDelta(5, 2).delta).toBe(-3);
  });

  it("same rank: label is —", () => {
    const result = rankDelta(4, 4);
    expect(result.label).toBe("—");
  });

  it("same rank: direction is 'same'", () => {
    expect(rankDelta(4, 4).direction).toBe("same");
  });

  it("same rank: delta is 0", () => {
    expect(rankDelta(4, 4).delta).toBe(0);
  });

  it("moved up by 1: label is ↑1", () => {
    expect(rankDelta(2, 3).label).toBe("↑1");
  });

  it("moved down by 1: label is ↓1", () => {
    expect(rankDelta(3, 2).label).toBe("↓1");
  });
});

// ─── topN / bottomN ──────────────────────────────────────────────────────────

const makeRankings = (): PowerScore[] =>
  [
    { teamId: "1", teamName: "A", score: 90, rank: 1, tier: "elite" as PowerTier, components: { winRateScore: 90, pointDifferentialScore: 90, strengthScore: 90, formScore: 90, eloScore: 90 } },
    { teamId: "2", teamName: "B", score: 70, rank: 2, tier: "strong" as PowerTier, components: { winRateScore: 70, pointDifferentialScore: 70, strengthScore: 70, formScore: 70, eloScore: 70 } },
    { teamId: "3", teamName: "C", score: 50, rank: 3, tier: "average" as PowerTier, components: { winRateScore: 50, pointDifferentialScore: 50, strengthScore: 50, formScore: 50, eloScore: 50 } },
    { teamId: "4", teamName: "D", score: 30, rank: 4, tier: "weak" as PowerTier, components: { winRateScore: 30, pointDifferentialScore: 30, strengthScore: 30, formScore: 30, eloScore: 30 } },
    { teamId: "5", teamName: "E", score: 10, rank: 5, tier: "bottom" as PowerTier, components: { winRateScore: 10, pointDifferentialScore: 10, strengthScore: 10, formScore: 10, eloScore: 10 } },
  ];

describe("topN", () => {
  it("returns first n items", () => {
    const result = topN(makeRankings(), 3);
    expect(result).toHaveLength(3);
    expect(result[0]!.teamId).toBe("1");
    expect(result[2]!.teamId).toBe("3");
  });

  it("returns all if n >= length", () => {
    const rankings = makeRankings();
    expect(topN(rankings, 10)).toHaveLength(5);
  });

  it("returns empty for n=0", () => {
    expect(topN(makeRankings(), 0)).toEqual([]);
  });

  it("returns first 1 for n=1", () => {
    const result = topN(makeRankings(), 1);
    expect(result).toHaveLength(1);
    expect(result[0]!.rank).toBe(1);
  });
});

describe("bottomN", () => {
  it("returns last n items", () => {
    const result = bottomN(makeRankings(), 2);
    expect(result).toHaveLength(2);
    expect(result[0]!.teamId).toBe("4");
    expect(result[1]!.teamId).toBe("5");
  });

  it("returns all if n >= length", () => {
    expect(bottomN(makeRankings(), 10)).toHaveLength(5);
  });

  it("returns empty for n=0 — last 0 of array", () => {
    // slice(5) of length-5 array is []
    expect(bottomN(makeRankings(), 0)).toEqual([]);
  });

  it("returns last 1 for n=1", () => {
    const result = bottomN(makeRankings(), 1);
    expect(result).toHaveLength(1);
    expect(result[0]!.teamId).toBe("5");
  });
});

// ─── filterByTier ────────────────────────────────────────────────────────────

describe("filterByTier", () => {
  it("filters to elite only", () => {
    const result = filterByTier(makeRankings(), "elite");
    expect(result).toHaveLength(1);
    expect(result[0]!.teamId).toBe("1");
  });

  it("filters to strong only", () => {
    const result = filterByTier(makeRankings(), "strong");
    expect(result).toHaveLength(1);
    expect(result[0]!.tier).toBe("strong");
  });

  it("filters to average only", () => {
    expect(filterByTier(makeRankings(), "average")).toHaveLength(1);
  });

  it("filters to weak only", () => {
    expect(filterByTier(makeRankings(), "weak")).toHaveLength(1);
  });

  it("filters to bottom only", () => {
    const result = filterByTier(makeRankings(), "bottom");
    expect(result).toHaveLength(1);
    expect(result[0]!.teamId).toBe("5");
  });

  it("returns empty if tier has no members", () => {
    const eliteOnly = filterByTier(makeRankings(), "elite");
    expect(filterByTier(eliteOnly, "bottom")).toEqual([]);
  });
});

// ─── averageScore ────────────────────────────────────────────────────────────

describe("averageScore", () => {
  it("computes the mean composite score", () => {
    const rankings = makeRankings(); // scores: 90, 70, 50, 30, 10 → avg 50
    expect(averageScore(rankings)).toBeCloseTo(50);
  });

  it("returns 0 for empty array", () => {
    expect(averageScore([])).toBe(0);
  });

  it("returns score for single-item array", () => {
    expect(averageScore([makeRankings()[0]!])).toBeCloseTo(90);
  });

  it("works with two equal scores", () => {
    const r = makeRankings().slice(0, 2);
    // (90 + 70) / 2 = 80
    expect(averageScore(r)).toBeCloseTo(80);
  });
});

// ─── medianRank ──────────────────────────────────────────────────────────────

describe("medianRank", () => {
  it("returns 0 for empty array", () => {
    expect(medianRank([])).toBe(0);
  });

  it("returns the middle value for odd length", () => {
    // scores: 10, 30, 50, 70, 90 → median = 50
    expect(medianRank(makeRankings())).toBeCloseTo(50);
  });

  it("returns average of two middle values for even length", () => {
    // scores: 10, 30, 70, 90 (remove the 50) → median = (30+70)/2 = 50
    const rankings = makeRankings().filter((r) => r.teamId !== "3");
    expect(medianRank(rankings)).toBeCloseTo(50);
  });

  it("returns score for single item", () => {
    expect(medianRank([makeRankings()[0]!])).toBeCloseTo(90);
  });

  it("correctly handles unsorted input (sorts internally)", () => {
    const reversed = [...makeRankings()].reverse();
    expect(medianRank(reversed)).toBeCloseTo(50);
  });
});

// ─── powerRankingSummary ─────────────────────────────────────────────────────

describe("powerRankingSummary", () => {
  it("returns correct counts in summary string", () => {
    const summary = powerRankingSummary(makeRankings());
    // 1 elite, 1 strong, 1 average, 2 below (weak + bottom)
    expect(summary).toBe("1 elite, 1 strong, 1 average, 2 below average");
  });

  it("handles empty rankings", () => {
    expect(powerRankingSummary([])).toBe(
      "0 elite, 0 strong, 0 average, 0 below average"
    );
  });

  it("all elite", () => {
    const allElite = makeRankings().map((r) => ({ ...r, tier: "elite" as PowerTier }));
    expect(powerRankingSummary(allElite)).toBe(
      "5 elite, 0 strong, 0 average, 0 below average"
    );
  });

  it("counts both weak and bottom as below average", () => {
    const rankings = makeRankings();
    const summary = powerRankingSummary(rankings);
    // weak(1) + bottom(1) = 2 below average
    expect(summary).toContain("2 below average");
  });

  it("all bottom tier", () => {
    const allBottom = makeRankings().map((r) => ({ ...r, tier: "bottom" as PowerTier }));
    expect(powerRankingSummary(allBottom)).toBe(
      "0 elite, 0 strong, 0 average, 5 below average"
    );
  });
});
