import { describe, expect, it } from "vitest";
import {
  DEFAULT_EVENT_ODDS_BOOKS,
  DEFAULT_EVENT_ODDS_CREDIT_CAP,
  NFL_EVENT_ODDS_MARKETS,
  NBA_EVENT_ODDS_MARKETS,
  PROP_CLOSE_SWEEP_MINUTES,
  defaultEventOddsMarkets,
  eventOddsCreditCap,
  ingestEventOddsIfEnabled,
  isEventOddsIngestEnabled,
  orderEventIdsForCreditCap,
  type EventOddsClient,
} from "../event-odds-ingest.js";

describe("orderEventIdsForCreditCap", () => {
  it("returns the same ids (no mutation) when commenceByEventId is undefined", () => {
    const ids = ["a", "b", "c"];
    expect(orderEventIdsForCreditCap(ids, undefined)).toEqual(["a", "b", "c"]);
    expect(ids).toEqual(["a", "b", "c"]); // input not mutated
  });

  it("sorts sooner commenceTime first when every event is outside the close window", () => {
    // now is after all three kickoffs → all past-kickoff, sooner still first.
    const now = new Date("2026-08-24T00:00:00Z");
    const t1 = new Date("2026-08-23T13:00:00Z");
    const t2 = new Date("2026-08-23T16:00:00Z");
    const t3 = new Date("2026-08-23T20:00:00Z");
    const ids = ["late", "early", "mid"];
    const commence = { late: t3, early: t1, mid: t2 };
    expect(orderEventIdsForCreditCap(ids, commence, now)).toEqual(["early", "mid", "late"]);
  });

  it("puts the T-15 close window ahead of earlier already-started games (C-357)", () => {
    // 15:50Z: 13:00Z already kicked off (past), 16:00Z is 10 minutes out (close
    // window), 20:00Z is still future. The close must win the first credit.
    const now = new Date("2026-08-23T15:50:00Z");
    const commence = {
      started: new Date("2026-08-23T13:00:00Z"),
      closing: new Date("2026-08-23T16:00:00Z"),
      late: new Date("2026-08-23T20:00:00Z"),
    };
    expect(orderEventIdsForCreditCap(["started", "closing", "late"], commence, now)).toEqual([
      "closing",
      "late",
      "started",
    ]);
  });

  it("puts every close-window event before any other prop refresh", () => {
    const now = new Date("2026-08-23T15:50:00Z");
    const commence = {
      closing_1600: new Date("2026-08-23T16:00:00Z"),
      closing_1605: new Date("2026-08-23T16:05:00Z"),
      future_2000: new Date("2026-08-23T20:00:00Z"),
      started_1300: new Date("2026-08-23T13:00:00Z"),
    };
    expect(
      orderEventIdsForCreditCap(
        ["started_1300", "future_2000", "closing_1605", "closing_1600"],
        commence,
        now,
      ),
    ).toEqual(["closing_1600", "closing_1605", "future_2000", "started_1300"]);
  });

  it("treats kickoff exactly at now as still in the close window", () => {
    const now = new Date("2026-08-23T16:00:00Z");
    const commence = {
      at_kickoff: new Date("2026-08-23T16:00:00Z"),
      started: new Date("2026-08-23T13:00:00Z"),
      late: new Date("2026-08-23T20:00:00Z"),
    };
    expect(orderEventIdsForCreditCap(["started", "late", "at_kickoff"], commence, now)).toEqual([
      "at_kickoff",
      "late",
      "started",
    ]);
  });

  it("uses a 15-minute close window", () => {
    expect(PROP_CLOSE_SWEEP_MINUTES).toBe(15);
    const now = new Date("2026-08-23T15:45:00Z");
    // 16:00 is exactly 15 minutes out → close window, outranks a past kickoff.
    const just_inside = {
      e: new Date("2026-08-23T16:00:00Z"),
      p: new Date("2026-08-23T13:00:00Z"),
    };
    expect(orderEventIdsForCreditCap(["p", "e"], just_inside, now)).toEqual(["e", "p"]);
    // 16:00:01 is one second past the window → future bucket; a still-closer
    // close-window peer (15:55) outranks it.
    const just_outside = {
      close: new Date("2026-08-23T15:55:00Z"),
      e: new Date("2026-08-23T16:00:01Z"),
      p: new Date("2026-08-23T13:00:00Z"),
    };
    expect(orderEventIdsForCreditCap(["p", "e", "close"], just_outside, now)).toEqual([
      "close",
      "e",
      "p",
    ]);
  });

  it("puts events with missing times AFTER all known times (stable)", () => {
    const now = new Date("2026-08-24T00:00:00Z");
    const t1 = new Date("2026-08-23T13:00:00Z");
    const t2 = new Date("2026-08-23T16:00:00Z");
    const ids = ["known_a", "unknown", "known_b", "also_unknown"];
    const commence = { known_a: t1, known_b: t2 };
    expect(orderEventIdsForCreditCap(ids, commence, now)).toEqual([
      "known_a",
      "known_b",
      "unknown",
      "also_unknown",
    ]);
  });

  it("is stable when all commenceTimes are missing (matches input order)", () => {
    const ids = ["x", "y", "z"];
    expect(orderEventIdsForCreditCap(ids, {})).toEqual(["x", "y", "z"]);
  });
});

describe("defaultEventOddsMarkets — every props-HB market on NFL, none of them on NBA", () => {
  it("asks for the full HB market set on NFL and not on NBA", () => {
    expect(defaultEventOddsMarkets("americanfootball_nfl")).toEqual([...NFL_EVENT_ODDS_MARKETS]);
    expect(defaultEventOddsMarkets("basketball_nba")).toEqual([...NBA_EVENT_ODDS_MARKETS]);
    expect(NBA_EVENT_ODDS_MARKETS).not.toContain("player_receptions");
  });

  it("lists every market the props-HB engine scores (C-357, verified on the Odds API NFL props table)", () => {
    const required = [
      "player_pass_tds",
      "player_pass_yds",
      "player_pass_completions",
      "player_pass_interceptions",
      "player_rush_yds",
      "player_rush_attempts",
      "player_rush_tds",
      "player_receptions",
      "player_reception_yds",
      "player_reception_tds",
      "player_anytime_td",
      "player_sacks",
    ] as const;
    for (const key of required) {
      expect(NFL_EVENT_ODDS_MARKETS).toContain(key);
    }
    expect(NFL_EVENT_ODDS_MARKETS).toHaveLength(required.length);
  });

  it("does not invent alternate ladders or markets with no HB adapter", () => {
    for (const key of NFL_EVENT_ODDS_MARKETS) {
      expect(key).not.toMatch(/_alternate$/);
      expect(key.startsWith("player_")).toBe(true);
    }
  });

  it("leaves the credit cap where C-109 / D15 put it (default 8 calls)", () => {
    expect(DEFAULT_EVENT_ODDS_CREDIT_CAP).toBe(8);
    expect(eventOddsCreditCap({})).toBe(DEFAULT_EVENT_ODDS_CREDIT_CAP);
  });
});

function fakeClient(calls: string[] = []): EventOddsClient {
  return {
    async getEventOdds(_sport: string, eventId: string) {
      calls.push(eventId);
      return { data: { id: eventId } as never, remainingRequests: 40, usedRequests: 1 };
    },
  } as EventOddsClient;
}

describe("event-odds ingest — default OFF, hard credit cap", () => {
  it("is disabled unless EVENT_ODDS_INGEST_ENABLED=true", () => {
    expect(isEventOddsIngestEnabled({})).toBe(false);
    expect(isEventOddsIngestEnabled({ EVENT_ODDS_INGEST_ENABLED: "true" })).toBe(true);
    expect(eventOddsCreditCap({})).toBe(DEFAULT_EVENT_ODDS_CREDIT_CAP);
  });

  it("spends zero credits when the flag is off", async () => {
    const calls: string[] = [];
    const report = await ingestEventOddsIfEnabled({
      client: fakeClient(calls),
      sportKey: "americanfootball_nfl",
      eventIds: ["a", "b", "c"],
      env: {},
    });
    expect(report.enabled).toBe(false);
    expect(report.fetched).toBe(0);
    expect(report.skipped).toBe(3);
    expect(calls).toEqual([]);
  });

  it("caps getEventOdds calls and uses licensed US books", async () => {
    const calls: string[] = [];
    const books: string[][] = [];
    const marketsSeen: string[][] = [];
    const client = {
      async getEventOdds(_sport: string, eventId: string, markets: readonly string[], options?: { bookmakers?: readonly string[] }) {
        calls.push(eventId);
        books.push([...(options?.bookmakers ?? [])]);
        marketsSeen.push([...markets]);
        return { data: { id: eventId } as never, remainingRequests: 10, usedRequests: 1 };
      },
    } as EventOddsClient;
    const report = await ingestEventOddsIfEnabled({
      client,
      sportKey: "americanfootball_nfl",
      eventIds: ["e1", "e2", "e3", "e4", "e5"],
      env: { EVENT_ODDS_INGEST_ENABLED: "true", EVENT_ODDS_CREDIT_CAP: "3" },
    });
    expect(report.enabled).toBe(true);
    expect(report.fetched).toBe(3);
    expect(report.skipped).toBe(2);
    expect(calls).toEqual(["e1", "e2", "e3"]);
    expect(books[0]).toEqual([...DEFAULT_EVENT_ODDS_BOOKS]);
    expect(marketsSeen[0]).toEqual([...NFL_EVENT_ODDS_MARKETS]);
  });

  it("spends the first capped calls on the T-15 close, not on already-started games", async () => {
    const calls: string[] = [];
    const client = {
      async getEventOdds(_sport: string, eventId: string) {
        calls.push(eventId);
        return { data: { id: eventId } as never, remainingRequests: 10, usedRequests: 1 };
      },
    } as EventOddsClient;
    const now = new Date("2026-08-23T15:50:00Z");
    const report = await ingestEventOddsIfEnabled({
      client,
      sportKey: "americanfootball_nfl",
      eventIds: ["started", "closing", "late"],
      commenceByEventId: {
        started: new Date("2026-08-23T13:00:00Z"),
        closing: new Date("2026-08-23T16:00:00Z"),
        late: new Date("2026-08-23T20:00:00Z"),
      },
      now,
      env: { EVENT_ODDS_INGEST_ENABLED: "true", EVENT_ODDS_CREDIT_CAP: "1" },
    });
    expect(calls).toEqual(["closing"]);
    expect(report.fetched).toBe(1);
    expect(report.skipped).toBe(2);
  });

  it("does not throw when a single event fetch fails", async () => {
    const client = {
      async getEventOdds(_sport: string, eventId: string) {
        if (eventId === "bad") throw new Error("upstream 500");
        return { data: { id: eventId } as never, remainingRequests: 9, usedRequests: 1 };
      },
    } as EventOddsClient;
    const report = await ingestEventOddsIfEnabled({
      client,
      sportKey: "basketball_nba",
      eventIds: ["ok", "bad", "ok2"],
      env: { EVENT_ODDS_INGEST_ENABLED: "true", EVENT_ODDS_CREDIT_CAP: "8" },
    });
    expect(report.fetched).toBe(2);
    expect(report.failed).toBe(1);
    expect(report.snapshots).toHaveLength(2);
  });

  it("stops when remainingRequests hits 0 so we do not overspend", async () => {
    const calls: string[] = [];
    const client = {
      async getEventOdds(_sport: string, eventId: string) {
        calls.push(eventId);
        return { data: { id: eventId } as never, remainingRequests: 0, usedRequests: 1 };
      },
    } as EventOddsClient;
    const report = await ingestEventOddsIfEnabled({
      client,
      sportKey: "americanfootball_nfl",
      eventIds: ["a", "b", "c"],
      env: { EVENT_ODDS_INGEST_ENABLED: "true", EVENT_ODDS_CREDIT_CAP: "8" },
    });
    expect(calls).toEqual(["a"]);
    expect(report.fetched).toBe(1);
    expect(report.remainingRequests).toBe(0);
  });

  it("reports x-requests-used alongside x-requests-remaining, and a failed request's error headers are preserved", async () => {
    // The client parses the quota headers of a 402/429 into the thrown error;
    // a failed request still spent a credit, so its reading must not be lost.
    const client = {
      async getEventOdds(_sport: string, eventId: string) {
        if (eventId === "bad") {
          throw Object.assign(new Error("The Odds API error: 429"), {
            status: 429,
            remainingRequests: 5,
            usedRequests: 19_995,
          });
        }
        return { data: { id: eventId } as never, remainingRequests: 9, usedRequests: 19_991 };
      },
    } as EventOddsClient;
    const report = await ingestEventOddsIfEnabled({
      client,
      sportKey: "americanfootball_nfl",
      eventIds: ["ok", "bad"],
      env: { EVENT_ODDS_INGEST_ENABLED: "true", EVENT_ODDS_CREDIT_CAP: "8" },
    });
    expect(report.fetched).toBe(1);
    expect(report.failed).toBe(1);
    expect(report.remainingRequests).toBe(5);
    expect(report.usedRequests).toBe(19_995);
  });

  it("a later header-less response (success or failure) never erases an earlier reading", async () => {
    const client = {
      async getEventOdds(_sport: string, eventId: string) {
        if (eventId === "bare-error") throw new Error("network down");
        if (eventId === "bare-ok") return { data: { id: eventId } as never, remainingRequests: null, usedRequests: null };
        return { data: { id: eventId } as never, remainingRequests: 12, usedRequests: 19_988 };
      },
    } as EventOddsClient;
    const report = await ingestEventOddsIfEnabled({
      client,
      sportKey: "americanfootball_nfl",
      eventIds: ["ok", "bare-error", "bare-ok"],
      env: { EVENT_ODDS_INGEST_ENABLED: "true", EVENT_ODDS_CREDIT_CAP: "8" },
    });
    expect(report.fetched).toBe(2);
    expect(report.failed).toBe(1);
    expect(report.remainingRequests).toBe(12);
    expect(report.usedRequests).toBe(19_988);
  });

  it("carries null quota headers when disabled or when nothing was fetched", async () => {
    const off = await ingestEventOddsIfEnabled({
      client: fakeClient(),
      sportKey: "americanfootball_nfl",
      eventIds: ["a"],
      env: {},
    });
    expect(off.usedRequests).toBeNull();
    const empty = await ingestEventOddsIfEnabled({
      client: fakeClient(),
      sportKey: "americanfootball_nfl",
      eventIds: [],
      env: { EVENT_ODDS_INGEST_ENABLED: "true" },
    });
    expect(empty.usedRequests).toBeNull();
    expect(empty.remainingRequests).toBeNull();
  });
});
