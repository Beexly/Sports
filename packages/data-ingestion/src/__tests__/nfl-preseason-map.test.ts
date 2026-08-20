import { describe, expect, it } from "vitest";
import { SUPPORTED_SPORTS } from "../config.js";
import {
  NFL_CANONICAL_SPORT_KEY,
  NFL_PRESEASON_ODDS_KEY,
  isNflPreseasonFetchWindow,
  mergeFeedRowsById,
  nflTeamsMatch,
  remapPreseasonRows,
  type ExistingGameMatch,
  type PreseasonFeedRow,
} from "../nfl-preseason-map.js";

function row(partial: Partial<PreseasonFeedRow> & Pick<PreseasonFeedRow, "id">): PreseasonFeedRow {
  return {
    sport_key: NFL_PRESEASON_ODDS_KEY,
    home_team: "Kansas City Chiefs",
    away_team: "Chicago Bears",
    commence_time: "2026-08-16T00:00:00Z",
    ...partial,
  };
}

function game(partial: Partial<ExistingGameMatch> & Pick<ExistingGameMatch, "externalId">): ExistingGameMatch {
  return {
    homeTeam: "Kansas City Chiefs",
    awayTeam: "Chicago Bears",
    commenceTime: new Date("2026-08-16T00:20:00Z"),
    ...partial,
  };
}

describe("NFL preseason key mapping", () => {
  it("does not register the preseason key as a board sport", () => {
    expect(SUPPORTED_SPORTS.map((s) => s.key)).not.toContain(NFL_PRESEASON_ODDS_KEY);
    expect(NFL_CANONICAL_SPORT_KEY).toBe("americanfootball_nfl");
  });

  it("opens the fetch window only in July and August UTC", () => {
    expect(isNflPreseasonFetchWindow(new Date("2026-07-01T00:00:00Z"))).toBe(true);
    expect(isNflPreseasonFetchWindow(new Date("2026-08-20T12:00:00Z"))).toBe(true);
    expect(isNflPreseasonFetchWindow(new Date("2026-06-30T23:00:00Z"))).toBe(false);
    expect(isNflPreseasonFetchWindow(new Date("2026-09-01T00:00:00Z"))).toBe(false);
  });

  it("matches team pairs by normalized name and nickname last-token", () => {
    expect(nflTeamsMatch("Kansas City Chiefs", "kansas city chiefs")).toBe(true);
    expect(nflTeamsMatch("Kansas City Chiefs", "Chiefs")).toBe(true);
    expect(nflTeamsMatch("New York Giants", "New York Jets")).toBe(false);
  });

  it("remaps a preseason event onto the ESPN-seeded game and retags the sport key", () => {
    const existing = [game({ externalId: "espn:nfl:401772001" })];
    const { remapped, unmatched } = remapPreseasonRows(
      [row({ id: "odds-pre-1" })],
      existing,
    );
    expect(unmatched).toBe(0);
    expect(remapped).toHaveLength(1);
    expect(remapped[0]?.id).toBe("espn:nfl:401772001");
    expect(remapped[0]?.sport_key).toBe(NFL_CANONICAL_SPORT_KEY);
  });

  it("leaves unmatched preseason events unmapped instead of creating a new sport", () => {
    const { remapped, unmatched } = remapPreseasonRows(
      [row({ id: "odds-pre-1", home_team: "Dallas Cowboys", away_team: "Los Angeles Rams" })],
      [game({ externalId: "espn:nfl:1" })],
    );
    expect(remapped).toEqual([]);
    expect(unmatched).toBe(1);
  });

  it("rejects a commence-time miss beyond the 18h window", () => {
    const { remapped, unmatched } = remapPreseasonRows(
      [row({ id: "odds-pre-1", commence_time: "2026-08-18T00:00:00Z" })],
      [game({ externalId: "espn:nfl:1", commenceTime: new Date("2026-08-16T00:00:00Z") })],
    );
    expect(remapped).toEqual([]);
    expect(unmatched).toBe(1);
  });

  it("merges remapped rows without duplicating an already-present id", () => {
    const primary = [row({ id: "espn:nfl:1", sport_key: NFL_CANONICAL_SPORT_KEY })];
    const extra = [row({ id: "espn:nfl:1" }), row({ id: "espn:nfl:2" })];
    const merged = mergeFeedRowsById(primary, extra);
    expect(merged.map((r) => r.id)).toEqual(["espn:nfl:1", "espn:nfl:2"]);
  });
});
