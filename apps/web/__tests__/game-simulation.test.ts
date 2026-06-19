import { describe, it, expect } from "vitest";
import {
  Lcg,
  simulateGame,
  simulateGameWithSpread,
  simulateSeason,
  simulatePoissonGame,
  scoreRangeProbability,
  normalCdf,
  scoreDistribution,
  marginDistribution,
  impliedWinProbFromSpread,
  winProbToMoneyline,
  simulateTournament,
  betExpectedValue,
  kellyFraction,
  type SimulationConfig,
  type TeamStrength,
  type SimulationResult,
} from "@/lib/sports/game-simulation";

// Keep iterations low for test performance
const FAST: SimulationConfig = { iterations: 1000, seed: 42 };
const FAST2: SimulationConfig = { iterations: 1000, seed: 99 };

// ── Helpers ────────────────────────────────────────────────────────────────

function makeTeam(
  id: string,
  off: number,
  def: number,
  hfa?: number
): TeamStrength {
  return { teamId: id, offensiveRating: off, defensiveRating: def, homeFieldAdv: hfa };
}

const strongHome = makeTeam("HOME_STRONG", 30, 18, 3.0);
const weakAway = makeTeam("AWAY_WEAK", 18, 30);
const evenTeamA = makeTeam("EVEN_A", 24, 24);
const evenTeamB = makeTeam("EVEN_B", 24, 24);

// ── Lcg tests ─────────────────────────────────────────────────────────────

describe("Lcg", () => {
  it("next() returns values in [0, 1)", () => {
    const rng = new Lcg(1);
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("next() is deterministic with same seed", () => {
    const rng1 = new Lcg(999);
    const rng2 = new Lcg(999);
    for (let i = 0; i < 20; i++) {
      expect(rng1.next()).toBeCloseTo(rng2.next(), 10);
    }
  });

  it("different seeds produce different sequences", () => {
    const rng1 = new Lcg(1);
    const rng2 = new Lcg(2);
    const vals1 = Array.from({ length: 10 }, () => rng1.next());
    const vals2 = Array.from({ length: 10 }, () => rng2.next());
    expect(vals1).not.toEqual(vals2);
  });

  it("default seed is reproducible", () => {
    const rng1 = new Lcg();
    const rng2 = new Lcg();
    expect(rng1.next()).toBeCloseTo(rng2.next(), 10);
  });

  it("nextInt(max) returns integers in [0, max)", () => {
    const rng = new Lcg(7);
    for (let i = 0; i < 100; i++) {
      const v = rng.nextInt(10);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("nextNormal returns values near mean", () => {
    const rng = new Lcg(42);
    const samples = Array.from({ length: 1000 }, () => rng.nextNormal(100, 10));
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(avg).toBeGreaterThan(95);
    expect(avg).toBeLessThan(105);
  });

  it("nextNormal with default params (mean=0, std=1) is standard normal", () => {
    const rng = new Lcg(55);
    const samples = Array.from({ length: 1000 }, () => rng.nextNormal());
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(Math.abs(avg)).toBeLessThan(0.2);
  });

  it("nextPoisson mean approximates lambda", () => {
    const rng = new Lcg(13);
    const lambda = 3.5;
    const samples = Array.from({ length: 2000 }, () => rng.nextPoisson(lambda));
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(avg).toBeGreaterThan(2.8);
    expect(avg).toBeLessThan(4.2);
  });

  it("nextPoisson returns non-negative integers", () => {
    const rng = new Lcg(21);
    for (let i = 0; i < 100; i++) {
      const v = rng.nextPoisson(2.0);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("nextPoisson(small lambda) mostly returns 0 or 1", () => {
    const rng = new Lcg(31);
    const samples = Array.from({ length: 500 }, () => rng.nextPoisson(0.1));
    const highCount = samples.filter((v) => v > 2).length;
    expect(highCount).toBeLessThan(10);
  });
});

// ── simulateGame tests ─────────────────────────────────────────────────────

describe("simulateGame", () => {
  it("probabilities sum to approximately 1", () => {
    const result = simulateGame(strongHome, weakAway, FAST);
    const sum = result.homeWinProbability + result.awayWinProbability + result.tieProb;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("raw win counts sum to iterations", () => {
    const result = simulateGame(strongHome, weakAway, FAST);
    expect(result.homeWins + result.awayWins + result.ties).toBe(FAST.iterations);
  });

  it("iterations field matches config", () => {
    const result = simulateGame(strongHome, weakAway, FAST);
    expect(result.iterations).toBe(1000);
  });

  it("stronger team wins more often", () => {
    const result = simulateGame(strongHome, weakAway, FAST);
    expect(result.homeWinProbability).toBeGreaterThan(result.awayWinProbability);
  });

  it("probabilities are in [0, 1]", () => {
    const result = simulateGame(evenTeamA, evenTeamB, FAST);
    expect(result.homeWinProbability).toBeGreaterThanOrEqual(0);
    expect(result.homeWinProbability).toBeLessThanOrEqual(1);
    expect(result.awayWinProbability).toBeGreaterThanOrEqual(0);
    expect(result.awayWinProbability).toBeLessThanOrEqual(1);
    expect(result.tieProb).toBeGreaterThanOrEqual(0);
    expect(result.tieProb).toBeLessThanOrEqual(1);
  });

  it("average home score is near expected value", () => {
    const home = makeTeam("H", 28, 20, 2);
    const away = makeTeam("A", 22, 26);
    // homeExpected = (28+26)/2 + 2/2 = 27 + 1 = 28
    const result = simulateGame(home, away, { iterations: 3000, seed: 42 });
    expect(result.avgHomeScore).toBeGreaterThan(22);
    expect(result.avgHomeScore).toBeLessThan(34);
  });

  it("average away score is near expected value", () => {
    const home = makeTeam("H", 28, 20, 2);
    const away = makeTeam("A", 22, 26);
    // awayExpected = (22+20)/2 - 2/2 = 21 - 1 = 20
    const result = simulateGame(home, away, { iterations: 3000, seed: 42 });
    expect(result.avgAwayScore).toBeGreaterThan(14);
    expect(result.avgAwayScore).toBeLessThan(26);
  });

  it("avgTotalPoints = avgHomeScore + avgAwayScore", () => {
    const result = simulateGame(strongHome, weakAway, FAST);
    expect(result.avgTotalPoints).toBeCloseTo(
      result.avgHomeScore + result.avgAwayScore,
      5
    );
  });

  it("stdDev scores are positive", () => {
    const result = simulateGame(evenTeamA, evenTeamB, FAST);
    expect(result.stdDevHomeScore).toBeGreaterThan(0);
    expect(result.stdDevAwayScore).toBeGreaterThan(0);
  });

  it("median scores are within plausible range", () => {
    const result = simulateGame(strongHome, weakAway, FAST);
    expect(result.medianHomeScore).toBeGreaterThan(0);
    expect(result.medianAwayScore).toBeGreaterThan(0);
  });

  it("tieProb is near 0 for continuous scoring model", () => {
    const result = simulateGame(evenTeamA, evenTeamB, FAST);
    // Continuous normal model → ties are nearly impossible
    expect(result.tieProb).toBeLessThan(0.01);
  });

  it("default config (no seed) still returns valid result", () => {
    const result = simulateGame(evenTeamA, evenTeamB, { iterations: 500 });
    const sum = result.homeWinProbability + result.awayWinProbability + result.tieProb;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("same seed produces same result", () => {
    const r1 = simulateGame(strongHome, weakAway, { iterations: 500, seed: 77 });
    const r2 = simulateGame(strongHome, weakAway, { iterations: 500, seed: 77 });
    expect(r1.homeWinProbability).toBeCloseTo(r2.homeWinProbability, 10);
    expect(r1.avgHomeScore).toBeCloseTo(r2.avgHomeScore, 10);
  });
});

// ── simulateGameWithSpread tests ───────────────────────────────────────────

describe("simulateGameWithSpread", () => {
  it("coverProbability is defined when spread provided", () => {
    const result = simulateGameWithSpread(strongHome, weakAway, -3, undefined, FAST);
    expect(result.coverProbability).toBeDefined();
  });

  it("overProbability is defined when overUnder provided", () => {
    const result = simulateGameWithSpread(strongHome, weakAway, -3, 44.5, FAST);
    expect(result.overProbability).toBeDefined();
  });

  it("overProbability is undefined when overUnder not provided", () => {
    const result = simulateGameWithSpread(strongHome, weakAway, -3, undefined, FAST);
    expect(result.overProbability).toBeUndefined();
  });

  it("home favored (negative spread) → coverProbability > 0.5 for strong home team", () => {
    const result = simulateGameWithSpread(strongHome, weakAway, -3, undefined, {
      iterations: 2000,
      seed: 42,
    });
    expect(result.coverProbability).toBeDefined();
    expect(result.coverProbability!).toBeGreaterThan(0.5);
  });

  it("coverProbability is in [0, 1]", () => {
    const result = simulateGameWithSpread(evenTeamA, evenTeamB, 0, undefined, FAST);
    expect(result.coverProbability!).toBeGreaterThanOrEqual(0);
    expect(result.coverProbability!).toBeLessThanOrEqual(1);
  });

  it("overProbability is in [0, 1]", () => {
    const result = simulateGameWithSpread(evenTeamA, evenTeamB, 0, 48.5, FAST);
    expect(result.overProbability!).toBeGreaterThanOrEqual(0);
    expect(result.overProbability!).toBeLessThanOrEqual(1);
  });

  it("probabilities still sum to 1 with spread", () => {
    const result = simulateGameWithSpread(strongHome, weakAway, -7, 45, FAST);
    const sum = result.homeWinProbability + result.awayWinProbability + result.tieProb;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("very large spread → coverProbability approaches 0 for away team", () => {
    // home is -20 favored against weak team; covering -20 is harder
    const result = simulateGameWithSpread(strongHome, weakAway, -20, undefined, {
      iterations: 2000,
      seed: 42,
    });
    // A -20 spread means home needs to win by >20; should be harder
    expect(result.coverProbability!).toBeLessThan(0.7);
  });

  it("even teams with spread=0 → cover ≈ 0.5", () => {
    const result = simulateGameWithSpread(evenTeamA, evenTeamB, 0, undefined, {
      iterations: 3000,
      seed: 42,
    });
    expect(result.coverProbability!).toBeGreaterThan(0.4);
    expect(result.coverProbability!).toBeLessThan(0.6);
  });
});

// ── simulateSeason tests ───────────────────────────────────────────────────

describe("simulateSeason", () => {
  const opp1 = makeTeam("OPP1", 22, 26);
  const opp2 = makeTeam("OPP2", 25, 23);
  const opp3 = makeTeam("OPP3", 20, 28);

  const schedule4 = [
    { opponent: opp1, isHome: true },
    { opponent: opp2, isHome: false },
    { opponent: opp3, isHome: true },
    { opponent: opp1, isHome: false },
  ];

  it("avgWins is in [0, total games]", () => {
    const result = simulateSeason("TEAM", schedule4, strongHome, FAST);
    expect(result.avgWins).toBeGreaterThanOrEqual(0);
    expect(result.avgWins).toBeLessThanOrEqual(4);
  });

  it("playoffProbability is in [0, 1]", () => {
    const result = simulateSeason("TEAM", schedule4, strongHome, FAST);
    expect(result.playoffProbability).toBeGreaterThanOrEqual(0);
    expect(result.playoffProbability).toBeLessThanOrEqual(1);
  });

  it("minWins is >= 0 and <= maxWins", () => {
    const result = simulateSeason("TEAM", schedule4, strongHome, FAST);
    expect(result.minWins).toBeGreaterThanOrEqual(0);
    expect(result.minWins).toBeLessThanOrEqual(result.maxWins);
  });

  it("maxWins is <= total games", () => {
    const result = simulateSeason("TEAM", schedule4, strongHome, FAST);
    expect(result.maxWins).toBeLessThanOrEqual(4);
  });

  it("stdDevWins is non-negative", () => {
    const result = simulateSeason("TEAM", schedule4, strongHome, FAST);
    expect(result.stdDevWins).toBeGreaterThanOrEqual(0);
  });

  it("teamId is passed through correctly", () => {
    const result = simulateSeason("MY_TEAM_ID", schedule4, strongHome, FAST);
    expect(result.teamId).toBe("MY_TEAM_ID");
  });

  it("winDistribution counts sum to iterations", () => {
    const result = simulateSeason("TEAM", schedule4, strongHome, FAST);
    const total = Object.values(result.winDistribution).reduce((a, b) => a + b, 0);
    expect(total).toBe(FAST.iterations);
  });

  it("strong team wins more games on average than weak team", () => {
    const strongResult = simulateSeason("STRONG", schedule4, strongHome, FAST);
    const weakResult = simulateSeason("WEAK", schedule4, weakAway, FAST);
    expect(strongResult.avgWins).toBeGreaterThan(weakResult.avgWins);
  });

  it("playoffProbability = 0 for 4-game season (can't reach 9 wins)", () => {
    const result = simulateSeason("TEAM", schedule4, evenTeamA, FAST);
    // 4 games, threshold is 9 wins — impossible
    expect(result.playoffProbability).toBe(0);
  });
});

// ── simulatePoissonGame tests ──────────────────────────────────────────────

describe("simulatePoissonGame", () => {
  it("tieProb > 0 for low-scoring game (ties happen)", () => {
    const result = simulatePoissonGame(1.5, 1.2, { iterations: 3000, seed: 42 });
    expect(result.tieProb).toBeGreaterThan(0);
  });

  it("probabilities sum to 1", () => {
    const result = simulatePoissonGame(2.0, 1.5, FAST);
    const sum = result.homeWinProbability + result.awayWinProbability + result.tieProb;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("avg home score approximates homeLambda", () => {
    const result = simulatePoissonGame(2.0, 1.5, { iterations: 3000, seed: 42 });
    expect(result.avgHomeScore).toBeGreaterThan(1.4);
    expect(result.avgHomeScore).toBeLessThan(2.6);
  });

  it("avg away score approximates awayLambda", () => {
    const result = simulatePoissonGame(2.0, 1.5, { iterations: 3000, seed: 42 });
    expect(result.avgAwayScore).toBeGreaterThan(0.9);
    expect(result.avgAwayScore).toBeLessThan(2.1);
  });

  it("higher lambda team wins more often", () => {
    const result = simulatePoissonGame(3.0, 1.0, { iterations: 2000, seed: 42 });
    expect(result.homeWinProbability).toBeGreaterThan(result.awayWinProbability);
  });

  it("raw counts sum to iterations", () => {
    const result = simulatePoissonGame(1.5, 1.5, FAST);
    expect(result.homeWins + result.awayWins + result.ties).toBe(FAST.iterations);
  });

  it("equal lambdas → roughly symmetric win probabilities", () => {
    const result = simulatePoissonGame(2.0, 2.0, { iterations: 3000, seed: 42 });
    expect(Math.abs(result.homeWinProbability - result.awayWinProbability)).toBeLessThan(0.08);
  });
});

// ── normalCdf tests ────────────────────────────────────────────────────────

describe("normalCdf", () => {
  it("normalCdf(0) = 0.5", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 4);
  });

  it("normalCdf(-∞) approaches 0", () => {
    expect(normalCdf(-10)).toBeCloseTo(0, 5);
  });

  it("normalCdf(+∞) approaches 1", () => {
    expect(normalCdf(10)).toBeCloseTo(1, 5);
  });

  it("normalCdf(1.96) ≈ 0.975", () => {
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 2);
  });

  it("normalCdf(-1.96) ≈ 0.025", () => {
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 2);
  });

  it("is monotonically increasing", () => {
    expect(normalCdf(-1)).toBeLessThan(normalCdf(0));
    expect(normalCdf(0)).toBeLessThan(normalCdf(1));
    expect(normalCdf(1)).toBeLessThan(normalCdf(2));
  });

  it("normalCdf(z) + normalCdf(-z) ≈ 1", () => {
    expect(normalCdf(1.5) + normalCdf(-1.5)).toBeCloseTo(1.0, 4);
  });
});

// ── scoreRangeProbability tests ────────────────────────────────────────────

describe("scoreRangeProbability", () => {
  it("returns value in [0, 1]", () => {
    const result = simulateGame(evenTeamA, evenTeamB, FAST);
    const p = scoreRangeProbability(result, 10, 40, true);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it("full range [0, Infinity] returns approximately 1", () => {
    const result = simulateGame(evenTeamA, evenTeamB, FAST);
    const p = scoreRangeProbability(result, 0, 200, true);
    expect(p).toBeGreaterThan(0.95);
  });

  it("empty range returns approximately 0", () => {
    const result = simulateGame(evenTeamA, evenTeamB, FAST);
    const p = scoreRangeProbability(result, 1000, 2000, true);
    expect(p).toBeCloseTo(0, 3);
  });

  it("works for away team", () => {
    const result = simulateGame(evenTeamA, evenTeamB, FAST);
    const p = scoreRangeProbability(result, 10, 40, false);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it("probability around mean is higher than at extremes", () => {
    const result = simulateGame(evenTeamA, evenTeamB, FAST);
    const pNear = scoreRangeProbability(result, result.avgHomeScore - 5, result.avgHomeScore + 5, true);
    const pFar = scoreRangeProbability(result, result.avgHomeScore + 50, result.avgHomeScore + 60, true);
    expect(pNear).toBeGreaterThan(pFar);
  });
});

// ── scoreDistribution tests ────────────────────────────────────────────────

describe("scoreDistribution", () => {
  it("returns non-empty array", () => {
    const dist = scoreDistribution(evenTeamA, evenTeamB, true, FAST);
    expect(dist.length).toBeGreaterThan(0);
  });

  it("probabilities sum to approximately 1", () => {
    const dist = scoreDistribution(evenTeamA, evenTeamB, true, FAST);
    const total = dist.reduce((a, b) => a + b.probability, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });

  it("final cumulative probability ≈ 1", () => {
    const dist = scoreDistribution(evenTeamA, evenTeamB, true, FAST);
    expect(dist[dist.length - 1]!.cumulativeProbability).toBeCloseTo(1.0, 5);
  });

  it("sorted ascending by score", () => {
    const dist = scoreDistribution(evenTeamA, evenTeamB, true, FAST);
    for (let i = 1; i < dist.length; i++) {
      expect(dist[i]!.score).toBeGreaterThanOrEqual(dist[i - 1]!.score);
    }
  });

  it("all counts are positive integers", () => {
    const dist = scoreDistribution(evenTeamA, evenTeamB, true, FAST);
    for (const entry of dist) {
      expect(entry.count).toBeGreaterThan(0);
      expect(Number.isInteger(entry.count)).toBe(true);
    }
  });

  it("cumulative probability is non-decreasing", () => {
    const dist = scoreDistribution(evenTeamA, evenTeamB, true, FAST);
    for (let i = 1; i < dist.length; i++) {
      expect(dist[i]!.cumulativeProbability).toBeGreaterThanOrEqual(
        dist[i - 1]!.cumulativeProbability
      );
    }
  });
});

// ── marginDistribution tests ───────────────────────────────────────────────

describe("marginDistribution", () => {
  it("returns non-empty array", () => {
    const dist = marginDistribution(evenTeamA, evenTeamB, FAST);
    expect(dist.length).toBeGreaterThan(0);
  });

  it("probabilities sum to approximately 1", () => {
    const dist = marginDistribution(evenTeamA, evenTeamB, FAST);
    const total = dist.reduce((a, b) => a + b.probability, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });

  it("sorted ascending by margin", () => {
    const dist = marginDistribution(evenTeamA, evenTeamB, FAST);
    for (let i = 1; i < dist.length; i++) {
      expect(dist[i]!.margin).toBeGreaterThan(dist[i - 1]!.margin);
    }
  });

  it("has negative margins (away wins) and positive margins (home wins)", () => {
    const dist = marginDistribution(evenTeamA, evenTeamB, FAST);
    const hasNeg = dist.some((d) => d.margin < 0);
    const hasPos = dist.some((d) => d.margin > 0);
    expect(hasNeg).toBe(true);
    expect(hasPos).toBe(true);
  });

  it("strong home team → more positive margins", () => {
    const dist = marginDistribution(strongHome, weakAway, FAST);
    const posMass = dist.filter((d) => d.margin > 0).reduce((a, b) => a + b.probability, 0);
    const negMass = dist.filter((d) => d.margin < 0).reduce((a, b) => a + b.probability, 0);
    expect(posMass).toBeGreaterThan(negMass);
  });
});

// ── impliedWinProbFromSpread tests ─────────────────────────────────────────

describe("impliedWinProbFromSpread", () => {
  it("spread=0 → win probability = 0.5", () => {
    expect(impliedWinProbFromSpread(0)).toBeCloseTo(0.5, 4);
  });

  it("home -3 (negative spread) → home win probability > 0.5", () => {
    expect(impliedWinProbFromSpread(-3)).toBeGreaterThan(0.5);
  });

  it("home +3 (positive spread, home underdog) → home win probability < 0.5", () => {
    expect(impliedWinProbFromSpread(3)).toBeLessThan(0.5);
  });

  it("result is in (0, 1)", () => {
    const p = impliedWinProbFromSpread(-7);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });

  it("larger home favorite → higher win probability", () => {
    const p3 = impliedWinProbFromSpread(-3);
    const p7 = impliedWinProbFromSpread(-7);
    const p14 = impliedWinProbFromSpread(-14);
    expect(p14).toBeGreaterThan(p7);
    expect(p7).toBeGreaterThan(p3);
  });

  it("custom stdDev changes result", () => {
    const p1 = impliedWinProbFromSpread(-3, 13.5);
    const p2 = impliedWinProbFromSpread(-3, 7.0);
    expect(p1).not.toBeCloseTo(p2, 3);
  });
});

// ── winProbToMoneyline tests ───────────────────────────────────────────────

describe("winProbToMoneyline", () => {
  it("0.5 win probability → -100 moneyline", () => {
    expect(winProbToMoneyline(0.5)).toBe(-100);
  });

  it("prob > 0.5 → negative moneyline (favorite)", () => {
    expect(winProbToMoneyline(0.6)).toBeLessThan(0);
  });

  it("prob < 0.5 → positive moneyline (underdog)", () => {
    expect(winProbToMoneyline(0.4)).toBeGreaterThan(0);
  });

  it("0.667 prob → approximately -200", () => {
    const ml = winProbToMoneyline(0.667);
    expect(ml).toBeLessThan(-180);
    expect(ml).toBeGreaterThan(-220);
  });

  it("0.333 prob → approximately +200", () => {
    const ml = winProbToMoneyline(0.333);
    expect(ml).toBeGreaterThan(180);
    expect(ml).toBeLessThan(220);
  });

  it("returns integer", () => {
    expect(Number.isInteger(winProbToMoneyline(0.6))).toBe(true);
    expect(Number.isInteger(winProbToMoneyline(0.4))).toBe(true);
  });

  it("clamps to [-10000, +10000]", () => {
    const high = winProbToMoneyline(0.9999);
    const low = winProbToMoneyline(0.0001);
    expect(high).toBeGreaterThanOrEqual(-10000);
    expect(low).toBeLessThanOrEqual(10000);
  });

  it("very high prob → very negative ML", () => {
    expect(winProbToMoneyline(0.95)).toBeLessThan(-500);
  });

  it("very low prob → very positive ML", () => {
    expect(winProbToMoneyline(0.05)).toBeGreaterThan(500);
  });
});

// ── simulateTournament tests ───────────────────────────────────────────────

describe("simulateTournament", () => {
  const t1 = makeTeam("T1", 30, 18);
  const t2 = makeTeam("T2", 28, 20);
  const t3 = makeTeam("T3", 26, 22);
  const t4 = makeTeam("T4", 22, 26);
  const teams4 = [t1, t2, t3, t4];

  it("champion is one of the input teams", () => {
    const result = simulateTournament(teams4, FAST);
    const ids = teams4.map((t) => t.teamId);
    expect(ids).toContain(result.champion);
  });

  it("champion probabilities sum to approximately 1", () => {
    const result = simulateTournament(teams4, FAST);
    const sum = Object.values(result.championProbabilities).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 4);
  });

  it("champion probabilities are all in [0, 1]", () => {
    const result = simulateTournament(teams4, FAST);
    for (const p of Object.values(result.championProbabilities)) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it("all input teams have champion probabilities", () => {
    const result = simulateTournament(teams4, FAST);
    for (const team of teams4) {
      expect(result.championProbabilities[team.teamId]).toBeDefined();
    }
  });

  it("stronger team (1-seed) wins championship more often", () => {
    const result = simulateTournament(teams4, { iterations: 2000, seed: 42 });
    expect(result.championProbabilities["T1"]).toBeGreaterThan(
      result.championProbabilities["T4"]!
    );
  });

  it("throws for non-power-of-2 team count", () => {
    const teams3 = [t1, t2, t3];
    expect(() => simulateTournament(teams3, FAST)).toThrow();
  });

  it("works for 2-team tournament", () => {
    const result = simulateTournament([t1, t4], FAST);
    const ids = ["T1", "T4"];
    expect(ids).toContain(result.champion);
    const sum = Object.values(result.championProbabilities).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 4);
  });

  it("8-team tournament runs without error", () => {
    const teams8 = Array.from({ length: 8 }, (_, i) =>
      makeTeam(`TEAM${i + 1}`, 30 - i * 2, 18 + i * 2)
    );
    const result = simulateTournament(teams8, FAST);
    expect(result.champion).toBeTruthy();
  });
});

// ── betExpectedValue tests ─────────────────────────────────────────────────

describe("betExpectedValue", () => {
  it("positive EV for favorable American odds (+200) at 40% win prob", () => {
    // profitIfWin = 200/100 = 2.0; EV = 0.4*2 - 0.6*1 = 0.8 - 0.6 = 0.2
    const ev = betExpectedValue(0.4, 200);
    expect(ev).toBeCloseTo(0.2, 4);
  });

  it("negative EV for unfavorable bet", () => {
    // prob=0.4, odds=-110; profitIfWin=100/110≈0.909; EV=0.4*0.909-0.6*1=0.364-0.6=-0.236
    const ev = betExpectedValue(0.4, -110);
    expect(ev).toBeLessThan(0);
  });

  it("EV = 0 for fair bet at exactly breakeven probability", () => {
    // odds = -110; breakeven = 110/210 ≈ 0.5238
    const breakeven = 110 / 210;
    const ev = betExpectedValue(breakeven, -110);
    expect(Math.abs(ev)).toBeLessThan(0.01);
  });

  it("positive EV when true win prob exceeds implied prob", () => {
    // odds = +150; implied = 100/250 = 0.4; use 0.5 true prob
    // EV = 0.5*(1.5) - 0.5*1 = 0.75 - 0.5 = 0.25
    const ev = betExpectedValue(0.5, 150);
    expect(ev).toBeGreaterThan(0);
  });

  it("negative American odds compute correctly", () => {
    // odds = -200; profitIfWin = 100/200 = 0.5
    // EV at prob=0.6 = 0.6*0.5 - 0.4*1 = 0.3 - 0.4 = -0.1
    const ev = betExpectedValue(0.6, -200);
    expect(ev).toBeCloseTo(-0.1, 4);
  });
});

// ── kellyFraction tests ────────────────────────────────────────────────────

describe("kellyFraction", () => {
  it("returns 0 for negative EV bet", () => {
    // prob=0.4, odds=-110 → negative EV
    const k = kellyFraction(0.4, -110);
    expect(k).toBe(0);
  });

  it("returns positive fraction for positive EV bet", () => {
    // prob=0.6, odds=+100; b=1; kelly=(1*0.6-0.4)/1=0.2
    const k = kellyFraction(0.6, 100);
    expect(k).toBeGreaterThan(0);
    expect(k).toBeCloseTo(0.2, 4);
  });

  it("returns value in [0, 1]", () => {
    const k = kellyFraction(0.7, 200);
    expect(k).toBeGreaterThanOrEqual(0);
    expect(k).toBeLessThanOrEqual(1);
  });

  it("higher edge → higher Kelly fraction", () => {
    const k1 = kellyFraction(0.55, 100);
    const k2 = kellyFraction(0.65, 100);
    expect(k2).toBeGreaterThan(k1);
  });

  it("Kelly at prob=1.0 approaches 1 (bet everything)", () => {
    const k = kellyFraction(0.9999, 100);
    expect(k).toBeGreaterThan(0.9);
  });

  it("Kelly at prob=0 returns 0", () => {
    const k = kellyFraction(0, 100);
    expect(k).toBe(0);
  });

  it("negative odds still computes valid Kelly", () => {
    // odds=-110; b=100/110≈0.909; prob=0.6
    // kelly=(0.909*0.6-0.4)/0.909=(0.545-0.4)/0.909=0.145/0.909≈0.16
    const k = kellyFraction(0.6, -110);
    expect(k).toBeGreaterThan(0);
    expect(k).toBeLessThan(1);
  });
});
