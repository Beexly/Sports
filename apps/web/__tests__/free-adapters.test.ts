import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  parseEspnScoreboard,
  espnScoreboardUrl,
  ESPN_ATTRIBUTION,
  type EspnScoreboard,
} from "@/lib/data-sources/free-adapters/espn-scores";
import {
  parseOpenMeteo,
  weatherAtKickoff,
  openMeteoUrl,
  OPEN_METEO_ATTRIBUTION,
} from "@/lib/data-sources/free-adapters/open-meteo";
import {
  parseEspnRankings,
  espnRankingsUrl,
  type EspnRankings,
} from "@/lib/data-sources/free-adapters/espn-rankings";

const FIX = resolve(__dirname, "fixtures");
const readFix = (f: string) => JSON.parse(readFileSync(resolve(FIX, f), "utf8"));

describe("ESPN scores adapter (free, facts-only)", () => {
  const json = readFix("espn-nfl-scoreboard.json") as EspnScoreboard;

  it("parses games with normalized home/away, scores, status, attribution", () => {
    const games = parseEspnScoreboard(json, "nfl");
    expect(games.length).toBe(2);
    const g = games[0]!;
    expect(g.sourceId).toBe("espn-public-api");
    expect(g.sport).toBe("nfl");
    expect(g.gameId).toBeTruthy();
    expect(g.home && g.away).toBeTruthy();
    expect(g.home!.abbreviation).toMatch(/^[A-Z]+$/);
    expect(["pre", "in", "post", "unknown"]).toContain(g.state);
    expect(g.attribution).toBe(ESPN_ATTRIBUTION);
    // score is parsed to a number or null, never a raw string
    expect(g.home!.score === null || typeof g.home!.score === "number").toBe(true);
  });

  it("builds verified per-sport scoreboard URLs", () => {
    expect(espnScoreboardUrl("nfl")).toContain("football/nfl");
    expect(espnScoreboardUrl("ncaaf")).toContain("football/college-football");
    expect(espnScoreboardUrl("mls")).toContain("soccer/usa.1");
  });

  it("is defensive against missing fields", () => {
    expect(parseEspnScoreboard({}, "nfl")).toEqual([]);
    expect(parseEspnScoreboard({ events: [{}] }, "nba")).toEqual([]); // no competitions → skipped
  });
});

describe("Open-Meteo weather adapter (free, open license)", () => {
  const json = readFix("open-meteo.json");

  it("parses hourly weather into typed facts with attribution", () => {
    const result = parseOpenMeteo(json);
    expect(result.sourceId).toBe("open-meteo");
    expect(result.hourly.length).toBeGreaterThan(0);
    const h0 = result.hourly[0]!;
    expect(typeof h0.time).toBe("string");
    expect(h0.temperatureC === null || typeof h0.temperatureC === "number").toBe(true);
    expect(h0.windSpeedKmh === null || typeof h0.windSpeedKmh === "number").toBe(true);
    expect(result.attribution).toBe(OPEN_METEO_ATTRIBUTION);
  });

  it("finds the weather nearest a kickoff time", () => {
    const result = parseOpenMeteo(json);
    const first = result.hourly[0]!.time;
    const nearest = weatherAtKickoff(result, first);
    expect(nearest?.time).toBe(first);
    expect(weatherAtKickoff(result, "not-a-date")).toBeNull();
  });

  it("builds a forecast URL with the verified hourly variables", () => {
    const url = openMeteoUrl(39.05, -94.48, { forecastDays: 1 });
    expect(url).toContain("temperature_2m");
    expect(url).toContain("wind_speed_10m");
    expect(url).toContain("precipitation");
  });
});

describe("ESPN rankings adapter (free, facts-only)", () => {
  const json = readFix("espn-cfb-rankings.json") as EspnRankings;

  it("parses ranked polls with normalized teams + attribution", () => {
    const polls = parseEspnRankings(json, "ncaaf");
    expect(polls.length).toBeGreaterThan(0);
    const ap = polls[0]!;
    expect(ap.sport).toBe("ncaaf");
    expect(ap.teams.length).toBeGreaterThan(0);
    const top = ap.teams[0]!;
    expect(top.rank).toBe(1);
    expect(top.team).toBeTruthy();
    expect(top.record === null || typeof top.record === "string").toBe(true);
    expect(ap.attribution).toBe("Scores data via ESPN");
  });

  it("only supports sports with a known rankings path", () => {
    expect(espnRankingsUrl("ncaaf")).toContain("college-football/rankings");
    expect(espnRankingsUrl("mlb")).toBeNull(); // no AP-style poll
  });

  it("skips empty polls defensively", () => {
    expect(parseEspnRankings({ rankings: [{ name: "x", ranks: [] }] }, "ncaaf")).toEqual([]);
    expect(parseEspnRankings({}, "ncaaf")).toEqual([]);
  });
});
