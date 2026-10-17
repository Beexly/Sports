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
          book_id: 68, // DraftKings NJ [draftkings] — verified 2026-10-13
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
          book_id: 15, // Consensus — SYNTHETIC, not a bookmaker
          ml_home: -175,
          ml_away: 150,
          spread_home: -3.0,
          spread_home_line: -110,
          spread_away: 3.0,
          spread_away_line: -110,
          total: 54.0,
          over: -110,
          under: -110,
        },
      ],
    },
  ],
};

describe("ActionNetworkSecondBook", () => {
  it("attaches DraftKings as second book for a matching NFL game", async () => {
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
    expect(book?.title).toBe("DraftKings (Action Network)");

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

  // --- Regression coverage for the 2026-10-13 book-id correction ---
  // These would have failed against the old (wrong) map, which labelled
  // 15 as DraftKings and 30 as FanDuel when both are synthetic aggregates.

  const gameWithBooks = (odds: unknown[]) => ({
    games: [
      {
        id: 999,
        away_team_id: 10,
        home_team_id: 20,
        teams: [
          { id: 10, abbr: "LAR", full_name: "Los Angeles Rams" },
          { id: 20, abbr: "BUF", full_name: "Buffalo Bills" },
        ],
        odds,
      },
    ],
  });

  const row = (book_id: number, ml_home: number, ml_away: number) => ({
    book_id,
    ml_home,
    ml_away,
    spread_home: -3.5,
    spread_home_line: -110,
    spread_away: 3.5,
    spread_away_line: -110,
    total: 54.5,
    over: -112,
    under: -108,
  });

  const bufGame = {
    sportKey: "americanfootball_nfl",
    commenceTime: "2026-10-13T00:15:00Z",
    homeAbbr: "BUF",
    awayAbbr: "LAR",
    homeTeam: "Buffalo Bills",
    awayTeam: "Los Angeles Rams",
  };

  it("labels 68 as DraftKings and 69 as FanDuel (verified map)", async () => {
    const sb = createActionNetworkSecondBook({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => gameWithBooks([row(69, -190, 160)]),
      }) as any,
    });
    const book = await sb.bookmakerFor(bufGame);
    expect(book?.key).toBe("action_network_69");
    expect(book?.title).toBe("FanDuel (Action Network)");
  });

  it("prefers a genuinely independent book over the DraftKings relay", async () => {
    // BetRivers (71) and DraftKings (68) both present. DraftKings is what
    // ESPN already relays on the primary path, so BetRivers must win.
    const sb = createActionNetworkSecondBook({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => gameWithBooks([row(68, -180, 155), row(71, -170, 145)]),
      }) as any,
    });
    const book = await sb.bookmakerFor(bufGame);
    expect(book?.key).toBe("action_network_71");
    expect(book?.title).toBe("BetRivers (Action Network)");
    // and it must carry BetRivers' prices, not DraftKings'
    const h2h = book?.markets.find((m) => m.key === "h2h");
    expect(h2h?.outcomes).toEqual([
      { name: "Buffalo Bills", price: -170 },
      { name: "Los Angeles Rams", price: 145 },
    ]);
  });

  it("refuses a synthetic Consensus/Open row as the second book", async () => {
    // Only synthetic rows present -> fail closed rather than hand back an
    // aggregate dressed up as a second independent bookmaker.
    const sb = createActionNetworkSecondBook({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => gameWithBooks([row(15, -175, 150), row(30, -172, 148)]),
      }) as any,
    });
    const book = await sb.bookmakerFor(bufGame);
    expect(book).toBeNull();
  });

  it("keeps DraftKings as a last-resort fallback when no independent book exists", async () => {
    const sb = createActionNetworkSecondBook({
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => gameWithBooks([row(15, -175, 150), row(68, -180, 155)]),
      }) as any,
    });
    const book = await sb.bookmakerFor(bufGame);
    expect(book?.key).toBe("action_network_68");
    expect(book?.title).toBe("DraftKings (Action Network)");
  });
});
