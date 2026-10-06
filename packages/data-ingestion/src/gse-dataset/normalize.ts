/**
 * Stage A / step 2 -- normalize the raw nflverse game master to a documented
 * schema.
 *
 * Design rules, all of them downstream of the repo's honesty doctrine:
 *
 *  - NOTHING IS INVENTED. A field the asset does not publish stays `null`.
 *    In particular nflverse publishes `gametime` as a bare Eastern-local
 *    `HH:MM` string with NO timezone, so this schema carries
 *    `game_time_local` and deliberately does NOT derive a UTC instant. A
 *    fabricated offset would silently shift every kickoff by hours.
 *  - OUTCOMES ARE DERIVED, NOT ASSUMED. `margin`, `total_points`, and
 *    `home_win` are computed from the two published scores, and a game with a
 *    missing score is marked `settled: false` and left `null` rather than
 *    defaulted to 0.
 *  - UNPARSEABLE ROWS ARE REJECTED AND COUNTED, never silently dropped. The
 *    caller receives {@link NormalizeStats} and is expected to log them.
 *
 * The nflverse `game_type` column is the dataset's phase column: `REG` is the
 * regular season and `WC`/`DIV`/`CON`/`SB` are the playoff rounds. Both are
 * preserved -- `season_phase` for the coarse split, `game_type` for the round.
 */

import { parseCsv } from "../nflverse-source.js";
import { GSE_GAMES_COLUMNS } from "./fetch-games.js";

/** Coarse season phase: regular season vs the postseason tournament. */
export type SeasonPhase = "REG" | "POST";

/** Playoff round as published in the source `game_type` column. */
export type GameType = "REG" | "WC" | "DIV" | "CON" | "SB";

const GAME_TYPES: ReadonlySet<string> = new Set<GameType>(["REG", "WC", "DIV", "CON", "SB"]);
const POST_GAME_TYPES: ReadonlySet<string> = new Set<GameType>(["WC", "DIV", "CON", "SB"]);

/**
 * One normalized game. Field-by-field provenance is in
 * `gse-dataset/README.md`; every field is either a renamed source column, a
 * documented derivation from source columns, or `null`.
 */
export type NormalizedGame = {
  /** Source `game_id`; the stable primary key for every later stage. */
  readonly game_id: string;
  /** Source `season`. */
  readonly season: number;
  /** Derived: `REG` when `game_type === "REG"`, else `POST`. */
  readonly season_phase: SeasonPhase;
  /** Source `game_type` (playoff round, or `REG`). */
  readonly game_type: GameType;
  /** Source `week` (1-18; postseason weeks continue the regular-season count). */
  readonly week: number;
  /** Source `gameday`, ISO `YYYY-MM-DD`. */
  readonly gameday: string;
  /** Source `gametime`, `HH:MM` Eastern-local. Null when the asset omits it. NO tz. */
  readonly game_time_local: string | null;
  /** Source `away_team`. */
  readonly away_team: string;
  /** Source `home_team`. */
  readonly home_team: string;
  readonly away_score: number | null;
  readonly home_score: number | null;
  /** Derived: `home_score - away_score`. Positive means the home team won. */
  readonly margin: number | null;
  /** Derived: `home_score + away_score`. */
  readonly total_points: number | null;
  /** Derived from `margin`; null while unsettled. Ties (rare) are `false`. */
  readonly home_win: boolean | null;
  /** True only when BOTH scores are present and finite. */
  readonly settled: boolean;
  /** Source `overtime` (1/0). */
  readonly overtime: boolean;
  /** Derived: source `location` is anything other than `Home`. */
  readonly neutral_site: boolean;
  /** Source `rest` columns: days since each team's previous game. */
  readonly rest_away: number | null;
  readonly rest_home: number | null;
  /** Derived: `rest_home - rest_away`. Positive means home had more rest. */
  readonly rest_diff: number | null;
  /**
   * Raw market lines carried through UNVETTED. They are whatever the schedule
   * asset published (consensus of some vintage), are NOT de-vigged, and are
   * NOT an approved model input -- wiring the market path into scoring is a
   * founder-gated step. Present so the feature stage can see them; treated as
   * opaque context.
   */
  readonly spread_line: number | null;
  readonly total_line: number | null;
  readonly away_moneyline: number | null;
  readonly home_moneyline: number | null;
  /** Source `div_game` (1/0). */
  readonly is_divisional: boolean;
  /** Source `roof`, trimmed + lowercased. */
  readonly roof: string | null;
  /** Derived from `roof`: true for `dome` and `closed`. */
  readonly is_dome: boolean;
  /** Source `surface`, trimmed + lowercased (the asset has ragged trailing spaces). */
  readonly surface: string | null;
  readonly referee: string | null;
};

/** Counts of what came IN and what was rejected, so nothing disappears silently. */
export type NormalizeStats = {
  /** Total data rows in the CSV (header excluded). */
  readonly inputRows: number;
  /** Rows that produced a {@link NormalizedGame}. */
  readonly keptRows: number;
  /** Rows rejected, with the reason. An empty map means nothing was dropped. */
  readonly rejected: ReadonlyMap<string, number>;
  /** Kept rows whose both scores are present. */
  readonly settledRows: number;
  /** Kept rows that are unsettled (scheduled but not yet played). */
  readonly unsettledRows: number;
  /** Kept rows per season, ascending. */
  readonly rowsPerSeason: ReadonlyMap<number, number>;
  /** Kept rows per `game_type`, ascending by key. */
  readonly rowsPerGameType: ReadonlyMap<string, number>;
};

export type NormalizedDataset = {
  readonly games: readonly NormalizedGame[];
  readonly stats: NormalizeStats;
};

export class NormalizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NormalizeError";
  }
}

/** Parse a raw field to a finite number, or null when absent/unparseable. */
function num(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Parse a field that MUST be a finite number; null/blank/unparseable throws. */
function reqNum(raw: string | undefined, field: string, gameId: string): number {
  const parsed = num(raw);
  if (parsed === null) {
    throw new NormalizeError(`row ${gameId || "<blank>"}: required numeric field "${field}" is "${raw ?? ""}"`);
  }
  return parsed;
}

/** Trim a free-text field, returning null when it is absent or blank. */
function text(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

/** Trim + lowercase a free-text field (the asset has ragged casing/spacing). */
function slug(raw: string | undefined): string | null {
  const trimmed = text(raw);
  return trimmed === null ? null : trimmed.toLowerCase();
}

/**
 * Normalize raw nflverse `games.csv` text.
 *
 * Pure and deterministic: no clock, no network, no filesystem. A required
 * column missing from the header throws {@link NormalizeError} rather than
 * producing a table of nulls, because nflverse reshapes these assets without
 * notice and a silent all-null column is exactly the failure this guards.
 */
export function normalizeGames(csvText: string): NormalizedDataset {
  const table = parseCsv(csvText, { columns: GSE_GAMES_COLUMNS });

  const missing = GSE_GAMES_COLUMNS.filter(
    (column) => !table.header.includes(column),
  );
  if (missing.length > 0) {
    throw new NormalizeError(
      `source is missing required column(s): ${missing.join(", ")}. ` +
        `nflverse may have renamed the asset -- re-check ` +
        `https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv`,
    );
  }

  const games: NormalizedGame[] = [];
  const rejected = new Map<string, number>();
  const rowsPerSeason = new Map<number, number>();
  const rowsPerGameType = new Map<string, number>();
  let settledRows = 0;

  const reject = (reason: string): void => {
    rejected.set(reason, (rejected.get(reason) ?? 0) + 1);
  };

  for (const row of table.records) {
    const gameId = text(row["game_id"]);
    if (gameId === null) {
      reject("missing game_id");
      continue;
    }

    const rawType = text(row["game_type"]);
    if (rawType === null || !GAME_TYPES.has(rawType)) {
      reject(`unknown game_type ${JSON.stringify(rawType ?? "")}`);
      continue;
    }
    const gameType = rawType as GameType;

    let season: number;
    let week: number;
    try {
      season = reqNum(row["season"], "season", gameId);
      week = reqNum(row["week"], "week", gameId);
    } catch {
      reject(`row ${gameId}: unparseable season or week`);
      continue;
    }

    const gameday = text(row["gameday"]);
    if (gameday === null) {
      reject(`row ${gameId}: missing gameday`);
      continue;
    }

    const awayTeam = text(row["away_team"]);
    const homeTeam = text(row["home_team"]);
    if (awayTeam === null || homeTeam === null) {
      reject(`row ${gameId}: missing away_team or home_team`);
      continue;
    }

    const awayScore = num(row["away_score"]);
    const homeScore = num(row["home_score"]);
    const settled = awayScore !== null && homeScore !== null;
    const margin = settled ? homeScore - awayScore : null;
    const totalPoints = settled ? homeScore + awayScore : null;
    const roof = slug(row["roof"]);

    games.push({
      game_id: gameId,
      season,
      season_phase: POST_GAME_TYPES.has(gameType) ? "POST" : "REG",
      game_type: gameType,
      week,
      gameday,
      game_time_local: text(row["gametime"]),
      away_team: awayTeam,
      home_team: homeTeam,
      away_score: awayScore,
      home_score: homeScore,
      margin,
      total_points: totalPoints,
      home_win: margin === null ? null : margin > 0,
      settled,
      overtime: num(row["overtime"]) === 1,
      neutral_site: (text(row["location"]) ?? "Home") !== "Home",
      rest_away: num(row["away_rest"]),
      rest_home: num(row["home_rest"]),
      rest_diff:
        num(row["away_rest"]) === null || num(row["home_rest"]) === null
          ? null
          : num(row["home_rest"])! - num(row["away_rest"])!,
      spread_line: num(row["spread_line"]),
      total_line: num(row["total_line"]),
      away_moneyline: num(row["away_moneyline"]),
      home_moneyline: num(row["home_moneyline"]),
      is_divisional: num(row["div_game"]) === 1,
      roof,
      is_dome: roof === "dome" || roof === "closed",
      surface: slug(row["surface"]),
      referee: text(row["referee"]),
    });

    if (settled) settledRows++;
    rowsPerSeason.set(season, (rowsPerSeason.get(season) ?? 0) + 1);
    rowsPerGameType.set(gameType, (rowsPerGameType.get(gameType) ?? 0) + 1);
  }

  return {
    games,
    stats: {
      inputRows: table.records.length,
      keptRows: games.length,
      rejected,
      settledRows,
      unsettledRows: games.length - settledRows,
      rowsPerSeason,
      rowsPerGameType,
    },
  };
}
