import { describe, expect, it } from "vitest";
import {
  resolveKalshiTeamAbbr,
  normalizeTeamKey,
} from "../kalshi-team-abbr.js";
import {
  sportKeyToKalshiLeague,
  guessKalshiTeamAbbr,
} from "../build-independent-fair-values.js";

describe("kalshi team abbr maps", () => {
  it("normalizes keys", () => {
    expect(normalizeTeamKey("Dallas Cowboys")).toBe("dallas cowboys");
    expect(normalizeTeamKey("  St. Louis  Cardinals ")).toBe(
      "st louis cardinals",
    );
  });

  it("resolves NFL full names and nicknames", () => {
    expect(resolveKalshiTeamAbbr("NFL", "Dallas Cowboys")).toBe("DAL");
    expect(resolveKalshiTeamAbbr("NFL", "Kansas City Chiefs")).toBe("KC");
    expect(resolveKalshiTeamAbbr("NFL", "San Francisco 49ers")).toBe("SF");
    expect(resolveKalshiTeamAbbr("NFL", "Cowboys")).toBe("DAL");
  });

  it("resolves NBA", () => {
    expect(resolveKalshiTeamAbbr("NBA", "New York Knicks")).toBe("NYK");
    expect(resolveKalshiTeamAbbr("NBA", "Los Angeles Lakers")).toBe("LAL");
    expect(resolveKalshiTeamAbbr("NBA", "Golden State Warriors")).toBe("GSW");
  });

  it("null on unmapped (honest)", () => {
    expect(resolveKalshiTeamAbbr("NFL", "Unknown FC")).toBeNull();
  });

  it("sportKeyToKalshiLeague maps Odds keys", () => {
    expect(sportKeyToKalshiLeague("americanfootball_nfl")).toBe("NFL");
    expect(sportKeyToKalshiLeague("basketball_nba")).toBe("NBA");
    expect(sportKeyToKalshiLeague("soccer_epl")).toBeNull();
  });

  it("guessKalshiTeamAbbr uses league map for full names", () => {
    expect(guessKalshiTeamAbbr("Dallas Cowboys", "NFL")).toBe("DAL");
    expect(guessKalshiTeamAbbr("Dallas Cowboys", null)).toBeNull();
    expect(guessKalshiTeamAbbr("NYK", "NBA")).toBe("NYK");
  });
});
