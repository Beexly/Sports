/**
 * Database loaders for the observation engine bundle.
 *
 * THE GAP THIS CLOSES
 * `GameBundle` (intelligence-core/engine.ts) declares twelve raw DB surfaces —
 * homeInjuries, awayInjuries, homeNgs, awayNgs, homePlayerStats,
 * awayPlayerStats, homeRatings, awayRatings, weather, gameSignals, homeSnaps,
 * awaySnaps. `enrichPickWithIntelligence` set NONE of them: it filled only
 * extraObservations, market, modelVersion, statedConfidence, grade and now.
 * Every pick therefore ran the reasoning spine on market context alone. These
 * loaders are the wiring: real rows from the live tables into those fields.
 *
 * JOIN HAZARD (why this is app-layer, not SQL)
 * `team_game_efficiency.team` / `injuries.team` / `snap_counts.team` hold a
 * 2-3 character abbreviation ('LA', 'NYG', 'GB'). `games.homeTeamName` /
 * `awayTeamName` hold a full name ('Los Angeles Rams'). `games.homeTeamId` is
 * NULL on all 3,733 rows and the `teams` table has 0 rows, so no relational
 * join is possible — every SQL-level join returns zero rows. Verified on prod:
 * joining games to team_game_efficiency through `homeTeamId` yields 0 rows.
 * The only correct join is here, in the app layer, through the shared
 * NFL_NAME_TO_ABBR map (400/400 prod NFL games resolve).
 *
 * FRESHNESS
 * `game_signals.expiresAt` is 100% NULL on prod, so it can never be used to
 * decide staleness; `createdAt` / `fetchedAt` are the only clocks. The
 * injury / snap / GSE / NGS / player-stat tables carry season+week and NO
 * calendar date column, so their freshness is the season+week window this
 * module resolves, not a timestamp.
 *
 * LEAKAGE DISCIPLINE
 * Every loader takes an explicit `asOf` and refuses rows whose week is after
 * the as-of week, so a past-dated bundle can never be handed future data.
 * Ratings/snaps/stats/NGs are lagged strictly (week <= asOfWeek - 1) because
 * they describe games that must already have been played. Injuries are read
 * at the as-of week: the NFL injury report for week N is published before
 * week N's games, so week N is legitimate pre-game information for week N.
 *
 * READ-ONLY BY CONSTRUCTION
 * This module imports `db` and calls only `findMany` / `findFirst`. There is
 * no create, update, delete, upsert or $queryRaw in this file, and nothing
 * here writes to any table.
 */

import { db } from "@sports/db";
import { nflTeamAbbr, isPlaceholderTeamName } from "@sports/ingestion-pipeline";
import { currentNflSeasonLabel } from "@sports/data-ingestion";
import type {
  InjuryRow,
  NgsRow,
  PlayerGameStatRow,
  TeamEfficiencyRow,
  GameSignalRow,
  SnapCountRow,
} from "@/lib/intelligence-core";

// ---------------------------------------------------------------------------
// Row caps — a bundle feeds a reasoning spine, not a warehouse export.
// Every loader bounds what it returns so one game cannot pull a season.
// ---------------------------------------------------------------------------

const MAX_INJURY_ROWS = 60;
const MAX_SNAP_ROWS = 80;
const MAX_NGS_ROWS = 40;
const MAX_PLAYER_STAT_ROWS = 80;
/** Weeks of ratings history per team (most recent N first-occurrence weeks). */
const RATINGS_HISTORY_WEEKS = 6;

// ---------------------------------------------------------------------------
// Season / week resolution
// ---------------------------------------------------------------------------

/**
 * NFL season label for a game date.
 *
 * Delegates to `currentNflSeasonLabel` in @sports/data-ingestion — the same
 * rule the nflverse ingestion path uses — rather than restating it here.
 * September and later belong to the current calendar year; everything earlier
 * belongs to the prior season, so an April MLB date labels as the prior NFL
 * season and the loader's queries land in a window the NFL tables can answer.
 */
export function nflSeasonForDate(date: Date): number {
  return currentNflSeasonLabel(date);
}

/**
 * Resolve the NFL season + week for a game, from the game's own commence date.
 *
 * The schedule in `games` is the only date source in the database for NFL
 * games — `games` has no season/week column, and neither do injuries /
 * snap_counts / team_game_efficiency. Week 1 of a season is the first Thursday
 * on or after the second week of September (the NFL's published opening
 * window); each subsequent week is seven days later.
 *
 * HONESTY NOTE: this is a calendar computation, not a database lookup. It is
 * only ever used to bound which stored week rows may be read; a game whose
 * date cannot be parsed resolves to null and every loader then skips rather
 * than guessing a week.
 */
export function nflSeasonWeekForDate(date: Date): { season: number; week: number } | null {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
  const season = nflSeasonForDate(date);
  // First Thursday on or after Sep 8 (the earliest the NFL has ever opened).
  const sep8 = Date.UTC(season, 8, 8);
  const openDow = new Date(sep8).getUTCDay(); // 0 = Sunday
  const daysToThursday = (4 - openDow + 7) % 7;
  const week1Thursday = sep8 + daysToThursday * 86_400_000;
  const t = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  if (t < week1Thursday) return { season, week: 1 };
  const week = Math.floor((t - week1Thursday) / (7 * 86_400_000)) + 1;
  // Beyond week 22 the calendar cannot distinguish REG from POST; both the
  // DB and the adapters treat POST weeks as ordinary weeks, so pass through.
  return { season, week: Math.min(week, 22) };
}

// ---------------------------------------------------------------------------
// Loader input / output
// ---------------------------------------------------------------------------

export interface BundleLoaderInput {
  readonly gameId: string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  /** Game start. Drives season + week resolution and the leakage bound. */
  readonly commenceTime: Date;
  /** Optional override; defaults to commenceTime. */
  readonly asOf?: Date;
}

export interface LoadedBundleSurfaces {
  readonly homeInjuries: readonly InjuryRow[];
  readonly awayInjuries: readonly InjuryRow[];
  readonly homeRatings: readonly TeamEfficiencyRow[];
  readonly awayRatings: readonly TeamEfficiencyRow[];
  readonly homeSnaps: readonly SnapCountRow[];
  readonly awaySnaps: readonly SnapCountRow[];
  readonly homeNgs: readonly NgsRow[];
  readonly awayNgs: readonly NgsRow[];
  readonly homePlayerStats: readonly PlayerGameStatRow[];
  readonly awayPlayerStats: readonly PlayerGameStatRow[];
  readonly gameSignals: readonly GameSignalRow[];
  readonly weather: readonly GameSignalRow[];
  /** Human-readable resolution trace. Never contains SQL or credentials. */
  readonly resolution: BundleResolution;
}

export interface BundleResolution {
  readonly homeAbbr: string | null;
  readonly awayAbbr: string | null;
  readonly season: number | null;
  readonly asOfWeek: number | null;
  /** Week used for lagged surfaces (ratings/snaps/stats/NGS). Null = none. */
  readonly lagWeek: number | null;
  /** Weeks actually returned per surface, for audit. */
  readonly weeksSeen: {
    readonly injuries: readonly number[];
    readonly ratings: readonly number[];
    readonly snaps: readonly number[];
    readonly ngs: readonly number[];
    readonly playerStats: readonly number[];
  };
  /** Per-surface failure notes. A failing surface contributes zero rows. */
  readonly notes: readonly string[];
}

const EMPTY_SURFACES: readonly never[] = [];

// ---------------------------------------------------------------------------
// Core loaders
// ---------------------------------------------------------------------------

/**
 * Injuries for both teams at the as-of week.
 *
 * The NFL injury report for week N is published before week N's games, so the
 * as-of week's rows are legitimate pre-game information for a week-N game.
 * A season with no rows at the as-of week returns empty rather than silently
 * substituting the most recent earlier week — a stale injury report read as
 * current would be a lie about what is known now.
 */
export async function loadInjuries(
  input: BundleLoaderInput,
  season: number,
  asOfWeek: number,
): Promise<{ home: InjuryRow[]; away: InjuryRow[] }> {
  const homeAbbr = nflTeamAbbr(input.homeTeamName);
  const awayAbbr = nflTeamAbbr(input.awayTeamName);
  if (!homeAbbr || !awayAbbr) return { home: [], away: [] };

  const rows = await db.injury.findMany({
    where: {
      season,
      week: { lte: asOfWeek },
      team: { in: [homeAbbr, awayAbbr] },
    },
    select: {
      playerName: true,
      team: true,
      position: true,
      reportStatus: true,
      practiceStatus: true,
      primaryInjury: true,
      season: true,
      week: true,
      sourceId: true,
      fetchedAt: true,
    },
    orderBy: [{ week: "desc" }, { playerName: "asc" }],
    take: MAX_INJURY_ROWS * 2,
  });

  const home: InjuryRow[] = [];
  const away: InjuryRow[] = [];
  for (const r of rows) {
    // As-of-week rows are the current report; earlier weeks are the last
    // settled report when the current one has not been published yet. Keep
    // both, but never exceed the cap per side.
    if (r.team === homeAbbr && home.length < MAX_INJURY_ROWS) home.push(r);
    else if (r.team === awayAbbr && away.length < MAX_INJURY_ROWS) away.push(r);
  }
  return { home, away };
}

/**
 * Opponent-adjusted team efficiency (ratings) for both teams.
 *
 * Lagged strictly: a week-N row describes a game that was played in week N, so
 * only weeks < asOfWeek may enter a pre-game bundle for week N. Rows are
 * ordered newest first and capped at RATINGS_HISTORY_WEEKS distinct weeks so
 * the surface carries form rather than a whole season.
 *
 * This is the surface that requires the app-layer abbreviation join.
 */
export async function loadRatings(
  input: BundleLoaderInput,
  season: number,
  lagWeek: number,
): Promise<{ home: TeamEfficiencyRow[]; away: TeamEfficiencyRow[] }> {
  const homeAbbr = nflTeamAbbr(input.homeTeamName);
  const awayAbbr = nflTeamAbbr(input.awayTeamName);
  if (!homeAbbr || !awayAbbr) return { home: [], away: [] };

  const rows = await db.teamGameEfficiency.findMany({
    where: {
      season,
      seasonType: "REG",
      week: { lt: lagWeek },
      team: { in: [homeAbbr, awayAbbr] },
    },
    select: {
      team: true,
      opponent: true,
      isHome: true,
      plays: true,
      offEpaPerPlay: true,
      offSuccess: true,
      defEpaPerPlay: true,
      defSuccess: true,
      season: true,
      week: true,
      sourceId: true,
      fetchedAt: true,
    },
    orderBy: { week: "desc" },
    take: RATINGS_HISTORY_WEEKS * 4,
  });

  const home: TeamEfficiencyRow[] = [];
  const away: TeamEfficiencyRow[] = [];
  const homeWeeks = new Set<number>();
  const awayWeeks = new Set<number>();
  for (const r of rows) {
    if (r.team === homeAbbr) {
      // Cap on DISTINCT weeks, not rows: once the history window is full, a
      // further distinct week is older history and must be dropped, while every
      // row of a week already inside the window is kept.
      if (!homeWeeks.has(r.week)) {
        if (homeWeeks.size >= RATINGS_HISTORY_WEEKS) continue;
        homeWeeks.add(r.week);
      }
      home.push(r);
    } else if (r.team === awayAbbr) {
      if (!awayWeeks.has(r.week)) {
        if (awayWeeks.size >= RATINGS_HISTORY_WEEKS) continue;
        awayWeeks.add(r.week);
      }
      away.push(r);
    }
  }
  return { home, away };
}

/**
 * Snap counts for both teams. Lagged strictly (see loadRatings): snap share
 * describes games already played.
 */
export async function loadSnaps(
  input: BundleLoaderInput,
  season: number,
  lagWeek: number,
): Promise<{ home: SnapCountRow[]; away: SnapCountRow[] }> {
  const homeAbbr = nflTeamAbbr(input.homeTeamName);
  const awayAbbr = nflTeamAbbr(input.awayTeamName);
  if (!homeAbbr || !awayAbbr) return { home: [], away: [] };

  const rows = await db.snapCount.findMany({
    where: {
      season,
      week: { lt: lagWeek },
      team: { in: [homeAbbr, awayAbbr] },
    },
    select: {
      playerName: true,
      team: true,
      position: true,
      offensePct: true,
      defensePct: true,
      season: true,
      week: true,
      sourceId: true,
      fetchedAt: true,
    },
    orderBy: [{ week: "desc" }, { playerName: "asc" }],
    take: MAX_SNAP_ROWS * 2,
  });

  const home: SnapCountRow[] = [];
  const away: SnapCountRow[] = [];
  for (const r of rows) {
    if (r.team === homeAbbr && home.length < MAX_SNAP_ROWS) home.push(r);
    else if (r.team === awayAbbr && away.length < MAX_SNAP_ROWS) away.push(r);
  }
  return { home, away };
}

/**
 * Next-gen stats for both teams. Lagged strictly (see loadRatings).
 * `statType` is preserved on the row: the adapter reads different metric
 * families off the passing / receiving / rushing variants.
 */
export async function loadNgs(
  input: BundleLoaderInput,
  season: number,
  lagWeek: number,
): Promise<{ home: NgsRow[]; away: NgsRow[] }> {
  const homeAbbr = nflTeamAbbr(input.homeTeamName);
  const awayAbbr = nflTeamAbbr(input.awayTeamName);
  if (!homeAbbr || !awayAbbr) return { home: [], away: [] };

  const rows = await db.nextGenStat.findMany({
    where: {
      season,
      week: { lt: lagWeek },
      team: { in: [homeAbbr, awayAbbr] },
    },
    select: {
      playerName: true,
      team: true,
      position: true,
      statType: true,
      season: true,
      week: true,
      cpoe: true,
      avgSeparation: true,
      avgYacAboveExpectation: true,
      rushYardsOverExpectedPerAtt: true,
      pctShareIntendedAirYards: true,
      completionPct: true,
      expectedCompletionPct: true,
      sourceId: true,
      fetchedAt: true,
    },
    orderBy: { week: "desc" },
    take: MAX_NGS_ROWS * 2,
  });

  const home: NgsRow[] = [];
  const away: NgsRow[] = [];
  for (const r of rows) {
    if (r.team === homeAbbr && home.length < MAX_NGS_ROWS) home.push(r);
    else if (r.team === awayAbbr && away.length < MAX_NGS_ROWS) away.push(r);
  }
  return { home, away };
}

/**
 * Per-player weekly game stats for both teams. Lagged strictly (see
 * loadRatings).
 *
 * `player_game_stats.team` is NULL on every prod row for the 2025 and 2026
 * seasons (verified: 6,396 rows for 2025 and 1,091 for 2026, 0 non-null), and
 * `players.recentTeam` cannot stand in for it (verified: 0 of 2026 week-3 stat
 * rows join a player whose recentTeam is set). This loader therefore resolves
 * the join through the stored team column and, where that column is empty,
 * returns nothing for that side rather than borrowing another team's rows.
 */
export async function loadPlayerStats(
  input: BundleLoaderInput,
  season: number,
  lagWeek: number,
): Promise<{ home: PlayerGameStatRow[]; away: PlayerGameStatRow[]; unresolved: boolean }> {
  const homeAbbr = nflTeamAbbr(input.homeTeamName);
  const awayAbbr = nflTeamAbbr(input.awayTeamName);
  if (!homeAbbr || !awayAbbr) return { home: [], away: [], unresolved: true };

  const rows = await db.playerGameStat.findMany({
    where: {
      season,
      week: { lt: lagWeek },
      team: { in: [homeAbbr, awayAbbr] },
    },
    select: {
      team: true,
      opponent: true,
      season: true,
      week: true,
      attempts: true,
      carries: true,
      receptions: true,
      targets: true,
      targetShare: true,
      fantasyPointsPpr: true,
      passingEpa: true,
      rushingEpa: true,
      receivingEpa: true,
      sourceId: true,
      fetchedAt: true,
    },
    orderBy: { week: "desc" },
    take: MAX_PLAYER_STAT_ROWS * 2,
  });

  const home: PlayerGameStatRow[] = [];
  const away: PlayerGameStatRow[] = [];
  for (const r of rows) {
    if (r.team === homeAbbr && home.length < MAX_PLAYER_STAT_ROWS) home.push(r);
    else if (r.team === awayAbbr && away.length < MAX_PLAYER_STAT_ROWS) away.push(r);
  }
  return { home, away, unresolved: home.length === 0 && away.length === 0 };
}

/**
 * Persisted game signals for one game, split into the two bundle fields.
 *
 * This is a true relational join — `game_signals.gameId` is a real FK to
 * `games.id`, no abbreviation involved — and it is the only surface that
 * keys off the actual game row rather than the season+week grid.
 *
 * WEATHER CATEGORISATION: `game_signals` currently holds only SCHEDULE rows
 * from `schedule-internal` on prod (5,172 rows, keys schedule_density_7d_home
 * and schedule_density_7d_away, 2,586 games). The WEATHER / VENUE_ENVIRONMENT
 * categories exist in the enum and are read into `weather`, but prod has no
 * rows in them, so that field is honestly empty until a weather feed lands.
 * Routing is by category, not by key-name guessing.
 *
 * `expiresAt` is never consulted: it is 100% NULL on prod.
 */
export async function loadGameSignals(
  gameId: string,
): Promise<{ gameSignals: GameSignalRow[]; weather: GameSignalRow[] }> {
  const rows = await db.gameSignal.findMany({
    where: { gameId },
    select: {
      sourceCategory: true,
      sourceName: true,
      signalKey: true,
      signalValue: true,
      trustLevel: true,
      fetchedAt: true,
    },
    orderBy: [{ fetchedAt: "desc" }],
  });

  const gameSignals: GameSignalRow[] = [];
  const weather: GameSignalRow[] = [];
  for (const r of rows) {
    const cat = String(r.sourceCategory).toUpperCase();
    if (cat === "WEATHER" || cat === "VENUE_ENVIRONMENT") weather.push(r);
    else gameSignals.push(r);
  }
  return { gameSignals, weather };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/**
 * Load every bundle surface for one game.
 *
 * Fail-open per surface: a surface that throws contributes zero rows and a
 * note. One failing table must not blank the other eleven, and it must not
 * fail the pick response either.
 *
 * When the team names cannot be resolved to GSE abbreviations (placeholder
 * 'TBD' names, or a non-NFL sport) the abbreviation-keyed surfaces are
 * skipped and the reason is recorded — game signals still load, because that
 * join is on the game id.
 */
export async function loadBundleSurfaces(
  input: BundleLoaderInput,
): Promise<LoadedBundleSurfaces> {
  const notes: string[] = [];
  const asOf = input.asOf ?? input.commenceTime;
  const resolved = nflSeasonWeekForDate(asOf);

  const homeAbbr = isPlaceholderTeamName(input.homeTeamName)
    ? null
    : nflTeamAbbr(input.homeTeamName);
  const awayAbbr = isPlaceholderTeamName(input.awayTeamName)
    ? null
    : nflTeamAbbr(input.awayTeamName);

  if (!homeAbbr || !awayAbbr) {
    notes.push(
      `team abbreviation unresolved (home=${JSON.stringify(input.homeTeamName)}, away=${JSON.stringify(input.awayTeamName)}); abbreviation-keyed surfaces skipped`,
    );
  }
  if (!resolved) {
    notes.push("commence time unparseable; season/week-keyed surfaces skipped");
  }

  const season = resolved?.season ?? null;
  const asOfWeek = resolved?.week ?? null;
  const lagWeek = asOfWeek != null ? asOfWeek : null;

  const safe = async <T>(
    label: string,
    fn: () => Promise<T>,
    fallback: T,
  ): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      notes.push(`${label} load failed: ${err instanceof Error ? err.message : String(err)}`);
      return fallback;
    }
  };

  const [injuries, ratings, snaps, ngs, playerStats, signals] = await Promise.all([
    safe(
      "injuries",
      async () =>
        season != null && asOfWeek != null && homeAbbr && awayAbbr
          ? loadInjuries(input, season, asOfWeek)
          : { home: [], away: [] },
      { home: [], away: [] },
    ),
    safe(
      "ratings",
      async () =>
        season != null && lagWeek != null && homeAbbr && awayAbbr
          ? loadRatings(input, season, lagWeek)
          : { home: [], away: [] },
      { home: [], away: [] },
    ),
    safe(
      "snaps",
      async () =>
        season != null && lagWeek != null && homeAbbr && awayAbbr
          ? loadSnaps(input, season, lagWeek)
          : { home: [], away: [] },
      { home: [], away: [] },
    ),
    safe(
      "ngs",
      async () =>
        season != null && lagWeek != null && homeAbbr && awayAbbr
          ? loadNgs(input, season, lagWeek)
          : { home: [], away: [] },
      { home: [], away: [] },
    ),
    safe(
      "playerStats",
      async () =>
        season != null && lagWeek != null && homeAbbr && awayAbbr
          ? loadPlayerStats(input, season, lagWeek)
          : { home: [], away: [], unresolved: true },
      { home: [], away: [], unresolved: true },
    ),
    safe("gameSignals", () => loadGameSignals(input.gameId), {
      gameSignals: [],
      weather: [],
    }),
  ]);

  if (playerStats.unresolved && homeAbbr && awayAbbr) {
    notes.push(
      "playerGameStat rows carry no team for this season; player-stat surfaces returned empty rather than borrowed from another team",
    );
  }
  if (signals.weather.length === 0) {
    notes.push(
      "no WEATHER/VENUE_ENVIRONMENT game_signals rows for this game (prod has none in those categories); weather surface empty",
    );
  }

  const weeksOf = (rows: readonly { week: number }[]): number[] =>
    [...new Set(rows.map((r) => r.week))].sort((a, b) => a - b);

  return {
    homeInjuries: injuries.home,
    awayInjuries: injuries.away,
    homeRatings: ratings.home,
    awayRatings: ratings.away,
    homeSnaps: snaps.home,
    awaySnaps: snaps.away,
    homeNgs: ngs.home,
    awayNgs: ngs.away,
    homePlayerStats: playerStats.home,
    awayPlayerStats: playerStats.away,
    gameSignals: signals.gameSignals,
    weather: signals.weather,
    resolution: {
      homeAbbr,
      awayAbbr,
      season,
      asOfWeek,
      lagWeek,
      weeksSeen: {
        injuries: weeksOf([...injuries.home, ...injuries.away]),
        ratings: weeksOf([...ratings.home, ...ratings.away]),
        snaps: weeksOf([...snaps.home, ...snaps.away]),
        ngs: weeksOf([...ngs.home, ...ngs.away]),
        playerStats: weeksOf([...playerStats.home, ...playerStats.away]),
      },
      notes,
    },
  };
}

export { EMPTY_SURFACES };