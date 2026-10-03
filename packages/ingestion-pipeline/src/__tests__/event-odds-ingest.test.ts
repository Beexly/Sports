import { describe, expect, it } from "vitest";
import {
  DEFAULT_EVENT_ODDS_BOOKS,
  DEFAULT_EVENT_ODDS_CREDIT_CAP,
  NFL_EVENT_ODDS_MARKETS,
  NBA_EVENT_ODDS_MARKETS,
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

  it("sorts sooner commenceTime first", () => {
    const t1 = new Date("2026-08-23T13:00:00Z");
    const t2 = new Date("2026-08-23T16:00:00Z");
    const t3 = new Date("2026-08-23T20:00:00Z");
    const ids = ["late", "early", "mid"];
    const commence = { late: t3, early: t1, mid: t2 };
    expect(orderEventIdsForCreditCap(ids, commence)).toEqual(["early", "mid", "late"]);
  });

  it("puts events with missing times AFTER all known times (stable)", () => {
    const t1 = new Date("2026-08-23T13:00:00Z");
    const t2 = new Date("2026-08-23T16:00:00Z");
    const ids = ["known_a", "unknown", "known_b", "also_unknown"];
    const commence = { known_a: t1, known_b: t2 };
    expect(orderEventIdsForCreditCap(ids, commence)).toEqual([
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

describe("defaultEventOddsMarkets — receptions on NFL, not a mixed NBA key", () => {
  it("asks for player_receptions on NFL and not on NBA", () => {
    expect(defaultEventOddsMarkets("americanfootball_nfl")).toEqual([...NFL_EVENT_ODDS_MARKETS]);
    expect(NFL_EVENT_ODDS_MARKETS).toContain("player_receptions");
    expect(defaultEventOddsMarkets("basketball_nba")).toEqual([...NBA_EVENT_ODDS_MARKETS]);
    expect(NBA_EVENT_ODDS_MARKETS).not.toContain("player_receptions");
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
