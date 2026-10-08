import { describe, expect, it } from "vitest";
import { gameScriptSplits, type GameScriptSplitPlay } from "../game-script-splits.js";
import type { DriveResult } from "../drives.js";

describe("gameScriptSplits", () => {
  function play(
    id: number,
    posteam: string,
    qtr: number,
    epa: number,
    pointsScored: number,
    driveId: number,
    season: number,
    week: number,
    terminalOutcome?: DriveResult
  ): GameScriptSplitPlay {
    return {
      playId: String(id),
      gameId: "G1",
      driveId,
      posteam,
      playIndex: id,
      yardline100: 50,
      pointsScored,
      isSuccess: null,
      epa,
      season,
      week,
      qtr,
      terminalOutcome,
    };
  }

  it("calculates accurate splits and excludes OT", () => {
    const plays: GameScriptSplitPlay[] = [];
    // Team A: 60 plays in 1H (all EPA 1, 3 drives each ending in TD 7 points)
    // Team A: 60 plays in 2H (all EPA 2, 3 drives each ending in TD 7 points)
    // Team A: 1 play in OT (Drive 7, excluded)

    for (let i = 1; i <= 60; i++) {
      const drive = Math.floor((i - 1) / 20) + 1; // Drives 1, 2, 3
      const terminal = i % 20 === 0 ? "TD" : undefined;
      plays.push(play(i, "TeamA", 1, 1, i % 20 === 0 ? 7 : 0, drive, 2024, 1, terminal));
    }

    for (let i = 61; i <= 120; i++) {
      const drive = Math.floor((i - 61) / 20) + 4; // Drives 4, 5, 6
      const terminal = i % 20 === 0 ? "TD" : undefined;
      plays.push(play(i, "TeamA", 3, 2, i % 20 === 0 ? 7 : 0, drive, 2024, 1, terminal));
    }

    plays.push(play(121, "TeamA", 5, 5, 0, 7, 2024, 1, "PUNT"));

    const res = gameScriptSplits(plays, { targetGameKey: 202405 });
    const teamA = res.get("TeamA")!;

    expect(teamA.half1EpaPerPlay).toBeCloseTo(1); // 60 / 60
    expect(teamA.half1PointsPerDrive).toBeCloseTo(7); // 21 / 3

    expect(teamA.half2EpaPerPlay).toBeCloseTo(2); // 120 / 60
    expect(teamA.half2PointsPerDrive).toBeCloseTo(7); // 21 / 3

    expect(teamA.epaPerPlayDifferential).toBeCloseTo(1); // 2 - 1
    expect(teamA.pointsPerDriveDifferential).toBeCloseTo(0); // 7 - 7

    expect(teamA.otDrivesExcluded).toBe(1);
  });

  it("returns nulls if under 60-play floor", () => {
    const plays: GameScriptSplitPlay[] = [];
    for (let i = 1; i <= 59; i++) {
      plays.push(play(i, "TeamA", 1, 1, 0, 1, 2024, 1, i === 59 ? "PUNT" : undefined));
    }
    for (let i = 60; i <= 120; i++) {
      plays.push(play(i, "TeamA", 3, 2, 0, 2, 2024, 1, i === 120 ? "PUNT" : undefined));
    }

    const res = gameScriptSplits(plays, { targetGameKey: 202405 });
    const teamA = res.get("TeamA")!;

    expect(teamA.half1EpaPerPlay).toBeNull();
    expect(teamA.half1PointsPerDrive).toBeNull();

    expect(teamA.half2EpaPerPlay).toBeCloseTo(2); // 122 / 61
    expect(teamA.half2PointsPerDrive).toBeCloseTo(0); // 0 / 1

    expect(teamA.epaPerPlayDifferential).toBeNull();
    expect(teamA.pointsPerDriveDifferential).toBeNull();
  });

  it("enforces point-in-time filter", () => {
    const plays: GameScriptSplitPlay[] = [];
    for (let i = 1; i <= 60; i++) {
      plays.push(play(i, "TeamA", 1, 1, 0, 1, 2024, 1, i === 60 ? "PUNT" : undefined));
      plays.push(play(i + 100, "TeamA", 3, 1, 0, 2, 2024, 1, i === 60 ? "PUNT" : undefined));
    }
    // Future plays (week 5 >= targetGameKey 202405)
    for (let i = 1; i <= 10; i++) {
      plays.push(play(i + 200, "TeamA", 1, 10, 0, 3, 2024, 5, i === 10 ? "PUNT" : undefined));
    }

    const res = gameScriptSplits(plays, { targetGameKey: 202405 });
    const teamA = res.get("TeamA")!;

    // The future plays have EPA 10, but they should be filtered out.
    // If they were included, half1 EPA per play would be higher than 1.
    expect(teamA.half1EpaPerPlay).toBeCloseTo(1);
    expect(teamA.half2EpaPerPlay).toBeCloseTo(1);
  });
});
