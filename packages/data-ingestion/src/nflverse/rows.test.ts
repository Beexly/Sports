import { describe, expect, it } from "vitest";
import {
  contractCoversWindow,
  isIngestSeason,
  INGEST_SEASONS,
  projectContract,
  projectFourthDown,
  projectParticipation,
  projectRoster,
  projectSnap,
  splitIds,
} from "./rows.js";

describe("nflverse row projection", () => {
  it("keeps a contract inside the window and refuses a missing gsis id", () => {
    // A deal whose signed span overlaps any ingest season is kept.
    expect(contractCoversWindow(2022, 4)).toBe(true); // 2022..2025
    expect(contractCoversWindow(2016, 5)).toBe(true); // 2016..2020, reaches 2018

    // A deal signed INSIDE the window covers that season by construction, so a
    // null length is not a guess and does not refuse it. This flipped from false
    // to true when the window widened to 2018-2025: 2022 is now an ingest season.
    expect(contractCoversWindow(2022, null)).toBe(true);
    expect(contractCoversWindow(2025, null)).toBe(true);

    // The real "no guessed length" rule, tested where it binds: a season signed
    // OUTSIDE the window with an unknown length cannot be shown to reach it.
    expect(contractCoversWindow(2016, null)).toBe(false);
    expect(contractCoversWindow(2027, null)).toBe(false);
    expect(contractCoversWindow(2027, 3)).toBe(false); // 2027..2029, entirely after
    expect(contractCoversWindow(null, 4)).toBe(false);

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

  it("gates every projection on the shared ingest season list", () => {
    // One source of truth: the loader and the projection can never disagree
    // about which seasons exist.
    expect(isIngestSeason(2018)).toBe(true);
    expect(isIngestSeason(2025)).toBe(true);
    // 2026 is the application season, so it is an ingest season. The seasons that
    // must be refused are now 2017 and 2027, not 2017 and 2026.
    expect(isIngestSeason(2026)).toBe(true);
    expect(isIngestSeason(2017)).toBe(false);
    expect(isIngestSeason(2027)).toBe(false);
    expect(isIngestSeason(null)).toBe(false);
    expect(INGEST_SEASONS).toHaveLength(9);
    // 2025 is the holdout, so training history must actually be plural.
    expect(INGEST_SEASONS.filter((s) => s < 2025).length).toBeGreaterThanOrEqual(6);

    // A roster/snap/fourth-down row from a non-ingest season is refused, not
    // silently kept or silently dropped.
    expect(projectRoster({ season: 2017, gsis_id: "00-1" }, "season").ok).toBe(false);
    expect(projectRoster({ season: 2018, gsis_id: "00-1" }, "season").ok).toBe(true);
    expect(projectSnap({ game_id: "g", pfr_player_id: "p", season: 2027 }).ok).toBe(false);
    expect(projectSnap({ game_id: "g", pfr_player_id: "p", season: 2026 }).ok).toBe(true);
    expect(projectSnap({ game_id: "g", pfr_player_id: "p", season: 2019 }).ok).toBe(true);
    expect(projectFourthDown({ game_id: "g", play_id: 1, season: 2017 }).ok).toBe(false);
    expect(projectFourthDown({ game_id: "g", play_id: 1, season: 2019 }).ok).toBe(true);
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
