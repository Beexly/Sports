import { db, isStubMode } from "@sports/db";
import type { createBoard360PropsShadowSource } from "@sports/ingestion-pipeline";

type ResolveRateHistoryFn = NonNullable<
  NonNullable<Parameters<typeof createBoard360PropsShadowSource>[0]>["resolveRateHistory"]
>;
type ResolvedRateHistory = Awaited<ReturnType<ResolveRateHistoryFn>>;

export interface MeasuredStatColumns {
  readonly attempts: number | null;
  readonly carries: number | null;
  readonly receptions: number | null;
  readonly receivingYards: number | null;
  readonly rushingYards: number | null;
}

export interface DbPlayerGameStatRow extends MeasuredStatColumns {
  readonly playerId: string;
  readonly team: string | null;
  readonly player: {
    readonly fullName: string;
    readonly recentTeam: string | null;
  };
}

export interface DbRateHistoryResolverOptions {
  readonly season?: number;
  readonly now?: Date;
  readonly isStub?: () => boolean;
  readonly queryStats?: (season: number) => Promise<readonly DbPlayerGameStatRow[]>;
  readonly onError?: (err: unknown) => void;
}

const PROP_STAT_COLUMN: Readonly<Record<string, keyof MeasuredStatColumns>> = {
  receptions: "receptions",
  receiving_yards: "receivingYards",
  rushing_yards: "rushingYards",
  rushing_attempts: "carries",
  passing_attempts: "attempts",
};

const TEAM_ALIAS_TO_CANONICAL: Readonly<Record<string, string>> = {
  WSH: "WAS",
  LA: "LAR",
  STL: "LAR",
  JAC: "JAX",
  OAK: "LV",
  SD: "LAC",
};

const MIN_GAMES_REQUIRED = 2;

/** Infers the active NFL league year (September onward belongs to that calendar year). */
export function inferActiveNflSeason(now: Date = new Date()): number {
  const month = now.getUTCMonth();
  const year = now.getUTCFullYear();
  return month >= 8 ? year : year - 1;
}

/** Normalizes team codes across sportsbook feeds (WSH/LAR) and nflverse (WAS/LA). */
export function normalizeNflTeamCode(team: string | null | undefined): string {
  const clean = (team ?? "").trim().toUpperCase();
  if (!clean) return "";
  return TEAM_ALIAS_TO_CANONICAL[clean] ?? clean;
}

/** Normalizes player display names for cross-feed matching without suffix drift. */
export function normalizeStatPlayerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(?:jr|sr|ii|iii|iv|v)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface StatIndex {
  readonly rowsByPlayerId: ReadonlyMap<string, readonly DbPlayerGameStatRow[]>;
  readonly byTeamAndName: ReadonlyMap<string, ReadonlySet<string>>;
  readonly byNameOnly: ReadonlyMap<string, ReadonlySet<string>>;
}

function addLookupId(map: Map<string, Set<string>>, key: string, playerId: string): void {
  const existing = map.get(key);
  if (existing) {
    existing.add(playerId);
    return;
  }
  map.set(key, new Set([playerId]));
}

function buildStatIndex(rows: readonly DbPlayerGameStatRow[]): StatIndex {
  const rowsByPlayerId = new Map<string, DbPlayerGameStatRow[]>();
  const byTeamAndName = new Map<string, Set<string>>();
  const byNameOnly = new Map<string, Set<string>>();

  for (const row of rows) {
    const bucket = rowsByPlayerId.get(row.playerId);
    if (bucket) {
      bucket.push(row);
    } else {
      rowsByPlayerId.set(row.playerId, [row]);
    }

    const normName = normalizeStatPlayerName(row.player.fullName);
    if (!normName) continue;

    addLookupId(byNameOnly, normName, row.playerId);

    const teams = [normalizeNflTeamCode(row.team), normalizeNflTeamCode(row.player.recentTeam)];
    for (const tm of teams) {
      if (tm) {
        addLookupId(byTeamAndName, `${tm}:${normName}`, row.playerId);
      }
    }
  }

  return { rowsByPlayerId, byTeamAndName, byNameOnly };
}

function resolveUniquePlayerId(ids: ReadonlySet<string> | undefined): string | null {
  if (!ids || ids.size !== 1) return null;
  const first = ids.values().next();
  return first.done ? null : first.value;
}

function defaultQueryStats(season: number): Promise<readonly DbPlayerGameStatRow[]> {
  return db.playerGameStat.findMany({
    where: { season, seasonType: "REG" },
    orderBy: [{ week: "asc" }, { id: "asc" }],
    select: {
      playerId: true,
      team: true,
      attempts: true,
      carries: true,
      receptions: true,
      receivingYards: true,
      rushingYards: true,
      player: {
        select: {
          fullName: true,
          recentTeam: true,
        },
      },
    },
  });
}

/**
 * Creates a fail-closed, single-batch `@sports/db` rate-history resolver for
 * `createBoard360PropsShadowSource`.
 *
 * Returns `undefined` when operating in Prisma stub mode, on unsupported
 * `PlayerGameStat` prop types (`passing_yards`, `passing_tds`, etc.), on
 * ambiguous player names, or when fewer than 2 measured games exist.
 */
export function createDbRateHistoryResolver(
  options: DbRateHistoryResolverOptions = {},
): ResolveRateHistoryFn {
  const checkStub = options.isStub ?? isStubMode;
  const runQuery = options.queryStats ?? defaultQueryStats;
  const season = options.season ?? inferActiveNflSeason(options.now);

  let indexPromise: Promise<StatIndex> | null = null;

  async function getIndex(): Promise<StatIndex> {
    if (!indexPromise) {
      indexPromise = runQuery(season)
        .then((rows) => buildStatIndex(rows))
        .catch((err: unknown) => {
          options.onError?.(err);
          return buildStatIndex([]);
        });
    }
    return indexPromise;
  }

  return async ({
    playerId,
    playerName,
    team,
    propType,
    line,
  }): Promise<ResolvedRateHistory> => {
    const column = PROP_STAT_COLUMN[propType];
    if (!column || checkStub()) {
      return undefined;
    }

    const index = await getIndex();
    const normName = normalizeStatPlayerName(playerName);
    if (!normName) {
      return undefined;
    }

    const canonicalTeam = normalizeNflTeamCode(team);
    const matchedPlayerId =
      (canonicalTeam ? resolveUniquePlayerId(index.byTeamAndName.get(`${canonicalTeam}:${normName}`)) : null) ??
      resolveUniquePlayerId(index.byNameOnly.get(normName));

    if (!matchedPlayerId) {
      return undefined;
    }

    const playerRows = index.rowsByPlayerId.get(matchedPlayerId);
    if (!playerRows || playerRows.length < MIN_GAMES_REQUIRED) {
      return undefined;
    }

    const samples: Array<{ readonly games: number; readonly total: number }> = [];
    for (const row of playerRows) {
      const value = row[column];
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      // Preserve negative single-game net yardage rows as played games (>= 0)
      // so fitGroupPrior retains the sample denominator without throwing RangeError.
      samples.push({ games: 1, total: Math.max(0, value) });
    }

    if (samples.length < MIN_GAMES_REQUIRED) {
      return undefined;
    }

    return {
      playerId,
      propType,
      line,
      games: 1,
      samples,
    };
  };
}
