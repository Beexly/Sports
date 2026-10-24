import { describe, it, expect } from "vitest";
import { computeTeamSpecialTeamsEpa } from "../team-special-teams-epa.js";
import { type DrivePlay } from "../drives.js";
import { type PbpRow } from "../nflverse-pbp-mapper.js";

describe("Team Special Teams EPA (SHADOW)", () => {
  it("only ST play_types contribute and uses attached own-EPA", () => {
    const pbp: PbpRow[] = [
      { game_id: "2026_01_AAA_BBB", play_id: "1", play_type: "kickoff", posteam: "AAA", week: "1" },
      { game_id: "2026_01_AAA_BBB", play_id: "2", play_type: "pass", posteam: "AAA", week: "1" },
      { game_id: "2026_01_AAA_BBB", play_id: "3", play_type: "punt", posteam: "AAA", week: "1" },
    ];

    const drives: DrivePlay[] = [
      // referee epa should be ignored, only the attached own `epa` field
      { playId: "2026_01_AAA_BBB-1", gameId: "2026_01_AAA_BBB", driveId: 1, posteam: "AAA", playIndex: 1, yardline100: 50, pointsScored: 0, isSuccess: null, epa: 1.5 },
      { playId: "2026_01_AAA_BBB-2", gameId: "2026_01_AAA_BBB", driveId: 1, posteam: "AAA", playIndex: 2, yardline100: 50, pointsScored: 0, isSuccess: null, epa: 10.0 }, // non-ST, should be ignored
      { playId: "2026_01_AAA_BBB-3", gameId: "2026_01_AAA_BBB", driveId: 1, posteam: "AAA", playIndex: 3, yardline100: 50, pointsScored: 0, isSuccess: null, epa: -0.5 },
    ];

    // For this test, let's inject games so it passes the floor
    const validPbp: PbpRow[] = [...pbp];
    const validDrives: DrivePlay[] = [...drives];
    for (let i = 2; i <= 4; i++) {
      for (let j = 0; j < 10; j++) {
        validPbp.push({ game_id: `2026_0${i}_AAA_BBB`, play_id: `1${j}`, play_type: "kickoff", posteam: "AAA", week: i.toString() });
        validDrives.push({ playId: `2026_0${i}_AAA_BBB-1${j}`, gameId: `2026_0${i}_AAA_BBB`, driveId: i, posteam: "AAA", playIndex: 1, yardline100: 50, pointsScored: 0, isSuccess: null, epa: 0.1 });
      }
    }

    const out = computeTeamSpecialTeamsEpa(validPbp, validDrives, 10);

    // Non-ST plays are tracked in diagnostics
    expect(out.diagnostics.excludedNonSpecialTeamsPlays).toBe(1);

    const std = out.windows.find(w => w.window === "season-to-date")!;
    const aaa = std.teams.find(t => t.team === "AAA")!;

    expect(aaa).toBeDefined();

    // epaTotal = 1.5 - 0.5 + 30 * 0.1 = 4.0
    expect(aaa.epaTotal).toBe(4.0);
    expect(aaa.playCount).toBe(32); // 2 from original + 30 injected
  });

  it("empty-posteam rows excluded and counted", () => {
    const pbp: PbpRow[] = [
      { game_id: "2026_01_AAA_BBB", play_id: "1", play_type: "kickoff", posteam: "", week: "1" },
      { game_id: "2026_01_AAA_BBB", play_id: "2", play_type: "punt", posteam: "AAA", week: "1" },
    ];
    const drives: DrivePlay[] = [
      { playId: "2026_01_AAA_BBB-2", gameId: "2026_01_AAA_BBB", driveId: 1, posteam: "AAA", playIndex: 2, yardline100: 50, pointsScored: 0, isSuccess: null, epa: 1.0 },
    ];

    const out = computeTeamSpecialTeamsEpa(pbp, drives, 10);
    expect(out.diagnostics.excludedEmptyPosteamPlays).toBe(1);
  });

  it("splits sum to total", () => {
    const pbp: PbpRow[] = [];
    const drives: DrivePlay[] = [];
    let id = 1;
    // Inject sufficient data for floor
    for (let w = 1; w <= 3; w++) {
      for (const pt of ["kickoff", "punt", "field_goal", "extra_point"]) {
        for (let i = 0; i < 3; i++) {
          pbp.push({ game_id: `G${w}`, play_id: `${id}`, play_type: pt, posteam: "AAA", week: w.toString() });
          drives.push({ playId: `G${w}-${id}`, gameId: `G${w}`, driveId: 1, posteam: "AAA", playIndex: 1, yardline100: 50, pointsScored: 0, isSuccess: null, epa: 0.5 });
          id++;
        }
      }
    }

    const out = computeTeamSpecialTeamsEpa(pbp, drives, 10);
    const std = out.windows.find(w => w.window === "season-to-date")!;
    const aaa = std.teams.find(t => t.team === "AAA")!;

    expect(aaa.epaTotal).toBeCloseTo(
      aaa.splits.kickoff.epaTotal +
      aaa.splits.punt.epaTotal +
      aaa.splits.field_goal.epaTotal +
      aaa.splits.extra_point.epaTotal,
      4
    );

    expect(aaa.playCount).toBe(
      aaa.splits.kickoff.playCount +
      aaa.splits.punt.playCount +
      aaa.splits.field_goal.playCount +
      aaa.splits.extra_point.playCount
    );
  });

  it("EPA per game uses distinct game count", () => {
    const pbp: PbpRow[] = [];
    const drives: DrivePlay[] = [];
    let id = 1;
    for (let w = 1; w <= 5; w++) {
      // 10 plays per game = 50 total plays
      for (let i = 0; i < 10; i++) {
        pbp.push({ game_id: `G${w}`, play_id: `${id}`, play_type: "punt", posteam: "AAA", week: w.toString() });
        drives.push({ playId: `G${w}-${id}`, gameId: `G${w}`, driveId: 1, posteam: "AAA", playIndex: 1, yardline100: 50, pointsScored: 0, isSuccess: null, epa: 1.0 });
        id++;
      }
    }

    const out = computeTeamSpecialTeamsEpa(pbp, drives, 10);
    const std = out.windows.find(w => w.window === "season-to-date")!;
    const aaa = std.teams.find(t => t.team === "AAA")!;

    expect(aaa.playCount).toBe(50);
    expect(aaa.gameCount).toBe(5);
    expect(aaa.epaTotal).toBe(50.0);
    expect(aaa.epaPerGame).toBe(10.0); // 50.0 / 5
    expect(aaa.epaPerPlay).toBe(1.0);  // 50.0 / 50
  });

  it("team below floor is absent from window", () => {
    const pbp: PbpRow[] = [];
    const drives: DrivePlay[] = [];
    // Only 2 games, even with many plays, fails game floor
    for (let w = 1; w <= 2; w++) {
      for (let i = 0; i < 20; i++) {
        pbp.push({ game_id: `G${w}`, play_id: `1${i}`, play_type: "punt", posteam: "AAA", week: w.toString() });
        drives.push({ playId: `G${w}-1${i}`, gameId: `G${w}`, driveId: 1, posteam: "AAA", playIndex: 1, yardline100: 50, pointsScored: 0, isSuccess: null, epa: 1.0 });
      }
    }
    // 4 games, but only 20 plays, fails play floor
    for (let w = 1; w <= 4; w++) {
      for (let i = 0; i < 5; i++) {
        pbp.push({ game_id: `B${w}`, play_id: `2${i}`, play_type: "punt", posteam: "BBB", week: w.toString() });
        drives.push({ playId: `B${w}-2${i}`, gameId: `B${w}`, driveId: 1, posteam: "BBB", playIndex: 1, yardline100: 50, pointsScored: 0, isSuccess: null, epa: 1.0 });
      }
    }

    const out = computeTeamSpecialTeamsEpa(pbp, drives, 10);
    const std = out.windows.find(w => w.window === "season-to-date")!;

    expect(std.teams.find(t => t.team === "AAA")).toBeUndefined();
    expect(std.teams.find(t => t.team === "BBB")).toBeUndefined();
  });

  it("plays from week >= targetWeek never contribute", () => {
    const pbp: PbpRow[] = [];
    const drives: DrivePlay[] = [];

    // Inject past plays for AAA to pass the floor BEFORE target week
    for (let w = 1; w <= 3; w++) {
      for (let i = 0; i < 10; i++) {
        pbp.push({ game_id: `G${w}`, play_id: `1${i}`, play_type: "punt", posteam: "AAA", week: w.toString() });
        drives.push({ playId: `G${w}-1${i}`, gameId: `G${w}`, driveId: 1, posteam: "AAA", playIndex: 1, yardline100: 50, pointsScored: 0, isSuccess: null, epa: 1.0 });
      }
    }

    // Play ON target week
    pbp.push({ game_id: `G4`, play_id: `20`, play_type: "punt", posteam: "AAA", week: "4" });
    drives.push({ playId: `G4-20`, gameId: `G4`, driveId: 1, posteam: "AAA", playIndex: 1, yardline100: 50, pointsScored: 0, isSuccess: null, epa: 100.0 });

    // Play AFTER target week
    pbp.push({ game_id: `G5`, play_id: `30`, play_type: "punt", posteam: "AAA", week: "5" });
    drives.push({ playId: `G5-30`, gameId: `G5`, driveId: 1, posteam: "AAA", playIndex: 1, yardline100: 50, pointsScored: 0, isSuccess: null, epa: 100.0 });

    const out = computeTeamSpecialTeamsEpa(pbp, drives, 4); // Target week = 4
    const std = out.windows.find(w => w.window === "season-to-date")!;
    const aaa = std.teams.find(t => t.team === "AAA")!;

    expect(aaa.playCount).toBe(30);
    expect(aaa.epaTotal).toBe(30.0); // If the week 4/5 plays were included, it would be 230
  });
});
