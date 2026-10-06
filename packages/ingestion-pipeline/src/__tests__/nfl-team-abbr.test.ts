/**
 * The shared name -> abbreviation map.
 *
 * This map is the only thing that makes the games <-> team_game_efficiency
 * join possible. If it drifts, every abbreviation-keyed bundle surface
 * silently returns zero rows — no error, no alert, just an empty spine. So
 * the map is pinned here, and the GSE spelling is pinned explicitly against
 * the Kalshi spelling it must NOT be confused with.
 */
import { describe, expect, it } from "vitest";
import {
  NFL_NAME_TO_ABBR,
  nflTeamAbbr,
  isPlaceholderTeamName,
} from "../nfl-team-abbr.js";

describe("NFL_NAME_TO_ABBR", () => {
  it("covers all 32 clubs exactly once", () => {
    expect(Object.keys(NFL_NAME_TO_ABBR)).toHaveLength(32);
    expect(new Set(Object.values(NFL_NAME_TO_ABBR)).size).toBe(32);
  });

  it("uses the GSE spelling, not the Kalshi ticker", () => {
    // Kalshi resolves the Rams to LAR because that is the Kalshi ticker;
    // team_game_efficiency stores LA. Merging the two maps would zero the
    // ratings surface for Los Angeles.
    expect(NFL_NAME_TO_ABBR["los angeles rams"]).toBe("LA");
    expect(NFL_NAME_TO_ABBR["washington commanders"]).toBe("WAS");
    expect(NFL_NAME_TO_ABBR["san francisco 49ers"]).toBe("SF");
    expect(NFL_NAME_TO_ABBR["new england patriots"]).toBe("NE");
    expect(NFL_NAME_TO_ABBR["new orleans saints"]).toBe("NO");
    expect(NFL_NAME_TO_ABBR["los angeles chargers"]).toBe("LAC");
  });

  it("resolves the abbreviations that prod games actually store", () => {
    // Spot-checked against live games rows and team_game_efficiency values.
    expect(nflTeamAbbr("Kansas City Chiefs")).toBe("KC");
    expect(nflTeamAbbr("Buffalo Bills")).toBe("BUF");
    expect(nflTeamAbbr("  philadelphia eagles  ")).toBe("PHI");
    expect(nflTeamAbbr("NEW YORK GIANTS")).toBe("NYG");
    // Pass-through for a name that is already an abbreviation.
    expect(nflTeamAbbr("GB")).toBe("GB");
    expect(nflTeamAbbr("nyg")).toBe("NYG");
  });

  it("returns null rather than guessing", () => {
    expect(nflTeamAbbr("TBD")).toBeNull();
    expect(nflTeamAbbr("")).toBeNull();
    expect(nflTeamAbbr(null)).toBeNull();
    expect(nflTeamAbbr(undefined)).toBeNull();
    // A baseball club must not silently resolve to an NFL club.
    expect(nflTeamAbbr("Arizona Diamondbacks")).toBeNull();
    expect(nflTeamAbbr("Baltimore Orioles")).toBeNull();
  });
});

describe("isPlaceholderTeamName", () => {
  it("flags only names that must never be joined on", () => {
    expect(isPlaceholderTeamName("TBD")).toBe(true);
    expect(isPlaceholderTeamName("tbd")).toBe(true);
    expect(isPlaceholderTeamName("")).toBe(true);
    expect(isPlaceholderTeamName(null)).toBe(true);
    expect(isPlaceholderTeamName("Kansas City Chiefs")).toBe(false);
  });
});