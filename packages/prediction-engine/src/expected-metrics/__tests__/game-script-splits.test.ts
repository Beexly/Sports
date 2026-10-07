import { describe, it, expect } from "vitest";
import { computeGameScriptSplits } from "../game-script-splits.js";
import type { PbpRow } from "../nflverse-pbp-mapper.js";

const row = (overrides: Partial<PbpRow>): PbpRow => ({
  game_id: "2024_01_AAA_BBB",
  play_id: "1",
  season: "2024",
  week: "1",
  season_type: "REG",
  qtr: "1",
  game_half: "Half1",
  posteam: "AAA",
  defteam: "BBB",
  play_type: "pass",
  down: "1",
  ydstogo: "10",
  yardline_100: "75",
  yards_gained: "0",
  touchdown: "0",
  interception: "0",
  fumble_lost: "0",
  ep: "1.0",
  epa: "0.5",
  wp: "0.5",
  wpa: "0.01",
  result: "3",
  home_team: "AAA",
  away_team: "BBB",
  score_differential: "0",
  game_seconds_remaining: "3600",
  posteam_timeouts_remaining: "3",
  defteam_timeouts_remaining: "3",
  posteam_score: "0",
  defteam_score: "0",
  posteam_score_post: "0",
  defteam_score_post: "0",
  ...overrides,
});

describe("game-script-splits", () => {
  it("computes basic partition completeness", () => {
    const rows = [
      row({ play_id: "1", qtr: "1", epa: "0.5", fixed_drive: "1", fixed_drive_result: "Punt" }),
      row({ play_id: "2", qtr: "2", epa: "1.5", fixed_drive: "1", fixed_drive_result: "Punt" }),
      // Drive 2 in 2H
      row({ play_id: "3", qtr: "3", epa: "2.0", fixed_drive: "2", fixed_drive_result: "Touchdown", posteam_score: "0", posteam_score_post: "6" }),
      row({ play_id: "4", qtr: "4", epa: "-0.5", fixed_drive: "3", fixed_drive_result: "Punt" }),
    ];

    // Low minPlays for tests
    const splits = computeGameScriptSplits(rows, 2024, 2, 0);
    expect(splits).toHaveLength(2); // AAA (offense) and BBB (defense)

    const aaa = splits.find(s => s.teamId === "AAA")!;
    expect(aaa.plays1H).toBe(2);
    expect(aaa.plays2H).toBe(2);
    expect(aaa.drives1H).toBe(1);
    expect(aaa.drives2H).toBe(2); // fixed_drive 2, 3
  });

  it("enforces point-in-time cutoff (strict inequality)", () => {
    const rows = [
      row({ week: "1", play_id: "1", qtr: "1" }),
      row({ week: "2", play_id: "2", qtr: "1" }), // Excluded if fixture is week 2
    ];

    const splits = computeGameScriptSplits(rows, 2024, 2, 0);
    const aaa = splits.find(s => s.teamId === "AAA")!;
    expect(aaa.plays1H).toBe(1); // Only week 1 play is included
  });

  it("nulls out low sample sizes", () => {
    const rows = [
      row({ play_id: "1", qtr: "1" }),
    ];
    const splits = computeGameScriptSplits(rows, 2024, 2, 10);
    const aaa = splits.find(s => s.teamId === "AAA")!;
    expect(aaa.epaPerPlay1H).toBeNull();
    expect(aaa.epaDifferentialOffense).toBeNull();
  });

  it("produces correct differential sign (outscored 1H, outscores 2H)", () => {
    const rows = [
      // 1H: AAA bad
      row({ play_id: "1", qtr: "1", epa: "-2.0", fixed_drive: "1" }),
      // 2H: AAA good
      row({ play_id: "2", qtr: "3", epa: "3.0", fixed_drive: "2" }),
    ];
    const splits = computeGameScriptSplits(rows, 2024, 2, 0);
    const aaa = splits.find(s => s.teamId === "AAA")!;
    expect(aaa.epaDifferentialOffense).toBeGreaterThan(0); // 2H - 1H is positive
  });

  it("counts overtime plays in 2H", () => {
    const rows = [
      row({ play_id: "1", qtr: "5", epa: "1.0", fixed_drive: "1" }),
    ];
    const splits = computeGameScriptSplits(rows, 2024, 2, 0);
    const aaa = splits.find(s => s.teamId === "AAA")!;
    expect(aaa.plays1H).toBe(0);
    expect(aaa.plays2H).toBe(1);
  });

  it("excludes quarter 0 or null-quarter plays completely", () => {
    const rows = [
      row({ play_id: "1", qtr: "0" }),
      row({ play_id: "2", qtr: "" }),
      row({ play_id: "3", qtr: "1", epa: "0.5", fixed_drive: "1" }),
    ];
    const splits = computeGameScriptSplits(rows, 2024, 2, 0);
    const aaa = splits.find(s => s.teamId === "AAA")!;
    expect(aaa.plays1H).toBe(1); // Only play_id 3 is included
    expect(aaa.plays2H).toBe(0);
  });
});
