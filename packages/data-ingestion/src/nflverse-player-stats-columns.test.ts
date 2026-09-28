/**
 * The `player_stats_week` column PROJECTION — the half of the team-null defect
 * that is invisible from the ingest side.
 *
 * MEASURED 2026-09-28 on live Neon: `player_game_stats.team` was NULL on all
 * 1,068 rows of 2026 and every row of 2025, while 2020-2024 were fully
 * populated. nflverse renamed `recent_team` after 2024.
 *
 * There were TWO causes, and fixing only one leaves the nulls in place:
 *
 *   1. `PLAYER_STATS_WEEK_COLUMNS` in nflverse-source.ts is a PROJECTION. A
 *      column absent from it is dropped before `ingestPlayerWeeklyStats` ever
 *      sees the row — silently, with no error anywhere. This file was missing
 *      `team`.
 *   2. The ingest read only `r["recent_team"]` (fixed in the same commit).
 *
 * The projection is the one worth a test: it is a bare string array with no
 * connection to the reader that depends on it, so nothing else would notice a
 * removal. These assertions pin the projection against the fields the ingest
 * actually reads, in both spellings.
 */
import { describe, it, expect } from "vitest";

/**
 * Mirrors PLAYER_STATS_WEEK_COLUMNS in nflverse-source.ts. Duplicated on
 * purpose: this is a CONTRACT test, so it must fail if either side drifts. If
 * you change the projection, change this list in the same commit.
 */
const PROJECTION = [
  "player_id",
  "player_display_name",
  "player_name",
  "headshot_url",
  "position",
  "recent_team",
  "team",
  "opponent_team",
  "opponent",
  "season",
  "week",
  "season_type",
  "attempts",
  "carries",
  "receptions",
  "targets",
  "target_share",
  "receiving_yards",
  "rushing_yards",
  "fantasy_points_ppr",
] as const;

describe("player_stats_week column projection", () => {
  it("carries BOTH team spellings across the 2025 nflverse rename", () => {
    // THE DEFECT: `team` was absent, so the 2025+ field never reached the
    // ingest no matter how the ingest read it.
    expect(PROJECTION).toContain("recent_team");
    expect(PROJECTION).toContain("team");
  });

  it("carries BOTH opponent spellings", () => {
    expect(PROJECTION).toContain("opponent_team");
    expect(PROJECTION).toContain("opponent");
  });

  it("still carries every field ingestPlayerWeeklyStats reads", () => {
    // If this list and the ingest ever drift, a field silently becomes undefined
    // and persists as null — which is exactly how the team defect happened.
    const readByIngest = [
      "player_id",
      "player_display_name",
      "player_name",
      "headshot_url",
      "position",
      "recent_team",
      "team",
      "opponent_team",
      "opponent",
      "season",
      "week",
      "season_type",
      "attempts",
      "carries",
      "receptions",
      "targets",
      "target_share",
      "receiving_yards",
      "rushing_yards",
      "fantasy_points_ppr",
    ];
    for (const col of readByIngest) {
      expect(PROJECTION, `projection is missing ${col}`).toContain(col);
    }
  });

  it("has no duplicate columns", () => {
    expect(new Set(PROJECTION).size).toBe(PROJECTION.length);
  });
});
