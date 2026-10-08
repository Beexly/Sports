import { describe, test, expect } from "vitest";
import type { DrivePlay } from "../drives.js";
import { driveFailureRate } from "../drive-failure-rate.js";

function makePlay(
  gameId: string,
  playId: string,
  posteam: string,
  driveId: number,
  pointsScored: number,
  terminalOutcome?: "TD" | "FG" | "PUNT" | "TURNOVER" | "TURNOVER_ON_DOWNS" | "SAFETY" | "END_OF_HALF" | "END_OF_GAME" | "MISSED_FG" | "OTHER"
): DrivePlay {
  return {
    gameId,
    playId,
    posteam,
    driveId,
    playIndex: parseInt(playId, 10),
    yardline100: 50,
    pointsScored,
    isSuccess: null,
    epa: null,
    terminalOutcome,
  };
}

describe("driveFailureRate", () => {
  test("calculates failure rates excluding target game and correctly groups windows", () => {
    const plays: DrivePlay[] = [];

    // Construct 20 games for Team A, season 2024, weeks 1 to 20
    for (let w = 1; w <= 20; w++) {
      const weekStr = w.toString().padStart(2, "0");
      const gameId = `2024_${weekStr}_AAA_BBB`;

      // Each game will have 2 drives. 1 TD, 1 PUNT.
      plays.push(makePlay(gameId, "1", "AAA", 1, 6, "TD"));
      plays.push(makePlay(gameId, "2", "AAA", 2, 0, "PUNT"));
    }

    // targetGameKey = 202415
    // So only games 1..14 should be counted. (14 games)
    // 14 games * 2 drives = 28 drives total.
    // Last 8 games = games 7..14. (8 games = 16 drives: 8 TD, 8 PUNT) -> 50% failure rate
    // Last 16 games = games 1..14 (only 14 games available). (14 games = 28 drives: 14 TD, 14 PUNT) -> 50%
    // Season = 14 games. (28 drives) -> 50%

    const results = driveFailureRate(plays, { targetGameKey: 202415 });
    const aaa = results.get("AAA");

    expect(aaa).toBeDefined();
    expect(aaa?.drivesCounted8).toBe(16);
    expect(aaa?.failureRate8).toBe(0.5);
    expect(aaa?.drivesCounted16).toBe(28);
    expect(aaa?.failureRate16).toBe(0.5);
    expect(aaa?.drivesCountedSeason).toBe(28);
    expect(aaa?.failureRateSeason).toBe(0.5);
  });

  test("correctly applies denominator and failure filters", () => {
    const plays: DrivePlay[] = [];
    const gameId = "2024_01_AAA_BBB";

    // Team B drives:
    // 1: PUNT (count denom, count fail)
    // 2: TURNOVER (count denom, count fail)
    // 3: TURNOVER_ON_DOWNS (count denom, count fail)
    // 4: SAFETY (count denom, NOT fail)
    // 5: TD (count denom, NOT fail)
    // 6: FG (count denom, NOT fail)
    // 7: END_OF_HALF (NOT denom)
    // 8: END_OF_GAME (NOT denom)
    // 9: MISSED_FG (NOT denom)
    // 10: OTHER (NOT denom)
    plays.push(makePlay(gameId, "1", "BBB", 1, 0, "PUNT"));
    plays.push(makePlay(gameId, "2", "BBB", 2, 0, "TURNOVER"));
    plays.push(makePlay(gameId, "3", "BBB", 3, 0, "TURNOVER_ON_DOWNS"));
    plays.push(makePlay(gameId, "4", "BBB", 4, 0, "SAFETY"));
    plays.push(makePlay(gameId, "5", "BBB", 5, 7, "TD"));
    plays.push(makePlay(gameId, "6", "BBB", 6, 3, "FG"));
    plays.push(makePlay(gameId, "7", "BBB", 7, 0, "END_OF_HALF"));
    plays.push(makePlay(gameId, "8", "BBB", 8, 0, "END_OF_GAME"));
    plays.push(makePlay(gameId, "9", "BBB", 9, 0, "MISSED_FG"));
    plays.push(makePlay(gameId, "10", "BBB", 10, 0, "OTHER"));

    // We have 6 denominator drives. 3 failure drives.
    // Since 6 < 8, the rates should be null!
    let results = driveFailureRate(plays, { targetGameKey: 202402 });
    let bbb = results.get("BBB");
    expect(bbb).toBeDefined();
    expect(bbb?.drivesCountedSeason).toBe(6);
    expect(bbb?.failureRateSeason).toBeNull();

    // Let's add 2 more TD drives to reach the 8 drive floor.
    plays.push(makePlay(gameId, "11", "BBB", 11, 7, "TD"));
    plays.push(makePlay(gameId, "12", "BBB", 12, 7, "TD"));

    results = driveFailureRate(plays, { targetGameKey: 202402 });
    bbb = results.get("BBB");

    // Now we have 8 denominator drives. 3 failures.
    expect(bbb?.drivesCountedSeason).toBe(8);
    expect(bbb?.failureRateSeason).toBe(3 / 8);
    expect(bbb?.failureRate8).toBe(3 / 8);
    expect(bbb?.failureRate16).toBe(3 / 8);
  });

  test("season window excludes previous season games", () => {
    const plays: DrivePlay[] = [];

    // Season 2023, 1 game with 8 failure drives
    const game1 = "2023_17_AAA_BBB";
    for (let i = 1; i <= 8; i++) {
      plays.push(makePlay(game1, `${i}`, "AAA", i, 0, "PUNT"));
    }

    // Season 2024, 1 game with 8 non-failure drives
    const game2 = "2024_01_AAA_BBB";
    for (let i = 1; i <= 8; i++) {
      plays.push(makePlay(game2, `${i}`, "AAA", i, 7, "TD"));
    }

    // targetGameKey = 202402
    // For 8-game: last 8 games = both game1 and game2. 16 drives. 8 failures. Rate 50%
    // For 16-game: 16 drives. Rate 50%
    // For season: only 2024 season (game2). 8 drives. 0 failures. Rate 0%

    const results = driveFailureRate(plays, { targetGameKey: 202402 });
    const aaa = results.get("AAA");

    expect(aaa).toBeDefined();
    expect(aaa?.drivesCounted8).toBe(16);
    expect(aaa?.failureRate8).toBe(0.5);
    expect(aaa?.drivesCountedSeason).toBe(8);
    expect(aaa?.failureRateSeason).toBe(0);
  });
});
