import { describe, expect, it, vi } from "vitest";
import {
  ODDS_KEY_TO_ESPN_SHORT,
  buildPaidOddsGovernor,
  espnScoreboardDateRange,
  hasEventWithinHorizon,
  sportHasEventWithin48h,
} from "../paid-odds-governor.js";
import type { OddsCreditLedgerDb } from "../odds-credit-ledger.js";

/**
 * C-109: the ledger-backed paid odds governor now lives in this package so
 * refreshOdds can build it by default for every caller. Same contract the
 * apps/web flavour is tested against; fixtures below are test data, not
 * product claims.
 */

const NOW = new Date("2026-09-06T12:00:00.000Z");

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;
const asFetch = (fn: ReturnType<typeof vi.fn<FetchFn>>): typeof fetch => fn as unknown as typeof fetch;

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

type Row = { full_text: string | null; metadata: unknown } | null;
type CreateArgs = { data: Record<string, unknown> };

function fakeLedger(overrides: Partial<Record<"credits" | "odds" | "scores", Row>> = {}) {
  const create = vi.fn<(args: CreateArgs) => Promise<unknown>>(async () => ({}));
  const findFirst = vi.fn<(args: { where: { scope: string } }) => Promise<Row>>(async (args) => {
    const where = args.where;
    if (where.scope === "ops.odds.credits") return overrides.credits ?? null;
    if (where.scope === "ops.odds.paidOdds") return overrides.odds ?? null;
    if (where.scope === "ops.odds.paidScores") return overrides.scores ?? null;
    return null;
  });
  const findMany = vi.fn(async () => []);
  const db: OddsCreditLedgerDb = { jarvisMemoryEvent: { create, findFirst, findMany } };
  return { db, create, findFirst };
}

const credits = (remaining: number, observedAt: string = NOW.toISOString()): Row => ({
  full_text: null,
  metadata: { remaining, used: 20000 - remaining, observedAt, source: "t" },
});
const marker = (sport: string, purpose: "odds" | "scores", minutesAgo: number): Row => ({
  full_text: null,
  metadata: { sport, purpose, at: new Date(NOW.getTime() - minutesAgo * 60_000).toISOString() },
});

describe("espnScoreboardDateRange", () => {
  it("spans today through the UTC day 48h ahead", () => {
    expect(espnScoreboardDateRange(NOW)).toBe("20260906-20260908");
  });
  it("crosses a month boundary in UTC", () => {
    expect(espnScoreboardDateRange(new Date("2026-09-30T20:00:00.000Z"))).toBe("20260930-20261002");
  });
  it("starts at the six-hour started-game grace boundary, so a game that kicked off before UTC midnight stays on the board", () => {
    expect(espnScoreboardDateRange(new Date("2026-09-06T00:30:00.000Z"))).toBe("20260905-20260908");
  });
});

describe("hasEventWithinHorizon", () => {
  const g = (commence: string, state: "pre" | "in" | "post" | "unknown" = "pre") => ({
    commenceTime: new Date(commence),
    state,
  });

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
  it("true for a game that started within the 6h grace window and is not over", () => {
    expect(hasEventWithinHorizon([g("2026-09-06T07:00:00Z")], NOW)).toBe(true);
  });
  it("a finished game 3h ago never counts, even inside the grace window", () => {
    expect(hasEventWithinHorizon([g("2026-09-06T09:00:00Z", "post")], NOW)).toBe(false);
  });
  it("false for an empty board", () => {
    expect(hasEventWithinHorizon([], NOW)).toBe(false);
  });
  it("ignores an invalid commence time", () => {
    expect(hasEventWithinHorizon([g("not-a-date")], NOW)).toBe(false);
  });
});

describe("sportHasEventWithin48h", () => {
  it("maps every supported Odds API key to a free-spine short key", () => {
    expect(ODDS_KEY_TO_ESPN_SHORT).toEqual({
      americanfootball_nfl: "nfl",
      americanfootball_ncaaf: "ncaaf",
      basketball_nba: "nba",
      basketball_ncaab: "ncaab",
      baseball_mlb: "mlb",
      icehockey_nhl: "nhl",
      soccer_usa_mls: "mls",
    });
  });

  it("asks ESPN for the grace-to-48h date range with the full-board limit and answers false on an empty board", async () => {
    const fetchImpl = vi.fn<FetchFn>(async () => scoreboardResponse([]));
    const res = await sportHasEventWithin48h("basketball_nba", NOW, asFetch(fetchImpl));
    expect(res).toBe(false);
    const url = fetchImpl.mock.calls[0]![0];
    expect(url).toContain("/basketball/nba/scoreboard");
    expect(url).toContain("dates=20260906-20260908");
    expect(url).toContain("limit=300");
  });

  it("answers true when the board lists an event inside the horizon", async () => {
    const fetchImpl = vi.fn<FetchFn>(async () =>
      scoreboardResponse([{ id: "1", date: "2026-09-07T17:00:00Z", state: "pre" }]),
    );
    expect(await sportHasEventWithin48h("americanfootball_nfl", NOW, asFetch(fetchImpl))).toBe(true);
    expect(fetchImpl.mock.calls[0]![0]).toContain("/football/nfl/scoreboard");
  });

  it("answers null (never skip) when the scoreboard fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failing = vi.fn<FetchFn>(async () => ({ ok: false, status: 503 }) as unknown as Response);
    expect(await sportHasEventWithin48h("baseball_mlb", NOW, asFetch(failing))).toBeNull();
    const throwing = vi.fn<FetchFn>(async () => {
      throw new Error("network down");
    });
    expect(await sportHasEventWithin48h("baseball_mlb", NOW, asFetch(throwing))).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("not skipping"));
    warn.mockRestore();
  });

  it("answers null for an unmapped sport key without fetching", async () => {
    const fetchImpl = vi.fn<FetchFn>(async () => scoreboardResponse([]));
    expect(await sportHasEventWithin48h("cricket_ipl", NOW, asFetch(fetchImpl))).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("buildPaidOddsGovernor", () => {
  it("skips a sport with no event within 48h", async () => {
    const { db, create } = fakeLedger();
    const gov = buildPaidOddsGovernor({ db, now: () => NOW, hasEventWithin48h: async () => false });
    const d = await gov.decide("basketball_nba");
    expect(d.allow).toBe(false);
    expect(d.reason).toMatch(/no event within 48h/);
    expect(create).not.toHaveBeenCalled();
  });

  it("does not skip when the scoreboard check failed (null) and credits pace ok", async () => {
    const { db } = fakeLedger({ credits: credits(19000) });
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

  it("a positive decision has RESERVED the slot: the odds marker is written by decide(), before any fetch", async () => {
    const { db, create } = fakeLedger({ credits: credits(19000) });
    const gov = buildPaidOddsGovernor({ db, now: () => NOW, hasEventWithin48h: async () => true });
    await gov.decide("americanfootball_nfl");
    expect(create).toHaveBeenCalledTimes(1);
    const row = create.mock.calls[0]![0].data;
    expect(row["scope"]).toBe("ops.odds.paidOdds");
    expect(row["source_ref"]).toBe("americanfootball_nfl");
    expect(row["metadata"]).toMatchObject({ sport: "americanfootball_nfl", purpose: "odds", at: NOW.toISOString() });
  });

  it("pace-ok odds are not hourly-capped: a marker ten minutes old still allows, and a new marker is still recorded", async () => {
    const { db, create } = fakeLedger({
      credits: credits(19000),
      odds: marker("americanfootball_nfl", "odds", 10),
    });
    const gov = buildPaidOddsGovernor({ db, now: () => NOW, hasEventWithin48h: async () => true });
    const d = await gov.decide("americanfootball_nfl");
    expect(d.allow).toBe(true);
    expect(d.reason).toMatch(/pace ok/);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("in reserve mode holds a sport that already made a paid odds call this hour", async () => {
    const { db, findFirst, create } = fakeLedger({
      credits: credits(3000),
      odds: marker("americanfootball_nfl", "odds", 10),
    });
    const gov = buildPaidOddsGovernor({ db, now: () => NOW, hasEventWithin48h: async () => true });
    const d = await gov.decide("americanfootball_nfl");
    expect(d.allow).toBe(false);
    expect(d.reason).toMatch(/reserve/);
    expect(create).not.toHaveBeenCalled();
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ scope: "ops.odds.paidOdds", source_ref: "americanfootball_nfl" }),
      }),
    );
  });

  it("in reserve mode a marker written by a concurrent caller between the decision and the reservation holds the call", async () => {
    // The decision phase reads the odds marker twice (own purpose, any purpose)
    // and sees none; the reservation's read then finds the marker a concurrent
    // run wrote a minute ago. The hourly rule binds in reserve mode, so the
    // refused reservation holds this run.
    let oddsReads = 0;
    const create = vi.fn<(args: CreateArgs) => Promise<unknown>>(async () => ({}));
    const findFirst = vi.fn<(args: { where: { scope: string } }) => Promise<Row>>(async (args) => {
      if (args.where.scope === "ops.odds.credits") return credits(3000);
      if (args.where.scope === "ops.odds.paidOdds") {
        oddsReads += 1;
        return oddsReads <= 2 ? null : marker("americanfootball_nfl", "odds", 1);
      }
      return null;
    });
    const db: OddsCreditLedgerDb = { jarvisMemoryEvent: { create, findFirst, findMany: vi.fn(async () => []) } };
    const gov = buildPaidOddsGovernor({ db, now: () => NOW, hasEventWithin48h: async () => true });

    const d = await gov.decide("americanfootball_nfl");

    expect(d.allow).toBe(false);
    expect(d.reason).toMatch(/reserved by a concurrent caller/);
    expect(create).not.toHaveBeenCalled();
  });

  it("a stale zero reading allows one probe, and a fresh zero holds", async () => {
    const twoHoursAgo = new Date(NOW.getTime() - 2 * 60 * 60_000).toISOString();
    const stale = fakeLedger({ credits: credits(0, twoHoursAgo) });
    const govStale = buildPaidOddsGovernor({ db: stale.db, now: () => NOW, hasEventWithin48h: async () => true });
    expect(await govStale.decide("americanfootball_nfl")).toEqual({
      allow: true,
      reason: "probe: zero-credit observation is stale",
    });
    expect(stale.create).toHaveBeenCalledTimes(1);

    const fresh = fakeLedger({ credits: credits(0) });
    const govFresh = buildPaidOddsGovernor({ db: fresh.db, now: () => NOW, hasEventWithin48h: async () => true });
    expect(await govFresh.decide("americanfootball_nfl")).toEqual({ allow: false, reason: "zero credits remaining" });
    expect(fresh.create).not.toHaveBeenCalled();
  });

  it("the stale-zero probe is one per sport per hour ACROSS purposes: a scores probe ten minutes ago holds the odds probe", async () => {
    const twoHoursAgo = new Date(NOW.getTime() - 2 * 60 * 60_000).toISOString();
    const { db, create, findFirst } = fakeLedger({
      credits: credits(0, twoHoursAgo),
      scores: marker("americanfootball_nfl", "scores", 10),
    });
    const gov = buildPaidOddsGovernor({ db, now: () => NOW, hasEventWithin48h: async () => true });
    const d = await gov.decide("americanfootball_nfl");
    expect(d.allow).toBe(false);
    expect(d.reason).toMatch(/already probed this hour/);
    expect(create).not.toHaveBeenCalled();
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ scope: "ops.odds.paidScores", source_ref: "americanfootball_nfl" }),
      }),
    );
  });

  it("records an additional odds call marker and the credit observation in the ledger", async () => {
    const { db, create } = fakeLedger();
    const gov = buildPaidOddsGovernor({ db, now: () => NOW, hasEventWithin48h: async () => true });
    await gov.recordCall("americanfootball_nfl", NOW);
    await gov.recordCredits({ remaining: 18500, observedAt: NOW });
    const scopes = create.mock.calls.map((c) => c[0].data["scope"]);
    expect(scopes).toEqual(["ops.odds.paidOdds", "ops.odds.credits"]);
    expect(create.mock.calls[0]![0].data["source_ref"]).toBe("americanfootball_nfl");
    expect(create.mock.calls[1]![0].data["metadata"]).toMatchObject({
      remaining: 18500,
      used: null,
      source: "refresh-odds",
    });
  });

  it("stamps a caller-supplied source on the credit observation", async () => {
    const { db, create } = fakeLedger();
    const gov = buildPaidOddsGovernor({ db, now: () => NOW, hasEventWithin48h: async () => true, source: "board-fill" });
    await gov.recordCredits({ remaining: 18400, observedAt: NOW });
    expect(create.mock.calls[0]![0].data["metadata"]).toMatchObject({ remaining: 18400, source: "board-fill" });
  });

  it("uses the package ESPN check by default, threading fetchImpl through", async () => {
    const { db } = fakeLedger();
    const fetchImpl = vi.fn<FetchFn>(async () => scoreboardResponse([]));
    const gov = buildPaidOddsGovernor({ db, now: () => NOW, fetchImpl: asFetch(fetchImpl) });
    const d = await gov.decide("icehockey_nhl");
    expect(d.allow).toBe(false);
    expect(d.reason).toMatch(/no event within 48h/);
    expect(fetchImpl.mock.calls[0]![0]).toContain("/hockey/nhl/scoreboard");
  });
});
