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
