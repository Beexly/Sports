import { describe, it, expect } from "vitest";
import {
  computeTeamScoringRates,
  estimateMatchupLambdas,
  poissonIndependentFairValue,
  isPoissonValidSport,
  MIN_GAMES_FOR_RATES,
  type TeamGameRecord,
  type TeamScoringRates,
} from "../team-rates.js";

const games = (n: number, teamScore: number, opponentScore: number, isBootstrap = false): TeamGameRecord[] =>
  Array.from({ length: n }, () => ({ teamScore, opponentScore, isBootstrap }));

describe("isPoissonValidSport — only where the model holds", () => {
  it("accepts low-count scoring sports (soccer, hockey, baseball)", () => {
    expect(isPoissonValidSport("soccer_epl")).toBe(true);
    expect(isPoissonValidSport("icehockey_nhl")).toBe(true);
    expect(isPoissonValidSport("baseball_mlb")).toBe(true);
  });

  it("rejects high-scoring sports where independent Poisson is not defensible", () => {
    expect(isPoissonValidSport("basketball_nba")).toBe(false);
    expect(isPoissonValidSport("americanfootball_nfl")).toBe(false);
  });
});

describe("computeTeamScoringRates — real averages, small-sample honesty", () => {
  it("returns null below the minimum game count (never a noisy rate)", () => {
    expect(computeTeamScoringRates(games(MIN_GAMES_FOR_RATES - 1, 2, 1))).toBeNull();
  });

  it("averages real scored/allowed once the sample clears the floor", () => {
    const rates = computeTeamScoringRates([
      { teamScore: 3, opponentScore: 1 },
      { teamScore: 1, opponentScore: 1 },
      { teamScore: 2, opponentScore: 0 },
      { teamScore: 0, opponentScore: 2 },
      { teamScore: 4, opponentScore: 1 },
    ]);
    expect(rates).not.toBeNull();
    expect(rates!.gamesUsed).toBe(5);
    expect(rates!.scoredPerGame).toBeCloseTo(2.0, 5); // (3+1+2+0+4)/5
    expect(rates!.allowedPerGame).toBeCloseTo(1.0, 5); // (1+1+0+2+1)/5
    expect(rates!.bootstrapShare).toBe(0);
  });

  it("surfaces the bootstrap share of the sample", () => {
    const rates = computeTeamScoringRates([
      ...games(3, 2, 1, true),
      ...games(3, 2, 1, false),
    ]);
    expect(rates!.bootstrapShare).toBeCloseTo(0.5, 5);
  });

  it("ignores malformed records (negative / non-finite scores)", () => {
    const rates = computeTeamScoringRates([
      ...games(5, 2, 1),
      { teamScore: -1, opponentScore: 2 },
      { teamScore: Number.NaN, opponentScore: 1 },
    ]);
    expect(rates!.gamesUsed).toBe(5);
  });
});

describe("estimateMatchupLambdas — attack/defense vs league average", () => {
  const strong: TeamScoringRates = { gamesUsed: 8, scoredPerGame: 2.0, allowedPerGame: 1.0, bootstrapShare: 0 };
  const weak: TeamScoringRates = { gamesUsed: 8, scoredPerGame: 1.0, allowedPerGame: 1.8, bootstrapShare: 0 };

  it("returns null for a degenerate league anchor", () => {
    expect(estimateMatchupLambdas(strong, weak, 0)).toBeNull();
  });

  it("gives the stronger home team the higher λ", () => {
    const l = estimateMatchupLambdas(strong, weak, 1.4)!;
    expect(l.lambdaHome).toBeGreaterThan(l.lambdaAway);
  });

  it("applies the home-advantage multiplier (home λ rises with HFA)", () => {
    const flat = estimateMatchupLambdas(strong, strong, 1.4, 1.0)!;
    const withHfa = estimateMatchupLambdas(strong, strong, 1.4, 1.2)!;
    expect(withHfa.lambdaHome).toBeGreaterThan(flat.lambdaHome);
    expect(withHfa.lambdaAway).toBeCloseTo(flat.lambdaAway, 5); // away λ unaffected
  });
});

describe("poissonIndependentFairValue — the 2nd independent estimator", () => {
  const base = { sportKey: "soccer_epl", leagueAvgScored: 1.4 };

  it("returns null for a sport where the model is not defensible", () => {
    const fv = poissonIndependentFairValue({
      ...base,
      sportKey: "basketball_nba",
      homeRecords: games(8, 110, 100),
      awayRecords: games(8, 100, 108),
    });
    expect(fv).toBeNull();
  });

  it("returns null when either side has too few real games", () => {
    const fv = poissonIndependentFairValue({
      ...base,
      homeRecords: games(8, 2, 1),
      awayRecords: games(MIN_GAMES_FOR_RATES - 1, 1, 2),
    });
    expect(fv).toBeNull();
  });

  it("returns null on a degenerate league average", () => {
    const fv = poissonIndependentFairValue({
      ...base,
      leagueAvgScored: 0,
      homeRecords: games(8, 2, 1),
      awayRecords: games(8, 1, 2),
    });
    expect(fv).toBeNull();
  });

  it("favors the stronger home team and renormalises to a clean 2-way prob", () => {
    const fv = poissonIndependentFairValue({
      ...base,
      homeRecords: games(8, 2, 1), // scores more, concedes less
      awayRecords: games(8, 1, 2), // the opposite
    })!;
    expect(fv).not.toBeNull();
    expect(fv.homeFairProb).toBeGreaterThan(fv.awayFairProb);
    expect(fv.homeFairProb + fv.awayFairProb).toBeCloseTo(1.0, 6); // draw removed
    expect(fv.lambdaHome).toBeGreaterThan(fv.lambdaAway);
    expect(fv.homeGames).toBe(8);
  });

  it("gives evenly-matched teams a near-coin-flip, nudged by home advantage", () => {
    const fv = poissonIndependentFairValue({
      ...base,
      homeRecords: games(8, 1, 1),
      awayRecords: games(8, 1, 1),
    })!;
    // Identical teams → home edge comes only from HFA → just above 0.5.
    expect(fv.homeFairProb).toBeGreaterThan(0.5);
    expect(fv.homeFairProb).toBeLessThan(0.6);
  });

  it("carries the weaker-provenance bootstrap share of the two teams", () => {
    const fv = poissonIndependentFairValue({
      ...base,
      homeRecords: games(8, 2, 1, false),
      awayRecords: [...games(4, 1, 2, true), ...games(4, 1, 2, false)],
    })!;
    expect(fv.bootstrapShare).toBeCloseTo(0.5, 5); // max(0, 0.5)
  });
});
