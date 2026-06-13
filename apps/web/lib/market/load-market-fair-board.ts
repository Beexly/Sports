import { db } from "@sports/db";
import { buildH2hMarketRead, type GameMarketRead } from "./game-market-read";

/**
 * Market Fair Board loader — upcoming games with a real multi-book no-vig
 * consensus. Renders only from captured odds rows; games without at least
 * two two-sided quotes are omitted rather than padded. Honest empty state
 * is the caller's job.
 */

export interface MarketFairRow {
  readonly gameId: string;
  readonly sport: string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly commenceTime: string;
  readonly read: GameMarketRead;
}

export interface MarketFairBoard {
  readonly generatedAt: string;
  readonly rows: readonly MarketFairRow[];
}

const HORIZON_HOURS = 96;
const MAX_GAMES = 12;

export async function loadMarketFairBoard(now = new Date()): Promise<MarketFairBoard> {
  const horizon = new Date(now.getTime() + HORIZON_HOURS * 60 * 60 * 1000);

  const games = await db.game
    .findMany({
      where: { commenceTime: { gte: now, lte: horizon }, status: "SCHEDULED" },
      include: {
        sport: { select: { name: true } },
        odds: {
          where: { market: "H2H" },
          orderBy: { fetchedAt: "desc" },
          take: 60, // bounded: latest rows; builder dedupes per book
        },
      },
      orderBy: { commenceTime: "asc" },
      take: 40,
    })
    .catch(() => []);

  const rows: MarketFairRow[] = [];
  for (const game of games) {
    const read = buildH2hMarketRead(
      (game.odds ?? []).map((o) => ({
        bookmaker: o.bookmaker,
        market: String(o.market),
        fetchedAt: o.fetchedAt,
        homePrice: o.homePrice,
        awayPrice: o.awayPrice,
        drawPrice: o.drawPrice,
      })),
    );
    if (!read) continue;
    rows.push({
      gameId: game.id,
      sport: game.sport?.name ?? "—",
      homeTeamName: game.homeTeamName,
      awayTeamName: game.awayTeamName,
      commenceTime: game.commenceTime.toISOString(),
      read,
    });
    if (rows.length >= MAX_GAMES) break;
  }

  return { generatedAt: now.toISOString(), rows };
}
