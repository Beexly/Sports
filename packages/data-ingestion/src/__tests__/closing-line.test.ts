import { describe, it, expect, vi, beforeEach } from "vitest";
import type { OddsApiEvent } from "@sports/types";
import {
  captureClosingLine,
  deriveClosingConsensus,
  pickClosingValues,
  marketForPickType,
  MIN_CLOSING_BOOKMAKER_COUNT,
  type ClosingLineRowLike,
} from "../closing-line.js";

// Mock @sports/db so the capture path is hermetic — it must not depend on a
// live Postgres being reachable. We model BOTH the no-op stub behavior
// (upsert resolves to {id:"stub"}) and assert the helper never throws and
// counts attempted writes correctly. A separate test forces upsert to reject
// to prove the fail-closed swallow. The mock factory is hoisted by vitest, so
// the `hoisted` vars hold the spies the factory wires in.
const { upsertMock, isStubModeMock } = vi.hoisted(() => ({
  upsertMock: vi.fn(async () => ({ id: "stub" }) as Record<string, unknown>),
  isStubModeMock: vi.fn(() => true),
}));

vi.mock("@sports/db", () => ({
  db: { closingLine: { upsert: upsertMock } },
  isStubMode: isStubModeMock,
}));

const HOME = "Kansas City Chiefs";
const AWAY = "Philadelphia Eagles";

function bookmaker(key: string, spread: number, total: number, homeMl: number, awayMl: number) {
  return {
    key,
    title: key,
    last_update: "2026-04-10T17:55:00Z",
    markets: [
      {
        key: "spreads" as const,
        last_update: "2026-04-10T17:55:00Z",
        outcomes: [
          { name: HOME, price: -110, point: spread },
          { name: AWAY, price: -110, point: -spread },
        ],
      },
      {
        key: "totals" as const,
        last_update: "2026-04-10T17:55:00Z",
        outcomes: [
          { name: "Over", price: -110, point: total },
          { name: "Under", price: -110, point: total },
        ],
      },
      {
        key: "h2h" as const,
        last_update: "2026-04-10T17:55:00Z",
        outcomes: [
          { name: HOME, price: homeMl },
          { name: AWAY, price: awayMl },
        ],
      },
    ],
  };
}

function makeEvent(books: ReturnType<typeof bookmaker>[]): OddsApiEvent {
  return {
    id: "event-clv-1",
    sport_key: "americanfootball_nfl",
    sport_title: "NFL",
    commence_time: "2026-04-10T18:00:00Z",
    home_team: HOME,
    away_team: AWAY,
    bookmakers: books,
  };
}

const FETCHED_AT = new Date("2026-04-10T17:55:00Z");

describe("deriveClosingConsensus", () => {
  it("averages spread/total/prices across bookmakers per market", () => {
    const event = makeEvent([
      bookmaker("fanduel", -3, 48, -150, 130),
      bookmaker("draftkings", -3.5, 49, -160, 140),
    ]);
    const rows = deriveClosingConsensus(event, FETCHED_AT);

    const spreads = rows.find((r) => r.market === "SPREADS")!;
    expect(spreads.spread).toBeCloseTo(-3.25, 5);
    expect(spreads.bookmakerCount).toBe(2);

    const totals = rows.find((r) => r.market === "TOTALS")!;
    expect(totals.total).toBeCloseTo(48.5, 5);

    const h2h = rows.find((r) => r.market === "H2H")!;
    expect(h2h.homePrice).toBeCloseTo(-155, 5);
    expect(h2h.awayPrice).toBeCloseTo(135, 5);
  });

  it("reports the distinct bookmaker count per market", () => {
    const event = makeEvent([
      bookmaker("fanduel", -3, 48, -150, 130),
      bookmaker("draftkings", -3, 48, -150, 130),
      bookmaker("betmgm", -3, 48, -150, 130),
    ]);
    const rows = deriveClosingConsensus(event, FETCHED_AT);
    expect(rows.find((r) => r.market === "SPREADS")!.bookmakerCount).toBe(3);
  });
});

describe("captureClosingLine — stub-safe / fail-closed", () => {
  beforeEach(() => {
    upsertMock.mockReset();
    upsertMock.mockImplementation(async () => ({ id: "stub" }) as Record<string, unknown>);
    isStubModeMock.mockReturnValue(true);
  });

  // Under the @sports/db stub, upsert no-ops and the helper must complete
  // without throwing, counting attempted writes.
  it("no-ops cleanly under the stub DB and never throws", async () => {
    const event = makeEvent([
      bookmaker("fanduel", -3, 48, -150, 130),
      bookmaker("draftkings", -3.5, 49, -160, 140),
      bookmaker("betmgm", -3, 48.5, -155, 135),
    ]);
    const result = await captureClosingLine({
      gameId: "game-1",
      event,
      fetchedAt: FETCHED_AT,
    });
    // 3 markets, all with consensus values, 3 books each → none stale.
    expect(result.written).toBe(3);
    expect(result.stale).toBe(0);
    expect(result.skipped).toBe(0);
  });

  it("flags thin-coverage snapshots as stale", async () => {
    // A single book → bookmakerCount 1 < MIN → every market stale.
    expect(MIN_CLOSING_BOOKMAKER_COUNT).toBeGreaterThan(1);
    const event = makeEvent([bookmaker("fanduel", -3, 48, -150, 130)]);
    const result = await captureClosingLine({
      gameId: "game-2",
      event,
      fetchedAt: FETCHED_AT,
    });
    expect(result.written).toBe(3);
    expect(result.stale).toBe(3);
  });

  it("skips markets that carry no consensus value (no faked close)", async () => {
    const emptyEvent: OddsApiEvent = {
      id: "event-empty",
      sport_key: "americanfootball_nfl",
      sport_title: "NFL",
      commence_time: "2026-04-10T18:00:00Z",
      home_team: HOME,
      away_team: AWAY,
      bookmakers: [], // no markets at all
    };
    const result = await captureClosingLine({
      gameId: "game-3",
      event: emptyEvent,
      fetchedAt: FETCHED_AT,
    });
    expect(result.written).toBe(0);
    expect(result.skipped).toBe(0); // no market rows to even skip
  });

  it("never throws on a malformed event", async () => {
    const bad = { id: "x", bookmakers: undefined } as unknown as OddsApiEvent;
    await expect(
      captureClosingLine({ gameId: "g", event: bad, fetchedAt: FETCHED_AT })
    ).resolves.toEqual({ written: 0, stale: 0, skipped: 0 });
  });

  it("swallows a DB upsert failure (fail-closed) and writes nothing", async () => {
    // Simulate a real DB that is unreachable / rejects: every upsert throws.
    // The helper must NOT propagate — settlement can never be blocked by CLV.
    isStubModeMock.mockReturnValue(false);
    upsertMock.mockRejectedValue(new Error("connection refused"));
    const event = makeEvent([
      bookmaker("fanduel", -3, 48, -150, 130),
      bookmaker("draftkings", -3.5, 49, -160, 140),
      bookmaker("betmgm", -3, 48.5, -155, 135),
    ]);
    const result = await captureClosingLine({
      gameId: "game-fail",
      event,
      fetchedAt: FETCHED_AT,
    });
    // All upserts failed → nothing counted as written, but no throw.
    expect(result.written).toBe(0);
    expect(upsertMock).toHaveBeenCalledTimes(3);
  });
});

describe("pickClosingValues — projects a closing row onto a pick's axis", () => {
  const row: ClosingLineRowLike = {
    market: "SPREADS",
    spread: -3.5,
    total: 48.5,
    homePrice: -150,
    awayPrice: 130,
    isStale: false,
  };

  it("spread pick reads the closing spread as the line", () => {
    const v = pickClosingValues(row, "SPREAD", "HOME");
    expect(v.closingLine).toBe(-3.5);
    expect(v.closingPrice).toBeNull();
  });

  it("total pick reads the closing total as the line", () => {
    const v = pickClosingValues({ ...row, market: "TOTALS" }, "TOTAL", "OVER");
    expect(v.closingLine).toBe(48.5);
    expect(v.closingPrice).toBeNull();
  });

  it("moneyline pick reads the side's closing price", () => {
    expect(pickClosingValues({ ...row, market: "H2H" }, "MONEYLINE", "HOME").closingPrice).toBe(-150);
    expect(pickClosingValues({ ...row, market: "H2H" }, "MONEYLINE", "AWAY").closingPrice).toBe(130);
  });

  it("returns nulls when no closing row exists (degrade-to-null)", () => {
    expect(pickClosingValues(null, "SPREAD", "HOME")).toEqual({
      closingLine: null,
      closingPrice: null,
      isStale: false,
    });
  });

  it("propagates the stale flag", () => {
    expect(pickClosingValues({ ...row, isStale: true }, "SPREAD", "HOME").isStale).toBe(true);
  });
});

describe("marketForPickType", () => {
  it("maps pick types to their odds market", () => {
    expect(marketForPickType("SPREAD")).toBe("SPREADS");
    expect(marketForPickType("TOTAL")).toBe("TOTALS");
    expect(marketForPickType("MONEYLINE")).toBe("H2H");
  });
});
