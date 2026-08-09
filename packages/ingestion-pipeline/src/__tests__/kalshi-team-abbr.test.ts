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

  it("maps Athletics to Kalshi ATH (live ticker TBATH)", () => {
    expect(resolveKalshiTeamAbbr("MLB", "Oakland Athletics")).toBe("ATH");
    expect(resolveKalshiTeamAbbr("MLB", "Athletics")).toBe("ATH");
  });

  it("resolves EPL verified live abbrs", () => {
    expect(resolveKalshiTeamAbbr("EPL", "Newcastle United")).toBe("NEW");
    expect(resolveKalshiTeamAbbr("EPL", "Liverpool")).toBe("LFC");
    expect(resolveKalshiTeamAbbr("EPL", "Manchester City")).toBe("MCI");
    expect(resolveKalshiTeamAbbr("EPL", "Bournemouth")).toBe("BOU");
  });

  it("resolves WNBA + CFB high-volume", () => {
    expect(resolveKalshiTeamAbbr("WNBA", "New York Liberty")).toBe("NY");
    expect(resolveKalshiTeamAbbr("CFB", "Alabama")).toBe("ALA");
    expect(resolveKalshiTeamAbbr("CBB", "Duke")).toBe("DUKE");
  });

  it("null on unmapped (honest)", () => {
    expect(resolveKalshiTeamAbbr("NFL", "Unknown FC")).toBeNull();
  });

  it("sportKeyToKalshiLeague maps Odds keys including soccer/college", () => {
    expect(sportKeyToKalshiLeague("americanfootball_nfl")).toBe("NFL");
    expect(sportKeyToKalshiLeague("basketball_nba")).toBe("NBA");
    expect(sportKeyToKalshiLeague("soccer_epl")).toBe("EPL");
    expect(sportKeyToKalshiLeague("americanfootball_ncaaf")).toBe("CFB");
    expect(sportKeyToKalshiLeague("tennis_atp")).toBeNull();
  });

  it("guessKalshiTeamAbbr uses league map for full names", () => {
    expect(guessKalshiTeamAbbr("Dallas Cowboys", "NFL")).toBe("DAL");
    expect(guessKalshiTeamAbbr("Dallas Cowboys", null)).toBeNull();
    expect(guessKalshiTeamAbbr("NYK", "NBA")).toBe("NYK");
    expect(guessKalshiTeamAbbr("Manchester City", "EPL")).toBe("MCI");
  });
});
