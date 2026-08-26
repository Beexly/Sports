/**
 * Game-identity dedup matchers — the cross-convention bridge that stops
 * duplicate Game rows (provider hash vs espn:{short}:* vs espn:{oddsKey}:*)
 * from being minted for the same physical game. A duplicate row strands its
 * picks: the paid settlement path matches scores by externalId only.
 */
import { describe, expect, it } from "vitest";
import {
  comparableTeamsMatch,
  matchGameByTeamsAndTime,
  type GameIdentityCandidate,
} from "../team-text-match.js";
import { remapOrKeepFeedRows, type ExistingGameMatch } from "../nfl-preseason-map.js";

const HOUR = 60 * 60 * 1000;

describe("comparableTeamsMatch", () => {
  it("matches exact normalized names", () => {
    expect(comparableTeamsMatch("San Francisco Giants", "San Francisco Giants")).toBe(true);
    expect(comparableTeamsMatch("St. Louis Cardinals", "St Louis Cardinals")).toBe(true);
  });

  it("matches nickname last-token (Kansas City Chiefs vs Chiefs)", () => {
    expect(comparableTeamsMatch("Kansas City Chiefs", "Chiefs")).toBe(true);
  });

  it("matches city-style short name against full displayName by prefix containment", () => {
    // TheRundown-style vs ESPN displayName — the prod defect pair.
    expect(comparableTeamsMatch("San Francisco", "San Francisco Giants")).toBe(true);
    expect(comparableTeamsMatch("Cincinnati", "Cincinnati Reds")).toBe(true);
  });

  it("does NOT alias nickname-only rebrands (Oakland vs Athletics)", () => {
    // Healed downstream by the settle cron's team-token recovery pass, never guessed here.
    expect(comparableTeamsMatch("Oakland", "Athletics")).toBe(false);
  });

  it("does not cross-match different teams", () => {
    expect(comparableTeamsMatch("San Francisco Giants", "San Diego Padres")).toBe(false);
    expect(comparableTeamsMatch("New York Giants", "New York Jets")).toBe(false);
  });
});

describe("matchGameByTeamsAndTime", () => {
  const base = Date.parse("2026-08-26T01:40:00Z");
  const cand = (
    externalId: string,
    homeTeam: string,
    awayTeam: string,
    offsetMs = 0,
  ): GameIdentityCandidate => ({
    externalId,
    homeTeam,
    awayTeam,
    commenceTimeMs: base + offsetMs,
  });

  it("matches a hash-convention row for the same game (short vs full names)", () => {
    const candidates = [
      cand("1073abdc2b9688872b92c195a7fda87d", "San Francisco", "Cincinnati"),
      cand("aaaa000011112222333344445555ffff", "San Diego", "Pittsburgh"),
    ];
    const hit = matchGameByTeamsAndTime(
      candidates,
      { homeTeam: "San Francisco Giants", awayTeam: "Cincinnati Reds", commenceTimeMs: base },
      18 * HOUR,
    );
    expect(hit?.externalId).toBe("1073abdc2b9688872b92c195a7fda87d");
  });

  it("rejects matches outside the commence window", () => {
    const candidates = [cand("x", "San Francisco Giants", "Cincinnati Reds", 20 * HOUR)];
    const hit = matchGameByTeamsAndTime(
      candidates,
      { homeTeam: "San Francisco Giants", awayTeam: "Cincinnati Reds", commenceTimeMs: base },
      18 * HOUR,
    );
    expect(hit).toBeNull();
  });

  it("resolves doubleheaders to the closest game", () => {
    const candidates = [
      cand("game1", "Seattle Mariners", "Philadelphia Phillies", 0),
      cand("game2", "Seattle Mariners", "Philadelphia Phillies", 5 * HOUR),
    ];
    const hit = matchGameByTeamsAndTime(
      candidates,
      { homeTeam: "Seattle Mariners", awayTeam: "Philadelphia Phillies", commenceTimeMs: base + 5 * HOUR },
      18 * HOUR,
    );
    expect(hit?.externalId).toBe("game2");
  });

  it("refuses ambiguous matches instead of guessing", () => {
    // Two candidates at near-identical deltas (e.g. a city-only name that
    // containment-matches two clubs) → null, so no dedup onto a guess.
    const candidates = [
      cand("giants", "New York Giants", "Dallas Cowboys", 0),
      cand("jets", "New York Jets", "Dallas Cowboys", 30 * 60 * 1000),
    ];
    const hit = matchGameByTeamsAndTime(
      candidates,
      { homeTeam: "New York", awayTeam: "Dallas Cowboys", commenceTimeMs: base },
      18 * HOUR,
    );
    expect(hit).toBeNull();
  });

  it("returns null on invalid commence input", () => {
    const hit = matchGameByTeamsAndTime(
      [cand("x", "A Team", "B Team")],
      { homeTeam: "A Team", awayTeam: "B Team", commenceTimeMs: Number.NaN },
      18 * HOUR,
    );
    expect(hit).toBeNull();
  });
});

describe("remapOrKeepFeedRows", () => {
  const games: ExistingGameMatch[] = [
    {
      externalId: "1073abdc2b9688872b92c195a7fda87d",
      homeTeam: "San Francisco Giants",
      awayTeam: "Cincinnati Reds",
      commenceTime: new Date("2026-08-26T01:45:00Z"),
    },
  ];
  const feedRow = {
    id: "espn:baseball_mlb:401816675",
    sport_key: "baseball_mlb",
    home_team: "San Francisco Giants",
    away_team: "Cincinnati Reds",
    commence_time: "2026-08-26T01:45:00Z",
  };

  it("remaps a fallback event onto the existing hash row", () => {
    const { rows, remapped } = remapOrKeepFeedRows([feedRow], games);
    expect(remapped).toBe(1);
    expect(rows[0]!.id).toBe("1073abdc2b9688872b92c195a7fda87d");
    expect(rows[0]!.sport_key).toBe("baseball_mlb");
  });

  it("keeps unmatched events verbatim (genuinely new games)", () => {
    const fresh = {
      ...feedRow,
      id: "espn:baseball_mlb:999999999",
      home_team: "Athletics",
      away_team: "Minnesota Twins",
    };
    const { rows, remapped } = remapOrKeepFeedRows([fresh], games);
    expect(remapped).toBe(0);
    expect(rows[0]!.id).toBe("espn:baseball_mlb:999999999");
  });

  it("is a no-op when the row already carries the existing externalId", () => {
    const selfRow = { ...feedRow, id: "1073abdc2b9688872b92c195a7fda87d" };
    const { rows, remapped } = remapOrKeepFeedRows([selfRow], games);
    expect(remapped).toBe(0);
    expect(rows[0]!.id).toBe("1073abdc2b9688872b92c195a7fda87d");
  });

  it("claims each existing row at most once", () => {
    const twin = { ...feedRow, id: "espn:baseball_mlb:401816676" };
    const { rows, remapped } = remapOrKeepFeedRows([feedRow, twin], games);
    expect(remapped).toBe(1);
    expect(rows[0]!.id).toBe("1073abdc2b9688872b92c195a7fda87d");
    expect(rows[1]!.id).toBe("espn:baseball_mlb:401816676");
  });
});
