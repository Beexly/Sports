import { describe, expect, it } from "vitest";
import {
  BACKFILL_SOURCE,
  estimateCalls,
  mapHistoricalEventToRows,
  phaseTimestamp,
  planBackfill,
} from "@/lib/ops/odds-backfill";
import type { OddsApiEvent } from "@sports/types";

const KICKOFF = new Date("2026-09-13T17:00:00Z");

function eventWith(overrides: Partial<OddsApiEvent> = {}): OddsApiEvent {
  return {
    id: "evt-1",
    sport_key: "americanfootball_nfl",
    sport_title: "NFL",
    commence_time: KICKOFF.toISOString(),
    home_team: "Home",
    away_team: "Away",
    bookmakers: [
      {
        key: "draftkings",
        title: "DraftKings",
        markets: [
          {
            key: "spreads",
            outcomes: [
              { name: "Home", price: -110, point: -3.5 },
              { name: "Away", price: -110, point: 3.5 },
            ],
          },
          {
            key: "totals",
            outcomes: [
              { name: "Over", price: -105, point: 44.5 },
              { name: "Under", price: -115, point: 44.5 },
            ],
          },
          {
            key: "h2h",
            outcomes: [
              { name: "Home", price: -150 },
              { name: "Away", price: 130 },
            ],
          },
        ],
      },
      {
        key: "fanduel",
        title: "FanDuel",
        markets: [
          {
            key: "spreads",
            outcomes: [
              { name: "Home", price: -112, point: -3 },
              { name: "Away", price: -108, point: 3 },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("phaseTimestamp", () => {
  it("places OPEN seven days before kickoff", () => {
    const ts = phaseTimestamp(KICKOFF, "OPEN");
    expect(ts.getTime()).toBe(KICKOFF.getTime() - 7 * 24 * 3_600_000);
  });

  it("places CLOSE one hour before kickoff", () => {
    const ts = phaseTimestamp(KICKOFF, "CLOSE");
    expect(ts.getTime()).toBe(KICKOFF.getTime() - 3_600_000);
  });
});

describe("mapHistoricalEventToRows", () => {
  it("emits one row per bookmaker per market per side, skipping moneylines", () => {
    const rows = mapHistoricalEventToRows(eventWith(), "game-1", "OPEN", KICKOFF);
    // draftkings: 2 spread + 2 total (h2h skipped) = 4; fanduel: 2 spread = 2
    expect(rows).toHaveLength(6);
    for (const r of rows) {
      expect(r.gameId).toBe("game-1");
      expect(r.phase).toBe("OPEN");
      expect(r.source).toBe(BACKFILL_SOURCE);
      expect(["SPREAD", "TOTAL"]).toContain(r.market);
    }
    const dkSpread = rows.filter((r) => r.book === "draftkings" && r.market === "SPREAD");
    expect(dkSpread).toHaveLength(2);
    expect(dkSpread.map((r) => r.line).sort()).toEqual([-3.5, 3.5]);
  });

  it("drops non-finite prices and lines instead of writing junk", () => {
    const evt = eventWith({
      bookmakers: [
        {
          key: "dk",
          title: "DK",
          markets: [
            {
              key: "spreads",
              outcomes: [
                { name: "Home", price: Number.NaN, point: -3 },
                { name: "Away", price: -110, point: Number.POSITIVE_INFINITY },
                { name: "Home", price: -110, point: -3 },
              ],
            },
          ],
        },
      ],
    });
    const rows = mapHistoricalEventToRows(evt, "game-1", "CLOSE", KICKOFF);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.price).toBe(-110);
  });

  it("returns [] when the event has no usable markets", () => {
    const rows = mapHistoricalEventToRows(eventWith({ bookmakers: [] }), "g", "OPEN", KICKOFF);
    expect(rows).toEqual([]);
  });
});

describe("planBackfill", () => {
  const game = (id: string, existingPhases: readonly string[]) => ({
    gameId: id,
    externalId: `ext-${id}`,
    commenceTime: KICKOFF,
    existingPhases,
  });

  it("plans both phases for a fresh game", () => {
    const plan = planBackfill([game("a", [])]);
    expect(plan).toHaveLength(1);
    expect(plan[0]!.phases).toEqual(["OPEN", "CLOSE"]);
  });

  it("plans only the missing phase", () => {
    const plan = planBackfill([game("a", ["OPEN"])]);
    expect(plan[0]!.phases).toEqual(["CLOSE"]);
  });

  it("skips games already holding both phases", () => {
    const plan = planBackfill([game("a", ["OPEN", "CLOSE"]), game("b", [])]);
    expect(plan).toHaveLength(1);
    expect(plan[0]!.gameId).toBe("b");
  });
});

describe("estimateCalls", () => {
  it("counts one paid call per planned phase", () => {
    const plan = planBackfill([
      { gameId: "a", externalId: "x", commenceTime: KICKOFF, existingPhases: [] },
      { gameId: "b", externalId: "y", commenceTime: KICKOFF, existingPhases: ["OPEN"] },
    ]);
    expect(estimateCalls(plan)).toBe(3);
  });
});
