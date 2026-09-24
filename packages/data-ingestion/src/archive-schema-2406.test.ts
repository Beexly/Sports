import { describe, expect, it } from "vitest";
import { NFL_ARCHIVE_TABLES, validateLoad } from "./archive-schema-2406.js";

describe("archive schema", () => {
  it("covers games, pbp, rosters, injuries, odds, transcripts", () => {
    const names = NFL_ARCHIVE_TABLES.map((t) => t.name);
    for (const n of ["games", "play_by_play", "rosters", "injuries", "odds_history", "commentary_transcripts"]) {
      expect(names).toContain(n);
    }
  });
  it("validates a correct load", () => {
    const v = validateLoad("games", ["game_id", "season", "week", "home_team", "away_team", "extra"], 100);
    expect(v.ok).toBe(true);
    expect(v.missingColumns).toEqual([]);
  });
  it("flags missing columns", () => {
    const v = validateLoad("odds_history", ["game_id", "book"], 10);
    expect(v.ok).toBe(false);
    expect(v.missingColumns).toContain("price");
  });
  it("rejects unknown tables", () => {
    expect(validateLoad("nope", [], 0).ok).toBe(false);
  });
});

