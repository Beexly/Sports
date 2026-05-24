import { describe, it, expect } from "vitest";
import { DataNormalizer } from "../normalizer";
import { OddsApiError } from "../odds-api-client";
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

    it("returns empty array for event with no bookmakers", () => {
      const noBooks: OddsApiEvent = { ...mockEvent, bookmakers: [] };
      const odds = normalizer.normalizeOdds([noBooks], new Date());
      expect(odds).toHaveLength(0);
    });

    it("throws on unknown market key", () => {
      const badMarket: OddsApiEvent = {
        ...mockEvent,
        bookmakers: [
          {
            key: "fanduel",
            title: "FanDuel",
            last_update: new Date().toISOString(),
            markets: [{ key: "unknown_market", last_update: "", outcomes: [] }],
          },
        ],
      };
      expect(() => normalizer.normalizeOdds([badMarket], new Date())).toThrow(
        "Unknown market key: unknown_market"
      );
    });

    it("includes draw price for H2H markets that have a Draw outcome", () => {
      const soccerEvent: OddsApiEvent = {
        ...mockEvent,
        sport_key: "soccer_usa_mls",
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
                  { name: "Kansas City Chiefs", price: -110 },
                  { name: "Philadelphia Eagles", price: 200 },
                  { name: "Draw", price: 280 },
                ],
              },
            ],
          },
        ],
      };
      const odds = normalizer.normalizeOdds([soccerEvent], new Date());
      const h2h = odds.find((o) => o.market === "H2H");
      expect(h2h?.drawPrice).toBe(280);
    });

    it("produces one row per bookmaker per market", () => {
      const twoBookEvent: OddsApiEvent = {
        ...mockEvent,
        bookmakers: [
          {
            key: "fanduel",
            title: "FanDuel",
            last_update: new Date().toISOString(),
            markets: [{ key: "h2h", last_update: "", outcomes: [] }],
          },
          {
            key: "draftkings",
            title: "DraftKings",
            last_update: new Date().toISOString(),
            markets: [{ key: "h2h", last_update: "", outcomes: [] }],
          },
        ],
      };
      const odds = normalizer.normalizeOdds([twoBookEvent], new Date());
      const books = new Set(odds.map((o) => o.bookmaker));
      expect(books.has("fanduel")).toBe(true);
      expect(books.has("draftkings")).toBe(true);
      expect(odds).toHaveLength(2);
    });
  });

  describe("validateFreshness", () => {
    it("returns true for fresh data", () => {
      const now = new Date();
      expect(normalizer.validateFreshness(now)).toBe(true);
    });

    it("returns false for stale data (> 1 hour old)", () => {
      const staleDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      expect(normalizer.validateFreshness(staleDate)).toBe(false);
    });

    it("returns true for data just under the threshold", () => {
      const slightlyOld = new Date(Date.now() - 59 * 60 * 1000); // 59 min ago
      expect(normalizer.validateFreshness(slightlyOld)).toBe(true);
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

describe("OddsApiError", () => {
  it("has name='OddsApiError' (not plain 'Error')", () => {
    const err = new OddsApiError("something went wrong");
    expect(err.name).toBe("OddsApiError");
  });

  it("is instanceof Error", () => {
    const err = new OddsApiError("something went wrong");
    expect(err).toBeInstanceOf(Error);
  });

  it("carries message on the standard Error message field", () => {
    const err = new OddsApiError("quota exceeded");
    expect(err.message).toBe("quota exceeded");
  });

  it("carries optional status property when provided", () => {
    const err = new OddsApiError("not found", 404);
    expect(err.status).toBe(404);
  });

  it("status is undefined when not provided", () => {
    const err = new OddsApiError("network failure");
    expect(err.status).toBeUndefined();
  });

  it("carries optional remainingRequests property", () => {
    const err = new OddsApiError("rate limited", 429, 0);
    expect(err.remainingRequests).toBe(0);
  });

  it("remainingRequests is undefined when not provided", () => {
    const err = new OddsApiError("server error", 500);
    expect(err.remainingRequests).toBeUndefined();
  });

  it("can be caught as an Error in a try/catch", () => {
    expect(() => {
      throw new OddsApiError("test", 500, 100);
    }).toThrow("test");
  });
});
