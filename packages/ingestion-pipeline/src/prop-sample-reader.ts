/**
 * prop-sample-reader.ts — C-358: OddsLineSnapshot props → graded RateSample.
 *
 * FIRST production caller of `decodePropMarket` (prop-line-rows.ts). Reads the
 * sealed prop archive (`market = "<oddsApiKey>|<playerSlug>"`), joins each
 * posted line to (playerId, season, week) via a game schedule map and a
 * gsis↔pfr identity map, realizes the week's stat, and grades the outcome
 * under the books' published settlement rules — not our convenience:
 *
 *   1. Zero offensive snaps that week (`snap_counts`) → VOID, never LOSS.
 *   2. Overtime counts: weekly nflverse totals already include OT; the
 *      realized value is the full-week total, never a regulation-only slice.
 *   3. An NFL sack is a pass attempt (dropback), never a rush attempt.
 *      `player_rush_attempts` reads `carries` only.
 *   4. A push on the posted line is a push (realized === line).
 *   5. `player_anytime_td` Yes/No (C-357): Yes wins on any TD that week.
 *
 * Read-only. `db` is `unknown` at the public boundary (same pre-codegen
 * posture as line-archive.ts). Missing delegates, thrown errors, or non-array
 * results yield the empty sample — never throw, never invent a playerId or a
 * realized stat.
 */

import type { RateSample } from "@sports/prediction-engine";
import {
  formatWeatherCoverageLog,
  type KickoffWeatherField,
  type WeatherSlateCoverage,
} from "@sports/prediction-engine/src/edge-lab/weather-game-field.js";
import { decodePropMarket, type PropSide } from "./prop-line-rows.js";
import { resolveKalshiTeamAbbr } from "./kalshi-team-abbr.js";

// ── public types ──────────────────────────────────────────────────────────

export type PropGradedOutcome = "WIN" | "LOSS" | "PUSH" | "VOID" | "UNGRADED";

export type { PropSide };

/** One graded (or honestly ungraded) posted prop line. */
export interface PropSampleLine {
  readonly gameId: string;
  /** Canonical GSIS (`Player.gsisId`). Never a slug and never invented. */
  readonly playerId: string;
  readonly marketKey: string;
  readonly playerSlug: string;
  readonly book: string;
  readonly side: PropSide;
  /** Posted line (American price is `price`). Null for Yes/No markets. */
  readonly line: number | null;
  /** American price as stored on the posted (OPEN-or-first) capture. */
  readonly price: number;
  /** CLOSE-phase American price, else last capture; null when absent. */
  readonly close: number | null;
  readonly season: number | null;
  readonly week: number | null;
  /** One-game Poisson sample `{games: 1, total: realized}` when gradeable. */
  readonly rateSample: RateSample | null;
  readonly realized: number | null;
  readonly outcome: PropGradedOutcome;
  readonly voidReason: string | null;
  /**
   * C-414 — kickoff-hour weather for this game (null-safe). Joined from the
   * shared `KickoffWeatherField` so A5 (totals) and A25 (pass props) read the
   * SAME field. Null when no observation was supplied or the game is missing
   * from the map — never imputed.
   */
  readonly weather: KickoffWeatherField | null;
}

export interface PlayerIdentityRow {
  readonly gsisId: string;
  readonly fullName: string;
  /** nflverse snap_counts / PFR id — seeds the gsis↔pfr bridge. */
  readonly pfrId?: string | null;
  /** Internal `Player.id` cuid when hydrating from the database. */
  readonly playerDbId?: string | null;
}

export interface PlayerIdMap {
  /** `slugPlayer(fullName)` → gsisId. */
  readonly bySlug: ReadonlyMap<string, string>;
  /** pfr id → gsisId (snap_counts join). */
  readonly byPfr: ReadonlyMap<string, string>;
  /** gsisId → internal Player.id (PlayerGameStat.playerId). */
  readonly gsisToDbId: ReadonlyMap<string, string>;
}

export interface GameSeasonWeek {
  readonly season: number;
  readonly week: number;
}

export interface ArchivePropRow {
  readonly gameId: string;
  readonly market: string;
  readonly book: string;
  readonly side: string;
  readonly price: number;
  readonly line: number | null;
  readonly phase: string;
  readonly capturedAt: Date | string;
}

export interface PlayerWeekStatRow {
  readonly gsisId: string;
  readonly season: number;
  readonly week: number;
  readonly seasonType?: string;
  readonly attempts?: number | null;
  readonly carries?: number | null;
  readonly receptions?: number | null;
  readonly targets?: number | null;
  readonly receivingYards?: number | null;
  readonly rushingYards?: number | null;
  /** Optional extension for `player_anytime_td` — not in PlayerGameStat today. */
  readonly touchdowns?: number | null;
}

export interface SnapCountRow {
  readonly gsisId?: string | null;
  readonly pfrPlayerId?: string | null;
  readonly season: number;
  readonly week: number;
  readonly offenseSnaps?: number | null;
}

// ── identity / schedule maps ──────────────────────────────────────────────

function slugFromName(name: string): string {
  return name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.\']/g, "")
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Seed the prop-slug ↔ gsis ↔ pfr map. Production rows come from `Player`
 * (gsisId, fullName, id) plus snap_counts' pfr ids bridged through
 * `@sports/data-ingestion`'s season-matched crosswalk; tests inject the
 * 40-row identity-table fixture. First write wins; empty ids are skipped.
 */
export function buildPlayerIdMap(rows: readonly PlayerIdentityRow[]): PlayerIdMap {
  const bySlug = new Map<string, string>();
  const byPfr = new Map<string, string>();
  const gsisToDbId = new Map<string, string>();
  for (const row of rows) {
    const gsis = (row.gsisId ?? "").trim();
    if (!gsis) continue;
    const slug = slugFromName(row.fullName ?? "");
    if (slug && !bySlug.has(slug)) bySlug.set(slug, gsis);
    const pfr = (row.pfrId ?? "").trim();
    if (pfr && !byPfr.has(pfr)) byPfr.set(pfr, gsis);
    const dbId = (row.playerDbId ?? "").trim();
    if (dbId && !gsisToDbId.has(gsis)) gsisToDbId.set(gsis, dbId);
  }
  return { bySlug, byPfr, gsisToDbId };
}

/** gameId → (season, week). Production: HistoricalGame joined to Game. */
export function buildGameSeasonWeekMap(
  rows: readonly ({ readonly gameId: string } & GameSeasonWeek)[],
): ReadonlyMap<string, GameSeasonWeek> {
  const map = new Map<string, GameSeasonWeek>();
  for (const row of rows) {
    if (!row.gameId) continue;
    if (!Number.isFinite(row.season) || !Number.isFinite(row.week)) continue;
    map.set(row.gameId, { season: row.season, week: row.week });
  }
  return map;
}

// ── grading (pure) ────────────────────────────────────────────────────────

/**
 * Map an archive market key to the weekly realized stat on `PlayerGameStat`.
 *
 * Sack law: `player_rush_attempts` is `carries` only. A sack is a pass
 * attempt (dropback), never a rush attempt — never attempts+carries, never
 * dropbacks. Markets whose realized column is not on PlayerGameStat today
 * (pass yds/tds/completions/ints, rush/rec tds, player_sacks) are absent and
 * grade UNGRADED rather than inventing a value.
 */
export const PROP_MARKET_STAT_FIELD = {
  player_receptions: "receptions",
  player_rush_attempts: "carries",
  player_rush_yds: "rushingYards",
  player_reception_yds: "receivingYards",
  player_anytime_td: "touchdowns",
} as const satisfies Record<string, keyof PlayerWeekStatRow>;

export type PropStatField = (typeof PROP_MARKET_STAT_FIELD)[keyof typeof PROP_MARKET_STAT_FIELD];

/**
 * Realized rush attempts for a prop grade. Sacks are excluded by construction:
 * the prop reads `carries`, and `carries` never includes a sack.
 */
export function rushAttemptsForProp(stats: {
  readonly carries?: number | null;
  readonly attempts?: number | null;
}): number | null {
  const carries = stats.carries;
  if (carries == null || !Number.isFinite(carries)) return null;
  return carries;
}

/**
 * Grade one posted side against the week's realized stat.
 *
 * zeroSnaps outranks every other branch — a player who did not take an
 * offensive snap is VOID, never LOSS (books' published rule).
 */
export function gradePropSide(args: {
  readonly side: PropSide;
  readonly line: number | null;
  readonly realized: number | null;
  readonly zeroSnaps?: boolean;
}): { readonly outcome: PropGradedOutcome; readonly voidReason: string | null } {
  if (args.zeroSnaps === true) {
    return { outcome: "VOID", voidReason: "zero_offensive_snaps" };
  }
  const realized = args.realized;
  if (realized == null || !Number.isFinite(realized)) {
    return { outcome: "UNGRADED", voidReason: "missing_realized_stat" };
  }

  if (args.side === "yes" || args.side === "no") {
    const scored = realized > 0;
    if (args.side === "yes") {
      return { outcome: scored ? "WIN" : "LOSS", voidReason: null };
    }
    return { outcome: scored ? "LOSS" : "WIN", voidReason: null };
  }

  const line = args.line;
  if (line == null || !Number.isFinite(line)) {
    return { outcome: "UNGRADED", voidReason: "missing_posted_line" };
  }
  // Push on the posted line is a push (not a win for either side).
  if (realized === line) {
    return { outcome: "PUSH", voidReason: null };
  }
  if (args.side === "over") {
    return { outcome: realized > line ? "WIN" : "LOSS", voidReason: null };
  }
  return { outcome: realized < line ? "WIN" : "LOSS", voidReason: null };
}

/** One-game RateSample. NULL when the week is not gradeable — never `{games:0}`. */
export function rateSampleFromWeek(realized: number | null): RateSample | null {
  if (realized == null || !Number.isFinite(realized)) return null;
  return { games: 1, total: realized };
}

function realizedStat(
  marketKey: string,
  stats: PlayerWeekStatRow | undefined,
): number | null {
  const field = PROP_MARKET_STAT_FIELD[marketKey as keyof typeof PROP_MARKET_STAT_FIELD];
  if (!field || !stats) return null;
  if (marketKey === "player_rush_attempts") {
    return rushAttemptsForProp(stats);
  }
  const value = stats[field];
  if (value == null || !Number.isFinite(value)) return null;
  return value;
}

function parseCapturedAt(value: Date | string): number {
  const t = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY;
}

function isPropSide(value: string): value is PropSide {
  return value === "over" || value === "under" || value === "yes" || value === "no";
}

// ── pure sample assembly ──────────────────────────────────────────────────

export interface BuildPropSampleInput {
  readonly archiveRows: readonly ArchivePropRow[];
  readonly gameSeasonWeek: ReadonlyMap<string, GameSeasonWeek>;
  readonly playerIdMap: PlayerIdMap;
  readonly playerWeekStats: readonly PlayerWeekStatRow[];
  readonly snapCounts: readonly SnapCountRow[];
  /**
   * C-414 — optional kickoff-hour weather map (gameId → field). When omitted
   * every line's `weather` is null and coverage reports zero joined. Null-safe:
   * a game absent from the map never invents a field.
   */
  readonly weatherByGameId?: ReadonlyMap<string, KickoffWeatherField>;
}

function findSnapCount(
  snaps: readonly SnapCountRow[],
  playerIdMap: PlayerIdMap,
  gsis: string,
  season: number,
  week: number,
): SnapCountRow | undefined {
  for (const row of snaps) {
    if (row.season !== season || row.week !== week) continue;
    const g = (row.gsisId ?? "").trim();
    if (g && g === gsis) return row;
    const pfr = (row.pfrPlayerId ?? "").trim();
    if (pfr && playerIdMap.byPfr.get(pfr) === gsis) return row;
  }
  return undefined;
}

function findWeekStats(
  stats: readonly PlayerWeekStatRow[],
  gsis: string,
  season: number,
  week: number,
): PlayerWeekStatRow | undefined {
  return stats.find(
    (s) =>
      s.gsisId === gsis &&
      s.season === season &&
      s.week === week &&
      (s.seasonType == null || s.seasonType === "REG"),
  );
}

/**
 * Assemble graded samples from already-hydrated rows. Pure and deterministic:
 * latest-wins per (gameId, market, book, side); ties break on capturedAt then
 * input order. Featured markets (no `|`) are skipped — `decodePropMarket` is
 * the production filter.
 */
export function buildPropSampleLines(input: BuildPropSampleInput): readonly PropSampleLine[] {
  const { archiveRows, gameSeasonWeek, playerIdMap, playerWeekStats, snapCounts, weatherByGameId } =
    input;

  type Bucket = {
    rows: ArchivePropRow[];
  };
  const buckets = new Map<string, Bucket>();
  for (const row of archiveRows) {
    const decoded = decodePropMarket(row.market);
    if (decoded == null) continue;
    if (!isPropSide(row.side)) continue;
    if (!Number.isFinite(row.price)) continue;
    const key = `${row.gameId}\u0000${row.market}\u0000${row.book}\u0000${row.side}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.rows.push(row);
    else buckets.set(key, { rows: [row] });
  }

  const lines: PropSampleLine[] = [];
  const keys = Array.from(buckets.keys()).sort();
  for (const key of keys) {
    const bucket = buckets.get(key);
    if (!bucket) continue;
    const sorted = bucket.rows
      .map((row, index) => ({ row, index, t: parseCapturedAt(row.capturedAt) }))
      .sort((a, b) => a.t - b.t || a.index - b.index);
    const last = sorted[sorted.length - 1]!.row;
    const decoded = decodePropMarket(last.market);
    if (decoded == null || !isPropSide(last.side)) continue;

    const posted =
      sorted.find((s) => s.row.phase === "OPEN")?.row ?? sorted[0]!.row;
    const closeRow =
      sorted.find((s) => s.row.phase === "CLOSE")?.row ?? sorted[sorted.length - 1]!.row;

    const gsis = playerIdMap.bySlug.get(decoded.playerSlug) ?? null;
    const seasonWeek = gameSeasonWeek.get(last.gameId) ?? null;

    let realized: number | null = null;
    let zeroSnaps = false;
    let rateSample: RateSample | null = null;
    let outcome: PropGradedOutcome = "UNGRADED";
    let voidReason: string | null = "unresolved_player";

    if (gsis != null && seasonWeek != null) {
      const weekStats = findWeekStats(playerWeekStats, gsis, seasonWeek.season, seasonWeek.week);
      const snap = findSnapCount(
        snapCounts,
        playerIdMap,
        gsis,
        seasonWeek.season,
        seasonWeek.week,
      );
      if (snap != null && (snap.offenseSnaps ?? null) === 0) {
        zeroSnaps = true;
      }
      realized = realizedStat(decoded.marketKey, weekStats);
      // Overtime law: weekly totals already include OT — no slicing here.
      const graded = gradePropSide({
        side: last.side,
        line: Number.isFinite(last.line) ? (last.line as number) : null,
        realized,
        zeroSnaps,
      });
      outcome = graded.outcome;
      voidReason = graded.voidReason;
      rateSample = zeroSnaps ? null : rateSampleFromWeek(realized);
    } else if (gsis == null) {
      voidReason = "unresolved_player";
    } else {
      voidReason = "unresolved_season_week";
    }

    lines.push({
      gameId: last.gameId,
      playerId: gsis ?? "",
      marketKey: decoded.marketKey,
      playerSlug: decoded.playerSlug,
      book: last.book,
      side: last.side,
      line: Number.isFinite(last.line) ? (last.line as number) : null,
      price: Number.isFinite(posted.price) ? posted.price : last.price,
      close: Number.isFinite(closeRow.price) ? closeRow.price : null,
      season: seasonWeek?.season ?? null,
      week: seasonWeek?.week ?? null,
      rateSample,
      realized,
      outcome,
      voidReason,
      // C-414 null-safe join: missing map or missing gameId → null, never imputed.
      weather: weatherByGameId?.get(last.gameId) ?? null,
    });
  }
  return lines;
}

// ── db hydration (fail-closed) ────────────────────────────────────────────

type FindManyDelegate = {
  findMany?: (args: unknown) => Promise<unknown>;
};

function delegate(
  db: unknown,
  name: "oddsLineSnapshot" | "historicalGame" | "player" | "playerGameStat" | "snapCount" | "game",
): FindManyDelegate | null {
  const bag = db as Record<string, FindManyDelegate | undefined> | null | undefined;
  if (!bag || typeof bag !== "object") return null;
  const d = bag[name];
  if (!d || typeof d.findMany !== "function") return null;
  return d;
}

async function safeFindMany(
  db: unknown,
  name: Parameters<typeof delegate>[1],
  args: unknown,
): Promise<unknown[]> {
  const d = delegate(db, name);
  if (!d) return [];
  try {
    const result = await d.findMany!(args);
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

export interface ReadPropSamplesArgs {
  readonly db: unknown;
  readonly gameIds?: readonly string[];
}

/**
 * Hydrate archive props + schedules + identity + stats/snaps from `db` and
 * return the graded sample. Fail-closed: any missing delegate or throw yields
 * `[]` for that slice; the function itself never throws.
 */
export async function readPropSamples(
  args: ReadPropSamplesArgs,
): Promise<readonly PropSampleLine[]> {
  const { db } = args;
  try {
    const where =
      args.gameIds && args.gameIds.length > 0
        ? { gameId: { in: Array.from(args.gameIds) }, market: { contains: "|" } }
        : { market: { contains: "|" } };

    const archiveRaw = await safeFindMany(db, "oddsLineSnapshot", {
      where,
      orderBy: [{ capturedAt: "asc" }, { id: "asc" }],
      select: {
        gameId: true,
        market: true,
        book: true,
        side: true,
        price: true,
        line: true,
        phase: true,
        capturedAt: true,
      },
    });

    const archiveRows: ArchivePropRow[] = [];
    const gameIds = new Set<string>();
    for (const raw of archiveRaw) {
      const row = raw as Partial<ArchivePropRow>;
      if (
        typeof row.gameId !== "string" ||
        typeof row.market !== "string" ||
        typeof row.book !== "string" ||
        typeof row.side !== "string" ||
        typeof row.price !== "number" ||
        !Number.isFinite(row.price)
      ) {
        continue;
      }
      gameIds.add(row.gameId);
      archiveRows.push({
        gameId: row.gameId,
        market: row.market,
        book: row.book,
        side: row.side,
        price: row.price,
        line: typeof row.line === "number" ? row.line : null,
        phase: typeof row.phase === "string" ? row.phase : "INTERIM",
        capturedAt:
          row.capturedAt instanceof Date || typeof row.capturedAt === "string"
            ? row.capturedAt
            : new Date(0),
      });
    }
    if (archiveRows.length === 0) return [];

    const games = await safeFindMany(db, "game", {
      where: { id: { in: Array.from(gameIds) } },
      select: { id: true, homeTeamName: true, awayTeamName: true, commenceTime: true },
    });

    // Game → (season, week) from HistoricalGame schedules. Match by commence
    // calendar year + home/away abbreviation when both sides resolve; else the
    // caller can pre-seed season/week via a schedule-shaped db row later.
    const years = new Set<number>();
    for (const raw of games) {
      const commence = (raw as { commenceTime?: Date | string }).commenceTime;
      const t = commence instanceof Date ? commence : new Date(String(commence ?? ""));
      if (Number.isFinite(t.getTime())) years.add(t.getUTCFullYear());
    }
    const schedules = await safeFindMany(db, "historicalGame", {
      where: years.size > 0 ? { season: { in: Array.from(years) } } : {},
      select: { season: true, week: true, homeTeam: true, awayTeam: true, gameKey: true },
    });

    const scheduleRows = schedules as Array<{
      season?: number;
      week?: number;
      homeTeam?: string;
      awayTeam?: string;
    }>;

    const gameSeasonWeek = new Map<string, GameSeasonWeek>();
    for (const raw of games) {
      const g = raw as {
        id?: string;
        homeTeamName?: string;
        awayTeamName?: string;
        commenceTime?: Date | string;
      };
      if (!g.id) continue;
      const commence =
        g.commenceTime instanceof Date ? g.commenceTime : new Date(String(g.commenceTime ?? ""));
      const season = Number.isFinite(commence.getTime()) ? commence.getUTCFullYear() : null;
      if (season == null) continue;
      const homeAbbr = resolveKalshiTeamAbbr("NFL", g.homeTeamName ?? "") ?? "";
      const awayAbbr = resolveKalshiTeamAbbr("NFL", g.awayTeamName ?? "") ?? "";
      const hit = scheduleRows.find((s) => {
        if (s.season !== season) return false;
        const sh = (s.homeTeam ?? "").trim().toUpperCase();
        const sa = (s.awayTeam ?? "").trim().toUpperCase();
        if (homeAbbr && awayAbbr) {
          return sh === homeAbbr && sa === awayAbbr;
        }
        return (
          sh.toLowerCase() === (g.homeTeamName ?? "").trim().toLowerCase() &&
          sa.toLowerCase() === (g.awayTeamName ?? "").trim().toLowerCase()
        );
      });
      if (hit && typeof hit.week === "number") {
        gameSeasonWeek.set(g.id, { season, week: hit.week });
      }
    }

    const players = await safeFindMany(db, "player", {
      select: { id: true, gsisId: true, fullName: true },
    });
    const identityRows: PlayerIdentityRow[] = [];
    for (const raw of players) {
      const p = raw as { id?: string; gsisId?: string; fullName?: string };
      if (!p.gsisId) continue;
      identityRows.push({
        gsisId: p.gsisId,
        fullName: p.fullName ?? "",
        playerDbId: p.id ?? null,
      });
    }

    const snaps = await safeFindMany(db, "snapCount", {
      select: {
        playerId: true,
        pfrPlayerId: true,
        playerName: true,
        season: true,
        week: true,
        offenseSnaps: true,
      },
    });
    const snapRows: SnapCountRow[] = [];
    const playerIdMap = buildPlayerIdMap(identityRows);
    for (const raw of snaps) {
      const s = raw as {
        playerId?: string | null;
        pfrPlayerId?: string | null;
        playerName?: string;
        season?: number;
        week?: number;
        offenseSnaps?: number | null;
      };
      if (typeof s.season !== "number" || typeof s.week !== "number") continue;
      let gsis: string | null = null;
      // SnapCount.playerId is the internal cuid; bridge via gsisToDbId.
      if (s.playerId) {
        for (const [gs, dbId] of playerIdMap.gsisToDbId) {
          if (dbId === s.playerId) {
            gsis = gs;
            break;
          }
        }
      }
      if (!gsis && s.pfrPlayerId) {
        gsis = playerIdMap.byPfr.get(s.pfrPlayerId) ?? null;
      }
      if (!gsis && s.playerName) {
        gsis = playerIdMap.bySlug.get(slugFromName(s.playerName)) ?? null;
      }
      snapRows.push({
        gsisId: gsis,
        pfrPlayerId: s.pfrPlayerId ?? null,
        season: s.season,
        week: s.week,
        offenseSnaps: typeof s.offenseSnaps === "number" ? s.offenseSnaps : null,
      });
    }

    const dbIds = Array.from(playerIdMap.gsisToDbId.values());
    const statsRaw = await safeFindMany(db, "playerGameStat", {
      where: dbIds.length > 0 ? { playerId: { in: dbIds } } : {},
      select: {
        playerId: true,
        season: true,
        week: true,
        seasonType: true,
        attempts: true,
        carries: true,
        receptions: true,
        targets: true,
        receivingYards: true,
        rushingYards: true,
      },
    });
    const dbIdToGsis = new Map<string, string>();
    for (const [gs, dbId] of playerIdMap.gsisToDbId) dbIdToGsis.set(dbId, gs);
    const weekStats: PlayerWeekStatRow[] = [];
    for (const raw of statsRaw) {
      const s = raw as {
        playerId?: string;
        season?: number;
        week?: number;
        seasonType?: string;
        attempts?: number | null;
        carries?: number | null;
        receptions?: number | null;
        targets?: number | null;
        receivingYards?: number | null;
        rushingYards?: number | null;
      };
      const gsis = s.playerId ? dbIdToGsis.get(s.playerId) : undefined;
      if (!gsis || typeof s.season !== "number" || typeof s.week !== "number") continue;
      weekStats.push({
        gsisId: gsis,
        season: s.season,
        week: s.week,
        seasonType: s.seasonType,
        attempts: s.attempts ?? null,
        carries: s.carries ?? null,
        receptions: s.receptions ?? null,
        targets: s.targets ?? null,
        receivingYards: s.receivingYards ?? null,
        rushingYards: s.rushingYards ?? null,
      });
    }

    return buildPropSampleLines({
      archiveRows,
      gameSeasonWeek,
      playerIdMap,
      playerWeekStats: weekStats,
      snapCounts: snapRows,
    });
  } catch {
    return [];
  }
}

// ── C-414 weather attach + per-slate coverage ──────────────────────────────

/**
 * Attach kickoff-hour weather onto already-built prop lines, null-safe.
 * A game absent from `weatherByGameId` keeps `weather: null` — never imputed.
 * Returns the coverage counters the DoD requires the caller to log per slate.
 */
export function attachWeatherToPropLines(args: {
  readonly lines: readonly PropSampleLine[];
  readonly weatherByGameId: ReadonlyMap<string, KickoffWeatherField>;
}): { readonly lines: readonly PropSampleLine[]; readonly coverage: WeatherSlateCoverage } {
  const seen = new Set<string>();
  const lines = args.lines.map((line) => {
    const weather = args.weatherByGameId.get(line.gameId) ?? null;
    if (weather) seen.add(line.gameId);
    return { ...line, weather };
  });

  const uniqueGameIds = new Set(args.lines.map((l) => l.gameId));
  let dome = 0;
  let outdoorComplete = 0;
  let outdoorPartial = 0;
  const bySource: Record<string, number> = {};
  for (const gameId of uniqueGameIds) {
    const field = args.weatherByGameId.get(gameId);
    if (!field) continue;
    bySource[field.source] = (bySource[field.source] ?? 0) + 1;
    if (field.isDome) dome += 1;
    else if (field.windMph !== null && field.tempF !== null) outdoorComplete += 1;
    else outdoorPartial += 1;
  }

  return {
    lines,
    coverage: {
      totalGames: uniqueGameIds.size,
      inWindow: uniqueGameIds.size,
      joined: seen.size,
      missing: uniqueGameIds.size - seen.size,
      outsideWindow: 0,
      dome,
      outdoorComplete,
      outdoorPartial,
      bySource,
    },
  };
}

/**
 * Log weather coverage for one prop slate. Call after `attachWeatherToPropLines`
 * (or after a `buildPropSampleLines` that already carried `weatherByGameId`).
 * Pure string — the caller chooses the sink (console / structured log).
 */
export function logPropSlateWeatherCoverage(coverage: WeatherSlateCoverage): string {
  return formatWeatherCoverageLog(coverage);
}
