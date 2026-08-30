import { describe, expect, it } from "vitest";
import type { OddsApiBookmaker, OddsApiEvent } from "@sports/types";
import {
  eventBookmakerCount,
  eventsBelowBookmakerThreshold,
  eventTeamsMatch,
  mergeBookmakersIntoPrimary,
} from "../odds-event-merge.js";

function book(key: string, homePrice: number): OddsApiBookmaker {
  return {
    key,
    title: key,
    last_update: "2026-08-22T18:00:00Z",
    markets: [
      {
        key: "h2h",
        last_update: "2026-08-22T18:00:00Z",
        outcomes: [
          { name: "Chiefs", price: homePrice },
          { name: "Bills", price: 130 },
        ],
      },
    ],
  };
}

function event(overrides: Partial<OddsApiEvent> = {}): OddsApiEvent {
  return {
    id: "odds-1",
    sport_key: "americanfootball_nfl",
    sport_title: "NFL",
    commence_time: "2026-08-23T17:00:00Z",
    home_team: "Kansas City Chiefs",
    away_team: "Buffalo Bills",
    bookmakers: [book("fanduel", -150)],
    ...overrides,
  };
}

describe("eventTeamsMatch", () => {
  it("matches full name to nickname last-token", () => {
    expect(eventTeamsMatch("Kansas City Chiefs", "Chiefs")).toBe(true);
    expect(eventTeamsMatch("Buffalo Bills", "Bills")).toBe(true);
  });

  it("does not match different nicknames", () => {
    expect(eventTeamsMatch("Kansas City Chiefs", "Bills")).toBe(false);
  });
});

describe("eventsBelowBookmakerThreshold", () => {
  it("flags events with fewer than two books", () => {
    const thin = event();
    const covered = event({ id: "odds-2", bookmakers: [book("fanduel", -150), book("betmgm", -145)] });
    expect(eventBookmakerCount(thin)).toBe(1);
    expect(eventsBelowBookmakerThreshold([thin, covered]).map((e) => e.id)).toEqual(["odds-1"]);
  });
});

describe("mergeBookmakersIntoPrimary", () => {
  it("adds only missing books on a matched thin game; primary prices win", () => {
    const primary = event({ bookmakers: [book("fanduel", -150)] });
    const secondary = event({
      id: "rundown-99",
      home_team: "Chiefs",
      away_team: "Bills",
      bookmakers: [book("fanduel", -200), book("betmgm", -140)],
    });
    const out = mergeBookmakersIntoPrimary([primary], [secondary], 2);
    expect(out.filledGameIds).toEqual(["odds-1"]);
    expect(out.events).toHaveLength(1);
    expect(out.events[0]?.id).toBe("odds-1");
    expect(out.events[0]?.bookmakers.map((b) => b.key)).toEqual(["fanduel", "betmgm"]);
    expect(out.events[0]?.bookmakers.find((b) => b.key === "fanduel")?.markets[0]?.outcomes[0]?.price).toBe(
      -150,
    );
  });

  it("does not merge into a well-covered primary game", () => {
    const primary = event({
      bookmakers: [book("fanduel", -150), book("draftkings", -148)],
    });
    const secondary = event({
      id: "rundown-99",
      home_team: "Chiefs",
      away_team: "Bills",
      bookmakers: [book("betmgm", -140)],
    });
    const out = mergeBookmakersIntoPrimary([primary], [secondary], 2);
    expect(out.filledGameIds).toEqual([]);
    expect(out.skippedWellCovered).toBe(1);
    expect(out.events[0]?.bookmakers).toHaveLength(2);
    expect(out.events[0]?.bookmakers.some((b) => b.key === "betmgm")).toBe(false);
  });

  it("drops unmatched secondary games instead of inserting a second id", () => {
    const primary = event();
    const secondary = event({
      id: "rundown-other",
      home_team: "Dallas Cowboys",
      away_team: "New York Giants",
      bookmakers: [book("betmgm", -110), book("pinnacle", -105)],
    });
    const out = mergeBookmakersIntoPrimary([primary], [secondary], 2);
    expect(out.events).toHaveLength(1);
    expect(out.events[0]?.id).toBe("odds-1");
    expect(out.unmatchedSecondary).toBe(1);
    expect(out.filledGameIds).toEqual([]);
  });

  it("does not match across a 12h commence window", () => {
    const primary = event({ commence_time: "2026-08-23T17:00:00Z" });
    const secondary = event({
      id: "rundown-late",
      home_team: "Chiefs",
      away_team: "Bills",
      commence_time: "2026-08-24T17:00:00Z",
      bookmakers: [book("betmgm", -140)],
    });
    const out = mergeBookmakersIntoPrimary([primary], [secondary], 2);
    expect(out.filledGameIds).toEqual([]);
    expect(out.unmatchedSecondary).toBe(1);
  });
});
