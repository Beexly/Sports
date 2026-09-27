import { describe, expect, it } from "vitest";
import {
  contractCoversWindow,
  projectContract,
  projectFourthDown,
  projectParticipation,
  projectRoster,
  projectSnap,
  splitIds,
} from "./rows.js";

describe("nflverse row projection", () => {
  it("keeps a contract inside the window and refuses a missing gsis id", () => {
    expect(contractCoversWindow(2022, 4)).toBe(true);
    expect(contractCoversWindow(2022, null)).toBe(false);
    expect(contractCoversWindow(2026, 3)).toBe(false);
    const missing = projectContract({ player: "A", year_signed: 2024, gsis_id: "" });
    expect(missing.ok).toBe(false);
    const kept = projectContract({
      player: "A",
      team: "BUF",
      year_signed: 2024,
      years: 3,
      value: 10,
      apy: 4,
      guaranteed: 6,
      position: "QB",
      gsis_id: "00-0030000",
    });
    expect(kept.ok).toBe(true);
    if (kept.ok) expect(kept.row.gsis_id).toBe("00-0030000");
  });

  it("does not turn a blank snap count into zero", () => {
    const row = projectSnap({
      game_id: "2024_01_BAL_KC",
      pfr_player_id: "AlleJo02",
      season: 2024,
      week: 1,
      offense_snaps: "",
      offense_pct: "0.5",
    });
    expect(row.ok).toBe(true);
    if (row.ok) {
      expect(row.row.offense_snaps).toBeNull();
      expect(row.row.offense_pct).toBe(0.5);
    }
    expect(projectSnap({ game_id: "", pfr_player_id: "x", season: 2024 }).ok).toBe(false);
    expect(projectSnap({ game_id: "2024_01_BAL_KC", pfr_player_id: "", season: 2024 }).ok).toBe(false);
  });

  it("refuses a roster row without gsis_id and a play without an id", () => {
    expect(projectRoster({ season: 2025, full_name: "A" }, "season").ok).toBe(false);
    const play = projectParticipation({
      nflverse_game_id: "2024_01_BAL_KC",
      play_id: 1,
      players_on_play: "00-1;00-2",
    });
    expect(play.ok).toBe(true);
    if (play.ok) expect(play.row.players_on_field).toEqual(["00-1", "00-2"]);
    expect(projectParticipation({ nflverse_game_id: "2024_01_BAL_KC", play_id: "" }).ok).toBe(false);
    expect(splitIds("")).toBeNull();
  });

  it("keeps a fourth-down probability null when the cell is blank", () => {
    const row = projectFourthDown({ game_id: "2024_01_BAL_KC", play_id: 50, season: 2024, go_wp: "", punt_wp: 0.2, fg_wp: null });
    expect(row.ok).toBe(true);
    if (row.ok) {
      expect(row.row.go_wp).toBeNull();
      expect(row.row.punt_wp).toBe(0.2);
      expect(row.row.fg_wp).toBeNull();
    }
    expect(projectFourthDown({ game_id: "2024_01_BAL_KC", season: 2024 }).ok).toBe(false);
  });
});
