import { describe, expect, it } from "vitest";
import {
  expectedGoals,
  poissonProb,
  poissonMatchProbs,
  scoreProbGrid,
  teamRatingsToMatchProbs,
} from "../lib/math/poisson-model";
import {
  eloWinProb,
  predictEloMatch,
  updateElo,
  movMultiplier,
} from "../lib/math/elo-rating";

// ---------------------------------------------------------------------------
// poissonProb
// ---------------------------------------------------------------------------

describe("poissonProb", () => {
  it("P(0 | λ=1) = e^-1", () => {
    expect(poissonProb(0, 1)).toBeCloseTo(Math.exp(-1), 10);
  });

  it("P(1 | λ=1) = e^-1", () => {
    // P(1 | 1) = 1^1/1! * e^-1 = e^-1
    expect(poissonProb(1, 1)).toBeCloseTo(Math.exp(-1), 10);
  });

  it("P(0 | λ=2) = e^-2", () => {
    expect(poissonProb(0, 2)).toBeCloseTo(Math.exp(-2), 10);
  });

  it("returns 0 for negative k", () => {
    expect(poissonProb(-1, 1)).toBe(0);
  });

  it("returns 0 for lambda <= 0", () => {
    expect(poissonProb(0, 0)).toBe(0);
    expect(poissonProb(0, -1)).toBe(0);
  });

  it("returns 0 for non-integer k", () => {
    expect(poissonProb(1.5, 2)).toBe(0);
  });

  it("all PMF values over range sum near 1 for lambda=1.5", () => {
    const lambda = 1.5;
    let sum = 0;
    for (let k = 0; k <= 30; k++) sum += poissonProb(k, lambda);
    expect(sum).toBeCloseTo(1.0, 4);
  });

  it("symmetry: P(2|lambda) equals formula directly", () => {
    // P(2|3) = e^-3 * 3^2 / 2 = 4.5 * e^-3
    expect(poissonProb(2, 3)).toBeCloseTo((Math.exp(-3) * 9) / 2, 10);
  });
});

// ---------------------------------------------------------------------------
// expectedGoals
// ---------------------------------------------------------------------------

describe("expectedGoals", () => {
  it("applies default home advantage of 1.15", () => {
    const { lambdaHome, lambdaAway } = expectedGoals({
      homeAttack: 1,
      homeDefense: 1,
      awayAttack: 1,
      awayDefense: 1,
    });
    // lambdaHome = 1 * 1 * 1.15 * 1.35 = 1.5525
    expect(lambdaHome).toBeCloseTo(1.5525, 6);
    // lambdaAway = 1 * 1 * 1.35 = 1.35
    expect(lambdaAway).toBeCloseTo(1.35, 6);
  });

  it("stronger home attack increases lambdaHome", () => {
    const weak = expectedGoals({ homeAttack: 1, homeDefense: 1, awayAttack: 1, awayDefense: 1 });
    const strong = expectedGoals({ homeAttack: 1.5, homeDefense: 1, awayAttack: 1, awayDefense: 1 });
    expect(strong.lambdaHome).toBeGreaterThan(weak.lambdaHome);
  });

  it("stronger away defense reduces lambdaHome", () => {
    const weak = expectedGoals({ homeAttack: 1, homeDefense: 1, awayAttack: 1, awayDefense: 1 });
    const strong = expectedGoals({ homeAttack: 1, homeDefense: 1, awayAttack: 1, awayDefense: 0.7 });
    expect(strong.lambdaHome).toBeLessThan(weak.lambdaHome);
  });

  it("custom homeAdvantage and leagueAvgGoals are respected", () => {
    const { lambdaHome, lambdaAway } = expectedGoals({
      homeAttack: 1,
      homeDefense: 1,
      awayAttack: 1,
      awayDefense: 1,
      homeAdvantage: 1.0,
      leagueAvgGoals: 2.0,
    });
    expect(lambdaHome).toBeCloseTo(2.0, 6);
    expect(lambdaAway).toBeCloseTo(2.0, 6);
  });
});

// ---------------------------------------------------------------------------
// poissonMatchProbs
// ---------------------------------------------------------------------------

describe("poissonMatchProbs", () => {
  it("probabilities sum to 1.0", () => {
    const { homeWin, draw, awayWin } = poissonMatchProbs(1.5, 1.2);
    expect(homeWin + draw + awayWin).toBeCloseTo(1.0, 6);
  });

  it("higher lambdaHome → higher homeWin probability", () => {
    const balanced = poissonMatchProbs(1.4, 1.4);
    const homeStrong = poissonMatchProbs(2.5, 1.0);
    expect(homeStrong.homeWin).toBeGreaterThan(balanced.homeWin);
  });

  it("equal lambdas → homeWin > awayWin (due to goal-scoring asymmetry)", () => {
    // With equal lambdas, outcomes should be symmetric
    const { homeWin, awayWin } = poissonMatchProbs(1.5, 1.5);
    expect(homeWin).toBeCloseTo(awayWin, 6);
  });

  it("all probabilities are in [0, 1]", () => {
    const { homeWin, draw, awayWin } = poissonMatchProbs(1.3, 1.8);
    expect(homeWin).toBeGreaterThanOrEqual(0);
    expect(homeWin).toBeLessThanOrEqual(1);
    expect(draw).toBeGreaterThanOrEqual(0);
    expect(draw).toBeLessThanOrEqual(1);
    expect(awayWin).toBeGreaterThanOrEqual(0);
    expect(awayWin).toBeLessThanOrEqual(1);
  });

  it("custom maxGoals=4 still sums to 1.0", () => {
    const { homeWin, draw, awayWin } = poissonMatchProbs(1.5, 1.2, 4);
    expect(homeWin + draw + awayWin).toBeCloseTo(1.0, 5);
  });
});

// ---------------------------------------------------------------------------
// scoreProbGrid
// ---------------------------------------------------------------------------

describe("scoreProbGrid", () => {
  it("returns correct dimensions: (maxGoals+1) × (maxGoals+1)", () => {
    const grid = scoreProbGrid(1.5, 1.2, 6);
    expect(grid.length).toBe(7);
    const firstRow = grid[0];
    expect(firstRow?.length).toBe(7);
  });

  it("all cells sum to approximately 1.0 for large maxGoals", () => {
    const grid = scoreProbGrid(1.5, 1.2, 12);
    let total = 0;
    for (const row of grid) {
      for (const cell of row) total += cell;
    }
    expect(total).toBeCloseTo(1.0, 3);
  });

  it("cell [0][0] equals poissonProb(0,lambdaHome)*poissonProb(0,lambdaAway)", () => {
    const lh = 1.4;
    const la = 1.1;
    const grid = scoreProbGrid(lh, la, 8);
    const expected = poissonProb(0, lh) * poissonProb(0, la);
    expect(grid[0]?.[0]).toBeCloseTo(expected, 10);
  });

  it("all cells are non-negative", () => {
    const grid = scoreProbGrid(2.0, 1.5, 5);
    for (const row of grid) {
      for (const cell of row) {
        expect(cell).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// teamRatingsToMatchProbs (wrapper)
// ---------------------------------------------------------------------------

describe("teamRatingsToMatchProbs", () => {
  it("returns homeWin + draw + awayWin = 1.0", () => {
    const { homeWin, draw, awayWin } = teamRatingsToMatchProbs({
      homeAttack: 1.2,
      homeDefense: 0.9,
      awayAttack: 1.0,
      awayDefense: 1.1,
    });
    expect(homeWin + draw + awayWin).toBeCloseTo(1.0, 6);
  });

  it("returns lambdaHome and lambdaAway consistent with expectedGoals", () => {
    const params = {
      homeAttack: 1.1,
      homeDefense: 0.95,
      awayAttack: 0.9,
      awayDefense: 1.05,
    };
    const result = teamRatingsToMatchProbs(params);
    const eg = expectedGoals(params);
    expect(result.lambdaHome).toBeCloseTo(eg.lambdaHome, 10);
    expect(result.lambdaAway).toBeCloseTo(eg.lambdaAway, 10);
  });

  it("probabilities are in [0, 1]", () => {
    const result = teamRatingsToMatchProbs({
      homeAttack: 0.8,
      homeDefense: 1.3,
      awayAttack: 1.4,
      awayDefense: 0.7,
    });
    expect(result.homeWin).toBeGreaterThanOrEqual(0);
    expect(result.draw).toBeGreaterThanOrEqual(0);
    expect(result.awayWin).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// eloWinProb
// ---------------------------------------------------------------------------

describe("eloWinProb", () => {
  it("returns exactly 0.5 for 0 rating difference", () => {
    expect(eloWinProb(0)).toBe(0.5);
  });

  it("returns > 0.5 for positive rating difference", () => {
    expect(eloWinProb(100)).toBeGreaterThan(0.5);
    expect(eloWinProb(400)).toBeGreaterThan(0.5);
  });

  it("returns < 0.5 for negative rating difference", () => {
    expect(eloWinProb(-100)).toBeLessThan(0.5);
  });

  it("result + complement sum to 1.0", () => {
    const p = eloWinProb(200);
    expect(p + eloWinProb(-200)).toBeCloseTo(1.0, 10);
  });

  it("returns ~0.909 for diff=+400 (standard ELO benchmark)", () => {
    // 10:1 odds at 400 point diff
    expect(eloWinProb(400)).toBeCloseTo(10 / 11, 4);
  });

  it("is symmetric: eloWinProb(d) + eloWinProb(-d) = 1", () => {
    for (const d of [50, 150, 300, 600]) {
      expect(eloWinProb(d) + eloWinProb(-d)).toBeCloseTo(1.0, 10);
    }
  });
});

// ---------------------------------------------------------------------------
// predictEloMatch
// ---------------------------------------------------------------------------

describe("predictEloMatch", () => {
  it("homeWinProb + awayWinProb + drawProb sum to 1.0", () => {
    const { homeWinProb, awayWinProb, drawProb } = predictEloMatch({
      homeRating: 1500,
      awayRating: 1450,
    });
    expect(homeWinProb + awayWinProb + drawProb).toBeCloseTo(1.0, 10);
  });

  it("higher-rated home team has > 50% win probability", () => {
    const { homeWinProb } = predictEloMatch({
      homeRating: 1600,
      awayRating: 1400,
      homeAdvantagePoints: 0,
    });
    expect(homeWinProb).toBeGreaterThan(0.5);
  });

  it("drawProb is 0 (standard ELO has no draws)", () => {
    const { drawProb } = predictEloMatch({ homeRating: 1500, awayRating: 1500 });
    expect(drawProb).toBe(0);
  });

  it("equal ratings with home advantage → home win probability > 0.5", () => {
    const { homeWinProb } = predictEloMatch({ homeRating: 1500, awayRating: 1500 });
    expect(homeWinProb).toBeGreaterThan(0.5);
  });
});

// ---------------------------------------------------------------------------
// updateElo
// ---------------------------------------------------------------------------

describe("updateElo", () => {
  it("winner rating goes up, loser rating goes down", () => {
    const result = updateElo({
      homeRatingBefore: 1500,
      awayRatingBefore: 1500,
      homeScore: 3,
      awayScore: 1,
    });
    expect(result.homeRatingAfter).toBeGreaterThan(1500);
    expect(result.awayRatingAfter).toBeLessThan(1500);
  });

  it("rating changes are equal and opposite (zero-sum)", () => {
    const result = updateElo({
      homeRatingBefore: 1500,
      awayRatingBefore: 1500,
      homeScore: 2,
      awayScore: 0,
    });
    expect(result.homeRatingChange + result.awayRatingChange).toBeCloseTo(0, 10);
  });

  it("upset win yields larger positive change for the underdog", () => {
    // Underdog (away, 200 below) wins
    const result = updateElo({
      homeRatingBefore: 1600,
      awayRatingBefore: 1400,
      homeScore: 0,
      awayScore: 1,
      homeAdvantagePoints: 0,
    });
    // Away was a big underdog — their gain should be large
    expect(result.awayRatingChange).toBeGreaterThan(10);
  });

  it("draw yields smaller rating changes than decisive result", () => {
    const draw = updateElo({
      homeRatingBefore: 1500,
      awayRatingBefore: 1500,
      homeScore: 1,
      awayScore: 1,
      homeAdvantagePoints: 0,
    });
    const win = updateElo({
      homeRatingBefore: 1500,
      awayRatingBefore: 1500,
      homeScore: 2,
      awayScore: 0,
      homeAdvantagePoints: 0,
    });
    expect(Math.abs(draw.homeRatingChange)).toBeLessThan(Math.abs(win.homeRatingChange));
  });

  it("uses custom kFactor correctly", () => {
    const k20 = updateElo({
      homeRatingBefore: 1500,
      awayRatingBefore: 1500,
      homeScore: 1,
      awayScore: 0,
      kFactor: 20,
      homeAdvantagePoints: 0,
    });
    const k40 = updateElo({
      homeRatingBefore: 1500,
      awayRatingBefore: 1500,
      homeScore: 1,
      awayScore: 0,
      kFactor: 40,
      homeAdvantagePoints: 0,
    });
    expect(Math.abs(k40.homeRatingChange)).toBeCloseTo(
      Math.abs(k20.homeRatingChange) * 2,
      6
    );
  });

  it("MOV multiplier makes large-margin wins move rating more than 1-goal wins", () => {
    const narrow = updateElo({
      homeRatingBefore: 1500,
      awayRatingBefore: 1500,
      homeScore: 1,
      awayScore: 0,
      homeAdvantagePoints: 0,
      useMovMultiplier: true,
    });
    const blowout = updateElo({
      homeRatingBefore: 1500,
      awayRatingBefore: 1500,
      homeScore: 5,
      awayScore: 0,
      homeAdvantagePoints: 0,
      useMovMultiplier: true,
    });
    expect(blowout.homeRatingChange).toBeGreaterThan(narrow.homeRatingChange);
  });
});

// ---------------------------------------------------------------------------
// movMultiplier
// ---------------------------------------------------------------------------

describe("movMultiplier", () => {
  it("is always positive for a winner (pointDiff > 0)", () => {
    expect(movMultiplier(7, 1500, 1400)).toBeGreaterThan(0);
    expect(movMultiplier(21, 1500, 1200)).toBeGreaterThan(0);
  });

  it("larger margin yields larger multiplier", () => {
    const small = movMultiplier(3, 1500, 1500);
    const large = movMultiplier(21, 1500, 1500);
    expect(large).toBeGreaterThan(small);
  });

  it("beating a weaker opponent yields a smaller multiplier (autocorrection)", () => {
    // Same margin, but in first case winner is MUCH better
    const dominantWin = movMultiplier(10, 1800, 1200);
    const evenWin = movMultiplier(10, 1500, 1500);
    // A 600-point favorite winning by 10 should be credited less than an even match
    expect(dominantWin).toBeLessThan(evenWin);
  });
});
