import { describe, expect, it } from "vitest";
import {
  aggregateTeamFeatures,
  buildGameFeatureDifferentials,
  evaluateEthandojoBenchmark,
  ETHANDOJO_FEATURE_KEYS,
  fitEthandojoModel,
  predictGameOutcome,
  predictWinProb,
  runWalkForward,
  simulateEthandojoSeason,
  type EthandojoFeatureVector,
  type TeamGameInput,
} from "./ethandojo-game-predictor.js";

const complete = (values: readonly number[]): EthandojoFeatureVector =>
  Object.fromEntries(ETHANDOJO_FEATURE_KEYS.map((key, index) => [key, values[index] ?? 0])) as EthandojoFeatureVector;

function game(
  season: number,
  week: number,
  homeWon: 0 | 1,
  delta: number,
): TeamGameInput {
  return {
    gameId: `${season}-${week}`,
    season,
    week,
    homeTeam: "HOME",
    awayTeam: "AWAY",
    homeWon,
    homePoints: homeWon ? 24 : 17,
    awayPoints: homeWon ? 17 : 24,
    homeFeatures: complete([delta, 0.1, 1, 0.05, 7, 0.9, 0.8]),
    awayFeatures: complete([0, 0.1, 0, 0.05, 0, 0.9, 0.8]),
    projectedScoreHome: 24,
    projectedScoreAway: 20,
  } as TeamGameInput;
}

describe("ethandojo game predictor", () => {
  it("builds the seven fixed differentials by hand", () => {
    const input = {
      ...game(2024, 1, 1, 0.2),
      homeFeatures: complete([0.4, 0.2, 1, 0.3, 8, 0.9, 0.8]),
      awayFeatures: complete([0.1, 0.1, 0, 0.1, 3, 0.7, 0.6]),
    } satisfies TeamGameInput;
    expect(buildGameFeatureDifferentials(input)).toMatchObject({
      qbEPA: 0.30000000000000004,
      explosiveRate: 0.1,
      turnoverMargin: 1,
      passRush: 0.2,
      pointDiff: 5,
      availability: 0.2,
      rosterCarryover: 0.2,
    });
  });

  it("aggregates the specified nflverse play fields", () => {
    const features = aggregateTeamFeatures([
      {
        gameId: "g1", season: 2026, week: 1, posteam: "HOME", defteam: "AWAY",
        passerPlayerId: "QB", qbDropback: 1, epa: 0.4, playType: "pass", yardsGained: 20,
        pressure: 1, points: 7, offensiveSnaps: 10, projectedStarterSnaps: 9,
        priorSeasonProduction: 100, currentSeasonProduction: 75,
      },
      {
        gameId: "g1", season: 2026, week: 1, posteam: "HOME", defteam: "AWAY",
        qbDropback: 1, epa: -0.2, playType: "pass", yardsGained: 5,
        points: 0, offensiveSnaps: 10, projectedStarterSnaps: 8,
        priorSeasonProduction: 100, currentSeasonProduction: 50,
      },
    ]);
    expect(features).toEqual({
      qbEPA: 0.1,
      explosiveRate: 0.5,
      turnoverMargin: 0,
      passRush: 1,
      pointDiff: 7,
      availability: 0.85,
      rosterCarryover: 0.625,
    });
  });

  it("returns null rather than guessing for a missing differential", () => {
    const samples = Array.from({ length: 200 }, (_, index) => ({
      features: complete(index % 2 === 0 ? [1, 1, 1, 1, 1, 1, 1] : [0, 0, 0, 0, 0, 0, 0]),
      outcome: (index % 2 === 0 ? 1 : 0) as 0 | 1,
    }));
    const model = fitEthandojoModel(samples, "2026-09-25T00:00:00.000Z");
    expect(model).not.toBeNull();
    expect(predictWinProb(model, complete([1, 1, 1, 1, 1, 1, 1]), { now: () => new Date("2026-09-25T00:00:00.000Z") })).not.toBeNull();
    expect(predictWinProb(model, { ...complete([1, 1, 1, 1, 1, 1, 1]), qbEPA: null })).toBeNull();
  });

  it("evaluates the posted weekly benchmark gate", () => {
    const result = evaluateEthandojoBenchmark([
      { week: 1, predictedHomeWin: true, homeWon: 1 },
      { week: 1, predictedHomeWin: true, homeWon: 0 },
      { week: 2, predictedHomeWin: false, homeWon: 0 },
      { week: 2, predictedHomeWin: false, homeWon: 1 },
    ]);
    expect(result[0]).toMatchObject({ accuracy: 0.5, beatsCoinFlip: true, matchesOrBeatsPosted: false });
    expect(result[1]?.postedAccuracy).toBeCloseTo(11 / 16);
  });

  it("walk-forward training never includes the target week", () => {
    const games = [
      game(2018, 1, 1, 0.5), game(2018, 2, 0, -0.5),
      game(2019, 1, 1, 0.4), game(2019, 2, 0, -0.4),
      game(2020, 1, 1, 0.3), game(2020, 2, 0, -0.3),
    ];
    const output = runWalkForward(games);
    expect(output).toHaveLength(6);
    expect(output[0]!.model).toBeNull();
    expect(output[1]!.model?.provenance.sampleSize).toBe(1);
    expect(output[5]!.model?.provenance.sampleSize).toBe(5);
    for (let i = 0; i < output.length; i += 1) {
      const current = games[i]!;
      for (const earlier of output.slice(0, i)) {
        expect(earlier.game.week === current.week && earlier.game.season === current.season).toBe(false);
      }
    }
  });

  it("returns the complete output shape and runs the exact 10k season gate", () => {
    const input = game(2020, 2, 1, 0.3);
    const samples = Array.from({ length: 200 }, (_, index) => ({
      features: complete(index % 2 === 0 ? [1, 1, 1, 1, 1, 1, 1] : [0, 0, 0, 0, 0, 0, 0]),
      outcome: (index % 2 === 0 ? 1 : 0) as 0 | 1,
    }));
    const model = fitEthandojoModel(samples, "2026-09-25T00:00:00.000Z");
    expect(predictGameOutcome(model, input)).toEqual({ winProb: expect.any(Number), projectedScoreHome: 24, projectedScoreAway: 20 });
    const season = simulateEthandojoSeason({ A: [0.8, 0.8], B: [0.2, 0.2] });
    expect(season.A?.projectedWins).toBeCloseTo(2, 5);
    expect(season.A?.playoffOdds).toBe(1);
    expect(season.B?.playoffOdds).toBe(0);
  });
});
