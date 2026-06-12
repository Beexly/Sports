/**
 * Line Room loader — pulls upcoming games with their latest stored
 * per-bookmaker odds and builds comparison boards. Server-only.
 * Honest empty states: stub mode or no rows → empty board, no fakes.
 */

import { db, isStubMode } from "@sports/db";
import {
  buildMarketBoard,
  findArbitrage,
  findEdges,
  type BoardMarket,
  type BookLine,
  type ArbOpportunity,
  type EdgeFlag,
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

export interface GameEdge extends EdgeFlag {
  readonly matchup: string;
  readonly market: BoardMarket;
  readonly sideLabel: string;
}

export interface GameArb extends ArbOpportunity {
  readonly matchup: string;
  readonly market: BoardMarket;
}

export interface LineRoomData {
  readonly games: readonly GameBoard[];
  /** Positive-EV prices vs the no-vig consensus, hardest edges first. */
  readonly topEdges: readonly GameEdge[];
  /** Cross-book guaranteed-margin pairs (rare; usually books re-price fast). */
  readonly arbs: readonly GameArb[];
  readonly bookCount: number;
  readonly generatedAt: string;
}

const MARKETS: readonly BoardMarket[] = ["H2H", "SPREADS", "TOTALS"];
const LOOKAHEAD_H = 72;

export async function loadLineRoom(): Promise<LineRoomData> {
  const generatedAt = new Date().toISOString();
  if (isStubMode()) return { games: [], topEdges: [], arbs: [], bookCount: 0, generatedAt };

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

  const withMarkets = boards.filter((b) => b.markets.length > 0);

  const topEdges: GameEdge[] = withMarkets
    .flatMap((g) =>
      g.markets.flatMap((m) =>
        findEdges(m).map((e) => ({
          ...e,
          matchup: `${g.awayTeam} @ ${g.homeTeam}`,
          market: m.market,
          sideLabel:
            m.market === "TOTALS"
              ? e.side === "HOME"
                ? `Over ${e.line ?? ""}`.trim()
                : `Under ${e.line ?? ""}`.trim()
              : e.side === "HOME"
                ? g.homeTeam
                : g.awayTeam,
        }))
      )
    )
    .sort((a, b) => b.evPerUnit - a.evPerUnit)
    .slice(0, 10);

  const arbs: GameArb[] = withMarkets
    .flatMap((g) =>
      g.markets.flatMap((m) => {
        const arb = findArbitrage(m);
        return arb ? [{ ...arb, matchup: `${g.awayTeam} @ ${g.homeTeam}`, market: m.market }] : [];
      })
    )
    .sort((a, b) => b.profitPct - a.profitPct);

  return {
    games: withMarkets,
    topEdges,
    arbs,
    bookCount: allBooks.size,
    generatedAt,
  };
}
