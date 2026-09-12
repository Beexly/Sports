import { db } from "@sports/db";
import { buildBestLines, type BestLines } from "@/lib/market/best-line";
import { groupGame, type SlateGame } from "@/lib/slate/slate";
import type { BoardStateRow } from "@/lib/board/state";

/**
 * Game detail — one fixture's identity, market lines, and our readings.
 *
 * Composition, not a new evaluation: the game row (teams, commence, status,
 * scores) and the latest captured odds come from the database; the readings
 * are the caller's already-entitled board rows filtered to this gameId. This
 * loader never touches GateDecision/Pick tables, so it cannot leak a lane
 * the caller was not entitled to see.
 *
 * Lines follow the line-shop contract: best available price per side across
 * captured books, at least two books with a usable price, otherwise `best`
 * is null and the page says plainly that no multi-book line is captured —
 * never a padded or modeled line.
 */

export interface GameDetail {
  readonly gameId: string;
  readonly matchup: string;
  readonly sport: string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly commenceTime: string;
  readonly status: string;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
  readonly game: SlateGame | null;
  /** Best captured lines, or null when no multi-book quote exists. */
  readonly best: BestLines | null;
  readonly generatedAt: string;
}

export interface GamesMeta {
  readonly commenceTime: string | null;
  readonly status: string | null;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
}

/**
 * Batch game metadata for slate lists. One query for many ids; unknown ids
 * are simply absent from the map and the caller renders those games without
 * kickoff context rather than guessing it.
 */
export async function loadGamesMeta(
  gameIds: readonly string[],
): Promise<ReadonlyMap<string, GamesMeta>> {
  const out = new Map<string, GamesMeta>();
  const ids = [...new Set(gameIds)].filter(Boolean);
  if (ids.length === 0) return out;
  const games = await db.game
    .findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        commenceTime: true,
        status: true,
        homeScore: true,
        awayScore: true,
      },
    })
    .catch(() => []);
  for (const g of games) {
    out.set(g.id, {
      commenceTime: g.commenceTime?.toISOString() ?? null,
      status: String(g.status),
      homeScore: g.homeScore,
      awayScore: g.awayScore,
    });
  }
  return out;
}

export async function loadGameDetail(
  gameId: string,
  readings: readonly BoardStateRow[],
  now = new Date(),
): Promise<GameDetail | null> {
  if (!gameId) return null;
  const game = await db.game
    .findUnique({
      where: { id: gameId },
      include: {
        sport: { select: { name: true } },
        odds: { orderBy: { fetchedAt: "desc" }, take: 150 },
      },
    })
    .catch(() => null);
  if (!game) return null;

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
  );
  const hasAnyPrice =
    Boolean(best.moneyline.home || best.moneyline.away) ||
    Boolean(best.spread.home || best.spread.away) ||
    Boolean(best.total.over || best.total.under);

  return {
    gameId: game.id,
    matchup: `${game.awayTeamName} @ ${game.homeTeamName}`,
    sport: game.sport?.name ?? "—",
    homeTeamName: game.homeTeamName,
    awayTeamName: game.awayTeamName,
    commenceTime: game.commenceTime.toISOString(),
    status: String(game.status),
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    game: groupGame(gameId, readings.filter((r) => r.gameId === gameId)),
    best: best.bookCount >= 2 && hasAnyPrice ? best : null,
    generatedAt: now.toISOString(),
  };
}
