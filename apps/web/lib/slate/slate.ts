import type { BoardStateRow } from "@/lib/board/state";

/**
 * League slate grouping — pure projection over board rows.
 *
 * Takes the board's flat reading rows (every lane: scoring, cleared, held)
 * and groups them into leagues → games. No I/O, no entitlement logic, no
 * copy: the route layer adds league metadata (display names, season windows)
 * and honest zero-states for leagues with no rows.
 *
 * Identity is the board's own gameId. A game with readings in several lanes
 * appears once with every reading attached; each reading keeps its own
 * status so the game page can show cleared and held side by side.
 */

export interface SlateGame {
  readonly gameId: string;
  readonly matchup: string;
  readonly sport: string;
  /** Distinct markets with readings, in first-seen order. */
  readonly markets: readonly string[];
  /** Every reading on this game, all lanes. */
  readonly readings: readonly BoardStateRow[];
  /** Newest reading timestamp, for "as of" display. */
  readonly updatedAt: string;
  /** Max finite edgeIndex across readings, or null when none scored. */
  readonly bestEdge: number | null;
  readonly clearedCount: number;
  readonly heldCount: number;
  readonly scoringCount: number;
}

export interface SlateLeague {
  readonly sport: string;
  readonly games: readonly SlateGame[];
  readonly readingCount: number;
  readonly clearedCount: number;
  readonly heldCount: number;
}

function isHeld(status: BoardStateRow["status"]): boolean {
  return status === "GATED_TODAY";
}

export function groupGame(
  gameId: string,
  rows: readonly BoardStateRow[],
): SlateGame | null {
  const mine = rows.filter((r) => r.gameId === gameId);
  if (mine.length === 0) return null;
  const first = mine[0]!;
  const markets: string[] = [];
  for (const r of mine) {
    if (!markets.includes(r.market)) markets.push(r.market);
  }
  let bestEdge: number | null = null;
  for (const r of mine) {
    if (typeof r.edgeIndex === "number" && Number.isFinite(r.edgeIndex)) {
      if (bestEdge === null || r.edgeIndex > bestEdge) bestEdge = r.edgeIndex;
    }
  }
  const updatedAt = mine.map((r) => r.updatedAt).sort().at(-1) ?? first.updatedAt;
  return {
    gameId,
    matchup: first.matchup,
    sport: first.sport,
    markets,
    readings: mine,
    updatedAt,
    bestEdge,
    clearedCount: mine.filter((r) => r.status === "PUBLISHED_TODAY").length,
    heldCount: mine.filter((r) => isHeld(r.status)).length,
    scoringCount: mine.filter((r) => r.status === "SCORING_NOW").length,
  };
}

/** Group flat board rows into leagues, each holding its games. */
export function buildSlate(rows: readonly BoardStateRow[]): SlateLeague[] {
  const byGame = new Map<string, BoardStateRow[]>();
  for (const r of rows) {
    const list = byGame.get(r.gameId);
    if (list) list.push(r);
    else byGame.set(r.gameId, [r]);
  }
  const bySport = new Map<string, SlateGame[]>();
  for (const [gameId, gameRows] of byGame) {
    const game = groupGame(gameId, gameRows);
    if (!game) continue;
    const list = bySport.get(game.sport);
    if (list) list.push(game);
    else bySport.set(game.sport, [game]);
  }
  const leagues: SlateLeague[] = [];
  for (const [sport, games] of bySport) {
    const ordered = [...games].sort((a, b) => {
      if (a.bestEdge === null && b.bestEdge === null) return a.matchup.localeCompare(b.matchup);
      if (a.bestEdge === null) return 1;
      if (b.bestEdge === null) return -1;
      return b.bestEdge - a.bestEdge;
    });
    const readings = ordered.flatMap((g) => g.readings);
    leagues.push({
      sport,
      games: ordered,
      readingCount: readings.length,
      clearedCount: readings.filter((r) => r.status === "PUBLISHED_TODAY").length,
      heldCount: readings.filter((r) => isHeld(r.status)).length,
    });
  }
  return leagues.sort((a, b) => a.sport.localeCompare(b.sport));
}
