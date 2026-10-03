import { describe, expect, it, vi } from "vitest";
import {
  PREGAME_ATTRIBUTION,
  PREGAME_BASE,
  PREGAME_SOCKET_BASE,
  PregameClient,
  PregameError,
} from "../pregame-client.js";

const ENV = { PREGAME_INGEST: "1" } as NodeJS.ProcessEnv;

function jsonFetch(body: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

describe("flag off", () => {
  it("all methods return null and never fetch", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    const client = new PregameClient({} as NodeJS.ProcessEnv, fetchMock as unknown as typeof fetch);

    expect(await client.getConsensusHistory(1)).toBeNull();
    expect(await client.getOddsHistory(1)).toBeNull();
    expect(await client.getConsensusMeta(1)).toBeNull();
    expect(await client.getOddsMeta(1)).toBeNull();
    expect(await client.getEventListing()).toBeNull();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("getConsensusHistory", () => {
  const body = {
    Start: "2025-10-28T00:18:30.15Z",
    End: "2026-09-17T23:59:59Z",
    Count: 2,
    TotalCount: 4138,
    Items: [
      {
        Id: 1,
        DateTime: "2025-10-28T00:18:30.15Z",
        Odds: "48½",
        CashAction: 577536,
        CashPercentage: 58,
        TicketAction: 3148,
        TicketPercentage: 67,
        PickAction: 26,
        PickPercentage: 46,
      },
      {
        Id: 2,
        DateTime: "2025-10-28T00:20:00.00Z",
        Odds: "48",
        CashAction: 10,
        CashPercentage: 50,
        TicketAction: 5,
        TicketPercentage: 50,
        PickAction: 1,
        PickPercentage: 50,
      },
    ],
  };

  it("parses the tick exactly (odds 48½, cash 577536/58%)", async () => {
    const fetchMock = jsonFetch(body);
    const client = new PregameClient(ENV, fetchMock as unknown as typeof fetch);

    const history = await client.getConsensusHistory(266336);
    expect(history).not.toBeNull();
    expect(history!.totalCount).toBe(4138);
    expect(history!.count).toBe(2);
    expect(history!.items).toHaveLength(2);

    const tick = history!.items[0]!;
    expect(tick.id).toBe(1);
    expect(tick.dateTime).toBe("2025-10-28T00:18:30.15Z");
    expect(tick.odds).toBe("48½");
    expect(tick.cashAction).toBe(577536);
    expect(tick.cashPercentage).toBe(58);
    expect(tick.ticketAction).toBe(3148);
    expect(tick.ticketPercentage).toBe(67);
    expect(tick.pickAction).toBe(26);
    expect(tick.pickPercentage).toBe(46);
  });

  it("hits consensushistory with e/s/r params", async () => {
    const fetchMock = jsonFetch(body);
    const client = new PregameClient(ENV, fetchMock as unknown as typeof fetch);

    await client.getConsensusHistory(266336, 2, 1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calls = fetchMock.mock.calls as unknown as Array<[unknown]>;
    const url = String(calls[0]![0]);
    expect(url).toBe(`${PREGAME_BASE}/consensushistory?e=266336&s=2&r=1`);
  });

  it("empty Items array → items: [] with no throw", async () => {
    const fetchMock = jsonFetch({ Start: null, End: null, Count: 0, TotalCount: 0, Items: [] });
    const client = new PregameClient(ENV, fetchMock as unknown as typeof fetch);

    const history = await client.getConsensusHistory(1);
    expect(history).not.toBeNull();
    expect(history!.items).toEqual([]);
    expect(history!.totalCount).toBe(0);
  });
});

describe("getOddsHistory", () => {
  const body = {
    TotalCount: 793,
    Items: [
      {
        DateTime: "2025-10-28T00:18:30.15Z",
        SportsBookId: 29,
        Spread1: "+10-115",
        Spread2: "-10-105",
        Over: "o48½-110",
        Under: "u48½-110",
        Moneyline1: "+410",
        Moneyline2: "-550",
      },
    ],
  };

  it("maps book 29 spreads and moneylines", async () => {
    const fetchMock = jsonFetch(body);
    const client = new PregameClient(ENV, fetchMock as unknown as typeof fetch);

    const history = await client.getOddsHistory(266336);
    expect(history).not.toBeNull();
    expect(history!.totalCount).toBe(793);
    expect(history!.items).toHaveLength(1);

    const tick = history!.items[0]!;
    expect(tick.sportsBookId).toBe(29);
    expect(tick.spread1).toBe("+10-115");
    expect(tick.spread2).toBe("-10-105");
    expect(tick.moneyline1).toBe("+410");
    expect(tick.moneyline2).toBe("-550");
  });

  it("hits oddshistory with e/p/s/r params", async () => {
    const fetchMock = jsonFetch(body);
    const client = new PregameClient(ENV, fetchMock as unknown as typeof fetch);

    await client.getOddsHistory(266336, 1, 2, 1);
    const calls = fetchMock.mock.calls as unknown as Array<[unknown]>;
    const url = String(calls[0]![0]);
    expect(url).toBe(`${PREGAME_BASE}/oddshistory?e=266336&p=1&s=2&r=1`);
  });
});

describe("getOddsMeta", () => {
  it("returns sportsbook names", async () => {
    const fetchMock = jsonFetch({
      Sportsbooks: [
        { Id: 3, Name: "BetOnline", Url: "https://www.betonline.ag/" },
        { Id: 29, Name: "DraftKings", Url: "https://sportsbook.draftkings.com/" },
      ],
    });
    const client = new PregameClient(ENV, fetchMock as unknown as typeof fetch);

    const meta = await client.getOddsMeta(266336);
    expect(meta).not.toBeNull();
    expect(meta!.sportsbooks).toHaveLength(2);
    expect(meta!.sportsbooks[0]!.name).toBe("BetOnline");
    expect(meta!.sportsbooks[1]!.name).toBe("DraftKings");
    expect(meta!.sportsbooks[1]!.id).toBe(29);
  });
});

describe("getConsensusMeta", () => {
  it("returns pick types, consensus types, and matchup labels", async () => {
    const fetchMock = jsonFetch({
      PickTypes: { "1": "ATS", "2": "Total" },
      ConsensusTypes: { "1": "Cash", "2": "Tickets" },
      Rotation1: "463",
      Rotation2: "464",
      Team1: "Steelers",
      Team2: "Patriots",
    });
    const client = new PregameClient(ENV, fetchMock as unknown as typeof fetch);

    const meta = await client.getConsensusMeta(266336);
    expect(meta).not.toBeNull();
    expect(meta!.pickTypes).toEqual({ "1": "ATS", "2": "Total" });
    expect(meta!.consensusTypes).toEqual({ "1": "Cash", "2": "Tickets" });
    expect(meta!.team1).toBe("Steelers");
    expect(meta!.team2).toBe("Patriots");
    expect(meta!.rotation1).toBe("463");
    expect(meta!.rotation2).toBe("464");
  });
});

describe("getEventListing", () => {
  it("parses the Steelers@Patriots event", async () => {
    const fetchMock = jsonFetch({
      EventCount: 227,
      Events: [
        {
          Id: 266336,
          LeagueId: 1,
          ScheduledDateAndTime: "2026-09-20T17:00:00Z",
          Rotation1: "463",
          Rotation2: "464",
          Team1: "Steelers",
          Team2: "Patriots",
        },
      ],
    });
    const client = new PregameClient(ENV, fetchMock as unknown as typeof fetch);

    const listing = await client.getEventListing();
    expect(listing).not.toBeNull();
    expect(listing!.eventCount).toBe(227);
    expect(listing!.events).toHaveLength(1);

    const event = listing!.events[0]!;
    expect(event.id).toBe(266336);
    expect(event.leagueId).toBe(1);
    expect(event.scheduledDateAndTime).toBe("2026-09-20T17:00:00Z");
    expect(event.team1).toBe("Steelers");
    expect(event.team2).toBe("Patriots");
  });

  it("hits the socket bootstrap endpoint", async () => {
    const fetchMock = jsonFetch({ EventCount: 0, Events: [] });
    const client = new PregameClient(ENV, fetchMock as unknown as typeof fetch);

    await client.getEventListing();
    const calls = fetchMock.mock.calls as unknown as Array<[unknown]>;
    const url = String(calls[0]![0]);
    expect(url).toBe(`${PREGAME_SOCKET_BASE}/bootstrap`);
  });
});

describe("errors", () => {
  it("HTTP 403 → throws PregameError with status 403", async () => {
    const fetchMock = jsonFetch({ error: "forbidden" }, 403);
    const client = new PregameClient(ENV, fetchMock as unknown as typeof fetch);

    await expect(client.getConsensusHistory(1)).rejects.toThrow(PregameError);
    await expect(client.getConsensusHistory(1)).rejects.toMatchObject({ status: 403 });
  });

  it("HTTP 500 → throws PregameError with status 500", async () => {
    const fetchMock = jsonFetch({ error: "boom" }, 500);
    const client = new PregameClient(ENV, fetchMock as unknown as typeof fetch);

    await expect(client.getEventListing()).rejects.toMatchObject({ status: 500 });
  });
});

describe("module constants", () => {
  it("exports base URLs and attribution", () => {
    expect(PREGAME_BASE).toBe("https://pregame.com/api/gamecenter");
    expect(PREGAME_SOCKET_BASE).toBe("https://socket.pregame.com/api/gamecenter");
    expect(PREGAME_ATTRIBUTION).toBe("Betting consensus data via Pregame.com.");
  });
});
