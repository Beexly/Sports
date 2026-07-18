import { db } from "@sports/db";
import { buildBestLines, type BestLines } from "./best-line";

/**
 * Line Shop Board loader — upcoming games with the best AVAILABLE price/line for
 * each side across captured books. Sibling to load-market-fair-board.ts: that
 * builds the no-vig consensus (what the market thinks); this finds where to get
 * the best of it. Renders only from real captured odds; games without a real
 * multi-book quote are omitted, not padded.
 */

export interface LineShopRow {
  readonly gameId: string;
  readonly sport: string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly commenceTime: string;
  readonly best: BestLines;
}

export interface LineShopBoard {
  readonly generatedAt: string;
  readonly rows: readonly LineShopRow[];
}

const HORIZON_HOURS = 96;
const MAX_GAMES = 12;

export async function loadLineShopBoard(now = new Date()): Promise<LineShopBoard> {
  const horizon = new Date(now.getTime() + HORIZON_HOURS * 60 * 60 * 1000);

  const games = await db.game
    .findMany({
      where: { commenceTime: { gte: now, lte: horizon }, status: "SCHEDULED" },
      include: {
        sport: { select: { name: true } },
        odds: {
          orderBy: { fetchedAt: "desc" },
          take: 150, // all markets × books; builder dedupes to latest per book/market
        },
      },
      orderBy: { commenceTime: "asc" },
      take: 40,
    })
    .catch(() => []);

  const rows: LineShopRow[] = [];
  for (const game of games) {
    const best = buildBestLines(
      (game.odds ?? []).map((o) => ({
        bookmaker: o.bookmaker,
        market: String(o.market),
        fetchedAt: o.fetchedAt,
        homePrice: o.homePrice,
        awayPrice: o.awayPrice,
        spread: o.spread,
        homeSpreadPrice: o.homeSpreadPrice,
        awaySpreadPrice: o.awaySpreadPrice,
        total: o.total,
        overPrice: o.overPrice,
        underPrice: o.underPrice,
      })),
      game.sport?.name ?? "",
    );

    // A real shop needs at least two books, and at least one usable price.
    const hasAnyPrice =
      Boolean(best.moneyline.home || best.moneyline.away) ||
      Boolean(best.spread.home || best.spread.away) ||
      Boolean(best.total.over || best.total.under);
    if (best.bookCount < 2 || !hasAnyPrice) continue;

    rows.push({
      gameId: game.id,
      sport: game.sport?.name ?? "—",
      homeTeamName: game.homeTeamName,
      awayTeamName: game.awayTeamName,
      commenceTime: game.commenceTime.toISOString(),
      best,
    });
    if (rows.length >= MAX_GAMES) break;
  }

  return { generatedAt: now.toISOString(), rows };
}
