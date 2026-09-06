import { describe, expect, it, vi } from "vitest";
import {
  ODDS_KEY_TO_ESPN_SPORT,
  buildPaidOddsGovernor,
  espnScoreboardDateRange,
  hasEventWithinHorizon,
  sportHasEventWithin48h,
} from "@/lib/odds/paid-odds-governor";
import type { OddsCreditLedgerDb } from "@sports/data-ingestion";

/**
 * C-109 (c): refresh-odds skips the paid fetch for a sport with no event in the
 * next 48 hours on the free ESPN scoreboard, and never skips because the
 * scoreboard failed. Fixtures below are test data, not product claims.
 */

const NOW = new Date("2026-09-06T12:00:00.000Z");

function scoreboardResponse(events: Array<{ id: string; date: string; state: "pre" | "in" | "post" }>) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      events: events.map((e) => ({
        id: e.id,
        date: e.date,
        status: { type: { state: e.state, completed: e.state === "post" } },
        competitions: [
          {
            status: { type: { state: e.state, completed: e.state === "post" } },
            competitors: [
              { homeAway: "home", team: { displayName: "Home", abbreviation: "H" } },
              { homeAway: "away", team: { displayName: "Away", abbreviation: "A" } },
            ],
          },
        ],
      })),
    }),
  } as unknown as Response;
}

function fakeLedger(overrides: Partial<Record<"credits" | "odds", unknown>> = {}) {
  const create = vi.fn(async () => ({}));
  const findFirst = vi.fn(async (args: unknown) => {
    const where = (args as { where: { scope: string } }).where;
    if (where.scope === "ops.odds.credits") return (overrides.credits as never) ?? null;
    if (where.scope === "ops.odds.paidOdds") return (overrides.odds as never) ?? null;
    return null;
  });
  const findMany = vi.fn(async () => []);
  const db: OddsCreditLedgerDb = { jarvisMemoryEvent: { create, findFirst, findMany } };
  return { db, create, findFirst };
}

describe("espnScoreboardDateRange", () => {
  it("spans today through the UTC day 48h ahead", () => {
    expect(espnScoreboardDateRange(NOW)).toBe("20260906-20260908");
  });
  it("crosses a month boundary in UTC", () => {
    expect(espnScoreboardDateRange(new Date("2026-09-30T20:00:00.000Z"))).toBe("20260930-20261002");
  });
  it("starts at the six-hour started-game grace boundary: at 00:30 UTC the range begins yesterday", () => {
    expect(espnScoreboardDateRange(new Date("2026-09-06T00:30:00.000Z"))).toBe("20260905-20260908");
  });
});

describe("hasEventWithinHorizon", () => {
  const g = (startTime: string, state: "pre" | "in" | "post" = "pre") => ({ startTime, state });

  it("true for a game starting inside the horizon", () => {
    expect(hasEventWithinHorizon([g("2026-09-07T17:00:00Z")], NOW)).toBe(true);
  });
  it("false when every listed game is past the horizon or long finished", () => {
    expect(
      hasEventWithinHorizon([g("2026-09-09T00:00:00Z"), g("2026-09-01T00:00:00Z", "post")], NOW),
    ).toBe(false);
  });
  it("true for a game in progress regardless of its listed start", () => {
    expect(hasEventWithinHorizon([g("2026-09-06T02:00:00Z", "in")], NOW)).toBe(true);
  });
  it("true for a not-yet-final game that kicked off inside the 6h grace window", () => {
    expect(hasEventWithinHorizon([g("2026-09-06T09:00:00Z")], NOW)).toBe(true);
  });
  it("a finished game 3h ago never counts, even inside the grace window (state-aware)", () => {
    expect(hasEventWithinHorizon([g("2026-09-06T09:00:00Z", "post")], NOW)).toBe(false);
  });
  it("false for an empty board", () => {
    expect(hasEventWithinHorizon([], NOW)).toBe(false);
  });
  it("ignores unparseable start times", () => {
    expect(hasEventWithinHorizon([g("")], NOW)).toBe(false);
  });
});

describe("sportHasEventWithin48h", () => {
  it("maps every supported Odds API key to a free-spine sport", () => {
    expect(Object.keys(ODDS_KEY_TO_ESPN_SPORT).sort()).toEqual(
      [
        "americanfootball_ncaaf",
        "americanfootball_nfl",
        "baseball_mlb",
        "basketball_nba",
        "basketball_ncaab",
        "icehockey_nhl",
        "soccer_usa_mls",
      ].sort(),
    );
  });

  it("asks ESPN for the 48h date range and answers false on an empty board", async () => {
    const fetchImpl = vi.fn(async () => scoreboardResponse([]));
    const res = await sportHasEventWithin48h("basketball_nba", NOW, fetchImpl as unknown as typeof fetch);
    expect(res).toBe(false);
    const url = String(fetchImpl.mock.calls[0]![0]);
    expect(url).toContain("/basketball/nba/scoreboard");
    expect(url).toContain("dates=20260906-20260908");
  });

  it("answers true when the board lists an event inside the horizon", async () => {
    const fetchImpl = vi.fn(async () =>
      scoreboardResponse([{ id: "1", date: "2026-09-07T17:00:00Z", state: "pre" }]),
    );
    expect(await sportHasEventWithin48h("americanfootball_nfl", NOW, fetchImpl as unknown as typeof fetch)).toBe(true);
  });

  it("answers null (never skip) when the scoreboard fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failing = vi.fn(async () => ({ ok: false, status: 503 }) as unknown as Response);
    expect(await sportHasEventWithin48h("baseball_mlb", NOW, failing as unknown as typeof fetch)).toBeNull();
    const throwing = vi.fn(async () => {
      throw new Error("network down");
    });
    expect(await sportHasEventWithin48h("baseball_mlb", NOW, throwing as unknown as typeof fetch)).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("not skipping"));
    warn.mockRestore();
  });

  it("answers null for an unmapped sport key", async () => {
    expect(await sportHasEventWithin48h("cricket_ipl", NOW)).toBeNull();
  });

  it("requires every division group: one failed group answers null (proceed), never an empty board", async () => {
    // College football is two ESPN requests (FBS groups=80, FCS groups=81). If
    // the FCS request fails, the FBS half alone must not be read as the board:
    // an empty board is what skips the paid call, so a missing division must
    // let the paid call PROCEED.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchImpl = vi.fn(async (url: string) =>
      url.includes("groups=81")
        ? ({ ok: false, status: 503 } as unknown as Response)
        : scoreboardResponse([{ id: "1", date: "2026-09-07T17:00:00Z", state: "pre" }]),
    );

    const res = await sportHasEventWithin48h("americanfootball_ncaaf", NOW, fetchImpl as unknown as typeof fetch);

    expect(res).toBeNull();
    const urls = fetchImpl.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes("groups=80"))).toBe(true);
    expect(urls.some((u) => u.includes("groups=81"))).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("not skipping"));
    warn.mockRestore();
  });

  it("answers from the full board when every division group succeeds", async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      url.includes("groups=81")
        ? scoreboardResponse([{ id: "2", date: "2026-09-07T20:00:00Z", state: "pre" }])
        : scoreboardResponse([]),
    );
    expect(await sportHasEventWithin48h("americanfootball_ncaaf", NOW, fetchImpl as unknown as typeof fetch)).toBe(true);
  });
});

describe("buildPaidOddsGovernor", () => {
  it("skips a sport with no event within 48h", async () => {
    const { db } = fakeLedger();
    const gov = buildPaidOddsGovernor({
      db,
      now: () => NOW,
      hasEventWithin48h: async () => false,
    });
    const d = await gov.decide("basketball_nba");
    expect(d.allow).toBe(false);
    expect(d.reason).toMatch(/no event within 48h/);
  });

  it("does not skip when the scoreboard check failed (null) and credits pace ok", async () => {
    const { db } = fakeLedger({
      credits: { full_text: null, metadata: { remaining: 19000, used: 1000, observedAt: NOW.toISOString(), source: "t" } },
    });
    const gov = buildPaidOddsGovernor({ db, now: () => NOW, hasEventWithin48h: async () => null });
    const d = await gov.decide("baseball_mlb");
    expect(d.allow).toBe(true);
    expect(d.reason).toMatch(/pace ok/);
  });

  it("allows with 'no observation yet' before any credit reading exists", async () => {
    const { db } = fakeLedger();
    const gov = buildPaidOddsGovernor({ db, now: () => NOW, hasEventWithin48h: async () => true });
    expect(await gov.decide("americanfootball_nfl")).toEqual({ allow: true, reason: "no observation yet" });
  });

  it("in reserve mode holds a sport that already made a paid odds call this hour", async () => {
    const { db, findFirst } = fakeLedger({
      credits: { full_text: null, metadata: { remaining: 3000, used: 17000, observedAt: NOW.toISOString(), source: "t" } },
      odds: {
        full_text: null,
        metadata: { sport: "americanfootball_nfl", purpose: "odds", at: new Date(NOW.getTime() - 10 * 60_000).toISOString() },
      },
    });
    const gov = buildPaidOddsGovernor({ db, now: () => NOW, hasEventWithin48h: async () => true });
    const d = await gov.decide("americanfootball_nfl");
    expect(d.allow).toBe(false);
    expect(d.reason).toMatch(/reserve/);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ scope: "ops.odds.paidOdds", source_ref: "americanfootball_nfl" }),
      }),
    );
  });

  it("a stale zero reading allows one probe, and a fresh zero holds", async () => {
    const twoHoursAgo = new Date(NOW.getTime() - 2 * 60 * 60_000).toISOString();
    const stale = fakeLedger({
      credits: { full_text: null, metadata: { remaining: 0, used: 20000, observedAt: twoHoursAgo, source: "t" } },
    });
    const govStale = buildPaidOddsGovernor({ db: stale.db, now: () => NOW, hasEventWithin48h: async () => true });
    expect(await govStale.decide("americanfootball_nfl")).toEqual({
      allow: true,
      reason: "probe: zero-credit observation is stale",
    });

    const fresh = fakeLedger({
      credits: { full_text: null, metadata: { remaining: 0, used: 20000, observedAt: NOW.toISOString(), source: "t" } },
    });
    const govFresh = buildPaidOddsGovernor({ db: fresh.db, now: () => NOW, hasEventWithin48h: async () => true });
    expect(await govFresh.decide("americanfootball_nfl")).toEqual({ allow: false, reason: "zero credits remaining" });
  });

  it("records the odds call marker and the credit observation in the ledger", async () => {
    const { db, create } = fakeLedger();
    const gov = buildPaidOddsGovernor({ db, now: () => NOW, hasEventWithin48h: async () => true });
    await gov.recordCall("americanfootball_nfl", NOW);
    await gov.recordCredits({ remaining: 18500, observedAt: NOW });
    const scopes = create.mock.calls.map((c) => (c[0] as { data: Record<string, unknown> }).data["scope"]);
    expect(scopes).toEqual(["ops.odds.paidOdds", "ops.odds.credits"]);
    const credits = (create.mock.calls[1]![0] as { data: { metadata: Record<string, unknown> } }).data.metadata;
    expect(credits).toMatchObject({ remaining: 18500, used: null, source: "refresh-odds" });
  });
});
