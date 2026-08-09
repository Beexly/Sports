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

  it("maps ESPN short traps to Kalshi abbrs (polarity)", () => {
    expect(resolveKalshiTeamAbbr("MLB", "CHW")).toBe("CWS");
    expect(resolveKalshiTeamAbbr("MLB", "Chicago White Sox")).toBe("CWS");
    expect(resolveKalshiTeamAbbr("NBA", "GS")).toBe("GSW");
    expect(resolveKalshiTeamAbbr("NBA", "NY")).toBe("NYK");
    expect(resolveKalshiTeamAbbr("NBA", "SA")).toBe("SAS");
    expect(resolveKalshiTeamAbbr("NBA", "NO")).toBe("NOP");
    expect(resolveKalshiTeamAbbr("NBA", "UTAH")).toBe("UTA");
    expect(resolveKalshiTeamAbbr("NHL", "NJ")).toBe("NJD");
  });

  it("rejects unknown short codes (honest null, no invent)", () => {
    expect(resolveKalshiTeamAbbr("MLB", "ZZ")).toBeNull();
    expect(resolveKalshiTeamAbbr("NBA", "XX")).toBeNull();
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
    expect(resolveKalshiTeamAbbr("CFB", "Ohio State")).toBe("OHIOST");
    expect(resolveKalshiTeamAbbr("CFB", "Michigan State")).toBe("MSU");
    expect(resolveKalshiTeamAbbr("CFB", "Boise State")).toBe("BSU");
    expect(resolveKalshiTeamAbbr("CBB", "Duke")).toBe("DUKE");
  });

  it("resolves expanded soccer maps", () => {
    expect(resolveKalshiTeamAbbr("LALIGA", "Girona")).toBe("GIR");
    expect(resolveKalshiTeamAbbr("MLS", "Houston Dynamo")).toBe("HOU");
    expect(resolveKalshiTeamAbbr("MLS", "Charlotte FC")).toBe("CLT");
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

  it("guessKalshiTeamAbbr uses league map only (no blind short invent)", () => {
    expect(guessKalshiTeamAbbr("Dallas Cowboys", "NFL")).toBe("DAL");
    expect(guessKalshiTeamAbbr("Dallas Cowboys", null)).toBeNull();
    expect(guessKalshiTeamAbbr("NYK", "NBA")).toBe("NYK");
    expect(guessKalshiTeamAbbr("GS", "NBA")).toBe("GSW");
    expect(guessKalshiTeamAbbr("CHW", "MLB")).toBe("CWS");
    expect(guessKalshiTeamAbbr("Manchester City", "EPL")).toBe("MCI");
    expect(guessKalshiTeamAbbr("ZZ", "MLB")).toBeNull();
  });
});
