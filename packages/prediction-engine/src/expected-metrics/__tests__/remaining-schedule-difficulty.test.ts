import { describe, it, expect } from "vitest";
import {
  computeRemainingScheduleDifficulty,
  type DefensivePlay,
  type NormalizedGame,
} from "../remaining-schedule-difficulty.js";

describe("remaining-schedule-difficulty", () => {
  it("calculates difficulty with per-game weighting, shrinkage, and floors", () => {
    const plays: DefensivePlay[] = [];

    // Add OPP1 plays
    for (let i = 0; i < 100; i++) {
      plays.push({
        playId: "opp1-" + i,
        gameId: "g" + (i % 3),
        defteam: "OPP1",
        week: 1,
        epa: 0.1,
      });
    }

    // Add OPP2 plays
    for (let i = 0; i < 200; i++) {
      plays.push({
        playId: "opp2-" + i,
        gameId: "g" + (i % 4),
        defteam: "OPP2",
        week: 2,
        epa: 0.1,
      });
    }

    // Add OPP3 plays (excluded distinct games floor)
    for (let i = 0; i < 100; i++) {
      plays.push({
        playId: "opp3-" + i,
        gameId: "g" + (i % 2),
        defteam: "OPP3",
        week: 1,
        epa: 0.5,
      });
    }

    // Add OPP4 plays (excluded plays floor)
    for (let i = 0; i < 99; i++) {
      plays.push({
        playId: "opp4-" + i,
        gameId: "g" + (i % 3),
        defteam: "OPP4",
        week: 1,
        epa: 0.5,
      });
    }

    plays.push({ playId: "late", gameId: "gx", defteam: "OPP2", week: 5, epa: 0.9 });
    plays.push({ playId: "null", gameId: "g0", defteam: "OPP1", week: 1, epa: null });

    const schedule: NormalizedGame[] = [
      { season: 2023, week: 5, home_team: "TEAM_A", away_team: "OPP1", game_type: "REG" },
      { season: 2023, week: 6, home_team: "TEAM_A", away_team: "OPP1", game_type: "REG" },
      { season: 2023, week: 7, home_team: "TEAM_A", away_team: "OPP2", game_type: "REG" },
      { season: 2023, week: 8, home_team: "TEAM_A", away_team: "OPP3", game_type: "REG" },
      { season: 2023, week: 4, home_team: "TEAM_A", away_team: "OPP1", game_type: "REG" },
      { season: 2023, week: 5, home_team: "TEAM_B", away_team: "OPP4", game_type: "REG" },
    ];

    const results = computeRemainingScheduleDifficulty(plays, schedule, 2023, 5);

    const expectedLeagueMean = 129.5 / 499;
    const expectedOpp1Shrunk = expectedLeagueMean + (100 / 300) * (0.1 - expectedLeagueMean);
    const expectedOpp2Shrunk = expectedLeagueMean + (200 / 400) * (0.1 - expectedLeagueMean);

    const teamAResult = results.find(r => r.team === "TEAM_A")!;
    expect(teamAResult.remainingGames).toBe(4);
    expect(teamAResult.opponentsConsidered).toBe(3);
    expect(teamAResult.opponentsExcludedBelowFloor).toBe(1);

    const expectedDifficulty = (expectedOpp1Shrunk * 2 + expectedOpp2Shrunk) / 3;
    expect(teamAResult.difficulty).toBeCloseTo(expectedDifficulty, 4);

    const teamBResult = results.find(r => r.team === "TEAM_B")!;
    expect(teamBResult.remainingGames).toBe(1);
    expect(teamBResult.opponentsConsidered).toBe(0);
    expect(teamBResult.opponentsExcludedBelowFloor).toBe(1);
    expect(teamBResult.difficulty).toBeNull();
  });
});
