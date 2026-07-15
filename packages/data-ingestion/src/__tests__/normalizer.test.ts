import { describe, it, expect } from "vitest";
import { DataNormalizer } from "../normalizer.js";
import type { OddsApiEvent } from "@sports/types";

const mockEvent: OddsApiEvent = {
  id: "event-123",
  sport_key: "americanfootball_nfl",
  sport_title: "NFL",
  commence_time: "2026-04-10T18:00:00Z",
  home_team: "Kansas City Chiefs",
  away_team: "Philadelphia Eagles",
  bookmakers: [
    {
      key: "fanduel",
      title: "FanDuel",
      last_update: new Date().toISOString(),
      markets: [
        {
          key: "h2h",
          last_update: new Date().toISOString(),
          outcomes: [
            { name: "Kansas City Chiefs", price: -180 },
            { name: "Philadelphia Eagles", price: 155 },
          ],
        },
        {
          key: "spreads",
          last_update: new Date().toISOString(),
          outcomes: [
            { name: "Kansas City Chiefs", price: -110, point: -3.5 },
            { name: "Philadelphia Eagles", price: -110, point: 3.5 },
          ],
        },
        {
          key: "totals",
          last_update: new Date().toISOString(),
          outcomes: [
            { name: "Over", price: -110, point: 48.5 },
            { name: "Under", price: -110, point: 48.5 },
          ],
        },
      ],
    },
  ],
};

function eventWithMarket(
  market: OddsApiEvent["bookmakers"][number]["markets"][number],
  sportKey = "americanfootball_nfl",
): OddsApiEvent {
  return {
    ...mockEvent,
    sport_key: sportKey,
    bookmakers: [
      {
        ...mockEvent.bookmakers[0]!,
        markets: [market],
      },
    ],
  };
}

describe("DataNormalizer", () => {
  const normalizer = new DataNormalizer();

  describe("normalizeGames", () => {
    it("normalizes a game correctly", () => {
      const games = normalizer.normalizeGames([mockEvent]);
      expect(games).toHaveLength(1);

      const game = games[0]!;
      expect(game.externalId).toBe("event-123");
      expect(game.sportKey).toBe("americanfootball_nfl");
      expect(game.homeTeam).toBe("Kansas City Chiefs");
      expect(game.awayTeam).toBe("Philadelphia Eagles");
      expect(game.commenceTime).toBeInstanceOf(Date);
    });

    it("returns empty array for empty input", () => {
      expect(normalizer.normalizeGames([])).toEqual([]);
    });

    it("normalizes multiple games", () => {
      const games = normalizer.normalizeGames([mockEvent, { ...mockEvent, id: "event-456" }]);
      expect(games).toHaveLength(2);
    });
  });

  describe("normalizeOdds", () => {
    it("normalizes moneyline odds correctly", () => {
      const fetchedAt = new Date();
      const odds = normalizer.normalizeOdds([mockEvent], fetchedAt);

      const h2hOdds = odds.filter((o) => o.market === "H2H");
      expect(h2hOdds.length).toBeGreaterThan(0);

      const h2h = h2hOdds[0]!;
      expect(h2h.gameExternalId).toBe("event-123");
      expect(h2h.bookmaker).toBe("fanduel");
      expect(h2h.homePrice).toBe(-180);
      expect(h2h.awayPrice).toBe(155);
      expect(h2h.fetchedAt).toBe(fetchedAt);
    });

    it("preserves the draw quote for a three-way soccer moneyline", () => {
      const event = eventWithMarket(
        {
          key: "h2h",
          last_update: new Date().toISOString(),
          outcomes: [
            { name: "Kansas City Chiefs", price: -125 },
            { name: "Philadelphia Eagles", price: 310 },
            { name: "Draw", price: 260 },
          ],
        },
        "soccer_usa_mls",
      );

      expect(normalizer.normalizeOdds([event], new Date())[0]).toMatchObject({
        market: "H2H",
        homePrice: -125,
        awayPrice: 310,
        drawPrice: 260,
      });
    });

    it("normalizes spread odds correctly", () => {
      const fetchedAt = new Date();
      const odds = normalizer.normalizeOdds([mockEvent], fetchedAt);

      const spreadOdds = odds.filter((o) => o.market === "SPREADS");
      expect(spreadOdds.length).toBeGreaterThan(0);

      const spread = spreadOdds[0]!;
      expect(spread.spread).toBe(-3.5);
      expect(spread.homeSpreadPrice).toBe(-110);
      expect(spread.awaySpreadPrice).toBe(-110);
    });

    it("normalizes totals odds correctly", () => {
      const fetchedAt = new Date();
      const odds = normalizer.normalizeOdds([mockEvent], fetchedAt);

      const totalOdds = odds.filter((o) => o.market === "TOTALS");
      expect(totalOdds.length).toBeGreaterThan(0);

      const total = totalOdds[0]!;
      expect(total.total).toBe(48.5);
      expect(total.overPrice).toBe(-110);
      expect(total.underPrice).toBe(-110);
    });

    it.each([-7750, -110.5, 1.91, Number.NaN, Number.POSITIVE_INFINITY])(
      "quarantines a two-sided moneyline with invalid American price %s",
      (homePrice) => {
        const event = eventWithMarket({
          key: "h2h",
          last_update: new Date().toISOString(),
          outcomes: [
            { name: mockEvent.home_team, price: homePrice },
            { name: mockEvent.away_team, price: 120 },
          ],
        });
        expect(normalizer.normalizeOdds([event], new Date())).toEqual([]);
      },
    );

    it.each([-3.2, Number.NaN, Number.POSITIVE_INFINITY, 100.5])(
      "quarantines a non-tradable NFL spread %s",
      (homePoint) => {
        const event = eventWithMarket({
          key: "spreads",
          last_update: new Date().toISOString(),
          outcomes: [
            { name: mockEvent.home_team, price: -110, point: homePoint },
            { name: mockEvent.away_team, price: -110, point: -homePoint },
          ],
        });
        expect(normalizer.normalizeOdds([event], new Date())).toEqual([]);
      },
    );

    it("quarantines spreads whose two sides are not exact opposites", () => {
      const event = eventWithMarket({
        key: "spreads",
        last_update: new Date().toISOString(),
        outcomes: [
          { name: mockEvent.home_team, price: -110, point: -3.5 },
          { name: mockEvent.away_team, price: -110, point: 4 },
        ],
      });
      expect(normalizer.normalizeOdds([event], new Date())).toEqual([]);
    });

    it("normalizes supported soccer quarter handicaps", () => {
      const event = eventWithMarket(
        {
          key: "spreads",
          last_update: new Date().toISOString(),
          outcomes: [
            { name: mockEvent.home_team, price: -110, point: -0.24999999999999997 },
            { name: mockEvent.away_team, price: -110, point: 0.25000000000000006 },
          ],
        },
        "soccer_usa_mls",
      );
      expect(normalizer.normalizeOdds([event], new Date())[0]?.spread).toBe(-0.25);
    });

    it.each([8.954545454545455, 0, Number.NaN, Number.POSITIVE_INFINITY])(
      "quarantines a non-tradable NFL total %s",
      (point) => {
        const event = eventWithMarket({
          key: "totals",
          last_update: new Date().toISOString(),
          outcomes: [
            { name: "Over", price: -110, point },
            { name: "Under", price: -110, point },
          ],
        });
        expect(normalizer.normalizeOdds([event], new Date())).toEqual([]);
      },
    );

    it("quarantines totals whose over and under points disagree", () => {
      const event = eventWithMarket({
        key: "totals",
        last_update: new Date().toISOString(),
        outcomes: [
          { name: "Over", price: -110, point: 48.5 },
          { name: "Under", price: -110, point: 49 },
        ],
      });
      expect(normalizer.normalizeOdds([event], new Date())).toEqual([]);
    });
  });

  describe("validateFreshness", () => {
    it("returns true for fresh data", () => {
      const now = new Date();
      expect(normalizer.validateFreshness(now)).toBe(true);
    });

    it("returns false for stale data (older than the freshness threshold)", () => {
      const staleDate = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5h ago — past the 4h gate
      expect(normalizer.validateFreshness(staleDate)).toBe(false);
    });

    it("returns true for data just under the threshold", () => {
      const slightlyOld = new Date(Date.now() - 239 * 60 * 1000); // 3h59m — just under 4h
      expect(normalizer.validateFreshness(slightlyOld)).toBe(true);
    });
  });

  describe("validateOddsFreshness (real upstream age, not the local clock)", () => {
    it("carries the bookmaker's own last_update onto each normalized odd", () => {
      const odds = normalizer.normalizeOdds([mockEvent], new Date());
      expect(odds.length).toBeGreaterThan(0);
      for (const o of odds) {
        expect(o.bookmakerLastUpdate).toBeInstanceOf(Date);
        expect(Number.isFinite(o.bookmakerLastUpdate.getTime())).toBe(true);
      }
    });

    it("is fresh when the upstream last_update is recent", () => {
      const odds = normalizer.normalizeOdds([mockEvent], new Date()); // mock last_update = now
      expect(normalizer.validateOddsFreshness(odds)).toBe(true);
    });

    it("catches a STALE feed even when we just fetched it (the tautology fix)", () => {
      const staleEvent = {
        ...mockEvent,
        bookmakers: mockEvent.bookmakers.map((b) => ({
          ...b,
          last_update: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5h old (past 4h gate)
        })),
      };
      // We fetched "now", so validateFreshness(now) would pass — but the data is stale.
      const odds = normalizer.normalizeOdds([staleEvent], new Date());
      expect(normalizer.validateFreshness(new Date())).toBe(true);
      expect(normalizer.validateOddsFreshness(odds)).toBe(false);
    });

    it("is vacuously fresh for an empty odds set", () => {
      expect(normalizer.validateOddsFreshness([])).toBe(true);
    });

    it("fails safe when odds exist but carry no parseable upstream timestamp", () => {
      const odds = normalizer.normalizeOdds([mockEvent], new Date());
      const corrupted = odds.map((o) => ({ ...o, bookmakerLastUpdate: new Date("not-a-date") }));
      expect(normalizer.validateOddsFreshness(corrupted)).toBe(false);
    });

    it("falls back to the market-level last_update when the bookmaker-level one is missing", () => {
      // Real payloads have arrived WITHOUT bookmaker.last_update. Without the
      // market-level fallback every row parsed as Invalid Date, every game was
      // dropped as "not provably fresh", and a LIVE slate failed wholesale with
      // "Upstream odds are stale".
      const noBookmakerTimestamp = {
        ...mockEvent,
        id: "no-bk-ts",
        bookmakers: mockEvent.bookmakers.map((b) => {
          const { last_update: _dropped, ...rest } = b;
          return rest; // markets keep their own fresh last_update
        }),
      };
      const odds = normalizer.normalizeOdds([noBookmakerTimestamp], new Date());
      expect(odds.length).toBeGreaterThan(0);
      for (const o of odds) {
        expect(Number.isFinite(o.bookmakerLastUpdate.getTime())).toBe(true);
      }
      expect(normalizer.validateOddsFreshness(odds)).toBe(true);
      expect(normalizer.freshGameIds(odds).has("no-bk-ts")).toBe(true);
    });

    it("freshnessDiagnostics reports threshold, counts, unparseable rows, and newest age", () => {
      const odds = normalizer.normalizeOdds([mockEvent], new Date());
      const d = normalizer.freshnessDiagnostics(odds);
      expect(d.thresholdHours).toBeGreaterThan(0);
      expect(d.rows).toBe(odds.length);
      expect(d.games).toBe(1);
      expect(d.unparseableRows).toBe(0);
      expect(d.newestAgeMinutes).not.toBeNull();
      expect(d.newestAgeMinutes as number).toBeLessThanOrEqual(1);

      const corrupted = odds.map((o) => ({ ...o, bookmakerLastUpdate: new Date("not-a-date") }));
      const dc = normalizer.freshnessDiagnostics(corrupted);
      expect(dc.unparseableRows).toBe(corrupted.length);
      expect(dc.newestAgeMinutes).toBeNull();
    });

    it("decides freshness PER GAME — a fresh game cannot mask a stale one", () => {
      const now = Date.now();
      const fresh = normalizer.normalizeOdds([{ ...mockEvent, id: "fresh-game" }], new Date());
      const staleEvent = {
        ...mockEvent,
        id: "stale-game",
        bookmakers: mockEvent.bookmakers.map((b) => ({
          ...b,
          last_update: new Date(now - 5 * 60 * 60 * 1000).toISOString(), // 5h old (past 4h gate)
        })),
      };
      const stale = normalizer.normalizeOdds([staleEvent], new Date());

      const freshIds = normalizer.freshGameIds([...fresh, ...stale]);
      expect(freshIds.has("fresh-game")).toBe(true);
      expect(freshIds.has("stale-game")).toBe(false); // would have leaked under a global max
      // The feed is still "live" overall (>=1 fresh game), so the job is not failed wholesale.
      expect(normalizer.validateOddsFreshness([...fresh, ...stale])).toBe(true);
    });
  });

  describe("normalizeScores", () => {
    it("normalizes completed scores correctly", () => {
      const scores = normalizer.normalizeScores([
        {
          id: "event-123",
          sport_key: "americanfootball_nfl",
          sport_title: "NFL",
          commence_time: "2026-04-10T18:00:00Z",
          completed: true,
          home_team: "Kansas City Chiefs",
          away_team: "Philadelphia Eagles",
          scores: [
            { name: "Kansas City Chiefs", score: "27" },
            { name: "Philadelphia Eagles", score: "24" },
          ],
          last_update: new Date().toISOString(),
        },
      ]);

      expect(scores).toHaveLength(1);
      const score = scores[0]!;
      expect(score.externalId).toBe("event-123");
      expect(score.homeScore).toBe(27);
      expect(score.awayScore).toBe(24);
      expect(score.completed).toBe(true);
    });

    it("handles null scores gracefully", () => {
      const scores = normalizer.normalizeScores([
        {
          id: "event-456",
          sport_key: "americanfootball_nfl",
          sport_title: "NFL",
          commence_time: "2026-04-10T18:00:00Z",
          completed: false,
          home_team: "Team A",
          away_team: "Team B",
          scores: null,
          last_update: null,
        },
      ]);

      expect(scores[0]!.homeScore).toBeNull();
      expect(scores[0]!.awayScore).toBeNull();
    });
  });
});
