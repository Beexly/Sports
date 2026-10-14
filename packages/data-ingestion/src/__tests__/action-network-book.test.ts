import { describe, it, expect, vi } from "vitest";
import {
  ActionNetworkSecondBook,
  createActionNetworkSecondBook,
} from "../action-network-book.js";

const mockScoreboard = {
  games: [
    {
      id: 12345,
      away_team_id: 10,
      home_team_id: 20,
      teams: [
        { id: 10, abbr: "LAR", full_name: "Los Angeles Rams" },
        { id: 20, abbr: "BUF", full_name: "Buffalo Bills" },
      ],
      odds: [
        {
          book_id: 68, // Caesars
          ml_home: -180,
          ml_away: 155,
          spread_home: -3.5,
          spread_home_line: -110,
          spread_away: 3.5,
          spread_away_line: -110,
          total: 54.5,
          over: -112,
          under: -108,
          inserted: "2026-10-13T12:00:00Z",
        },
        {
          book_id: 15, // DraftKings
          ml_home: -185,
          ml_away: 154,
          spread_home: -3.5,
          spread_home_line: -112,
          spread_away: 3.5,
          spread_away_line: -108,
          total: 55.0,
          over: -110,
          under: -110,
        },
      ],
    },
  ],
};

describe("ActionNetworkSecondBook", () => {
  it("attaches Caesars as preferred second book for a matching NFL game", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockScoreboard,
    });

    const secondBook = createActionNetworkSecondBook({
      fetchImpl: mockFetch as any,
    });

    const book = await secondBook.bookmakerFor({
      sportKey: "americanfootball_nfl",
      commenceTime: "2026-10-13T00:15:00Z",
      homeAbbr: "BUF",
      awayAbbr: "LAR",
      homeTeam: "Buffalo Bills",
      awayTeam: "Los Angeles Rams",
    });

    expect(book).not.toBeNull();
    expect(book?.key).toBe("action_network_68");
    expect(book?.title).toBe("Caesars (Action Network)");

    const h2h = book?.markets.find((m) => m.key === "h2h");
    expect(h2h).toBeDefined();
    expect(h2h?.outcomes).toEqual([
      { name: "Buffalo Bills", price: -180 },
      { name: "Los Angeles Rams", price: 155 },
    ]);

    const spreads = book?.markets.find((m) => m.key === "spreads");
    expect(spreads).toBeDefined();
    expect(spreads?.outcomes).toEqual([
      { name: "Buffalo Bills", price: -110, point: -3.5 },
      { name: "Los Angeles Rams", price: -110, point: 3.5 },
    ]);

    const totals = book?.markets.find((m) => m.key === "totals");
    expect(totals).toBeDefined();
    expect(totals?.outcomes).toEqual([
      { name: "Over", price: -112, point: 54.5 },
      { name: "Under", price: -108, point: 54.5 },
    ]);
  });

  it("caches the scoreboard across game lookups within the same cycle", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockScoreboard,
    });

    const secondBook = createActionNetworkSecondBook({
      fetchImpl: mockFetch as any,
    });

    await secondBook.bookmakerFor({
      sportKey: "americanfootball_nfl",
      commenceTime: "2026-10-13T00:15:00Z",
      homeAbbr: "BUF",
      awayAbbr: "LAR",
      homeTeam: "Buffalo Bills",
      awayTeam: "Los Angeles Rams",
    });

    await secondBook.bookmakerFor({
      sportKey: "americanfootball_nfl",
      commenceTime: "2026-10-13T00:15:00Z",
      homeAbbr: "BUF",
      awayAbbr: "LAR",
      homeTeam: "Buffalo Bills",
      awayTeam: "Los Angeles Rams",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns null safely when game is not found on the scoreboard", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockScoreboard,
    });

    const secondBook = createActionNetworkSecondBook({
      fetchImpl: mockFetch as any,
    });

    const book = await secondBook.bookmakerFor({
      sportKey: "americanfootball_nfl",
      commenceTime: "2026-10-13T00:15:00Z",
      homeAbbr: "KC",
      awayAbbr: "DEN",
      homeTeam: "Kansas City Chiefs",
      awayTeam: "Denver Broncos",
    });

    expect(book).toBeNull();
  });
});
