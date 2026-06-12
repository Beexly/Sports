/**
 * Line Room loader — pulls upcoming games with their latest stored
 * per-bookmaker odds and builds comparison boards. Server-only.
 * Honest empty states: stub mode or no rows → empty board, no fakes.
 */

import { db, isStubMode } from "@sports/db";
import {
  buildMarketBoard,
  type BoardMarket,
  type BookLine,
  type MarketBoard,
} from "./comparison";

export interface GameBoard {
  readonly gameId: string;
  readonly sport: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly commenceTime: string;
  readonly markets: readonly MarketBoard[];
  readonly lastFetchedAt: string | null;
}

export interface LineRoomData {
  readonly games: readonly GameBoard[];
  readonly bookCount: number;
  readonly generatedAt: string;
}

const MARKETS: readonly BoardMarket[] = ["H2H", "SPREADS", "TOTALS"];
const LOOKAHEAD_H = 72;

export async function loadLineRoom(): Promise<LineRoomData> {
  const generatedAt = new Date().toISOString();
  if (isStubMode()) return { games: [], bookCount: 0, generatedAt };

  const now = new Date();
  const games = await db.game
    .findMany({
      where: {
        commenceTime: {
          gte: now,
          lte: new Date(now.getTime() + LOOKAHEAD_H * 3600_000),
        },
        odds: { some: {} },
      },
      include: {
        sport: { select: { name: true } },
        odds: { orderBy: { fetchedAt: "desc" }, take: 200 },
      },
      orderBy: { commenceTime: "asc" },
      take: 40,
    })
    .catch(() => []);

  const allBooks = new Set<string>();
  const boards: GameBoard[] = games.map((g) => {
    const rows: BookLine[] = g.odds.map((o) => ({
      bookmaker: o.bookmaker,
      market: o.market as BoardMarket,
      homePrice: o.homePrice,
      awayPrice: o.awayPrice,
      spread: o.spread,
      homeSpreadPrice: o.homeSpreadPrice,
      awaySpreadPrice: o.awaySpreadPrice,
      total: o.total,
      overPrice: o.overPrice,
      underPrice: o.underPrice,
      fetchedAt: o.fetchedAt.toISOString(),
    }));
    for (const r of rows) allBooks.add(r.bookmaker);
    const markets = MARKETS.map((m) => buildMarketBoard(m, rows)).filter(
      (b) => b.bookCount > 0
    );
    return {
      gameId: g.id,
      sport: g.sport.name,
      homeTeam: g.homeTeamName,
      awayTeam: g.awayTeamName,
      commenceTime: g.commenceTime.toISOString(),
      markets,
      lastFetchedAt: rows.length > 0 ? rows.map((r) => r.fetchedAt).sort().pop()! : null,
    };
  });

  return {
    games: boards.filter((b) => b.markets.length > 0),
    bookCount: allBooks.size,
    generatedAt,
  };
}
