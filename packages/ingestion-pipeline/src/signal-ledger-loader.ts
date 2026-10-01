/**
 * Read the persisted universal-ledger rows for the two sides of a fixture.
 *
 * This is the loader that gives `composeLedger` a production caller. Before it
 * existed the composer ran only in its own test, and the 122,203 rows in
 * `signals` (measured on prod Neon 2026-09-30) were fuel with no engine.
 *
 * THE JOIN, AND WHY IT IS NOT ONE PREDICATE
 * `signals` has no team column and no game column. It is keyed
 * (entityType, entityId, key, season, week), and `entityId` lives in TWO
 * different id spaces depending on the key (both measured on prod):
 *
 *   - `pgs.*` and most `injury.*` rows carry `player_game_stats.playerId`
 *     (35,513 / 35,513 and 2,058 / 6,809 respectively)
 *   - `ngs.*` rows carry `next_gen_stats.gsisId` (1,500 / 1,500), and
 *     `players.gsisId` is the unique canonical crosswalk to the same player
 *
 * So the loader resolves the fixture's roster FIRST (from
 * `player_game_stats`, the table that is populated for every season) and then
 * reads the ledger by that id set. A single `entityId IN (...)` predicate over
 * both id spaces would silently pick up a different player whose gsis id
 * happened to collide, which is why both are looked up and the rows are labelled
 * with which space they came from.
 *
 * TEAM RESOLUTION REUSES THE PROVEN INVERSION
 * `player_game_stats.team` is NULL on every prod row for 2025 and 2026
 * (measured: 2026 = 1,091 rows / 0 non-null; 2025 = 6,396 / 0), so filtering on
 * it returns zero rows forever. The existing `schedule-team-index` resolves a
 * row's club from the schedule instead, and it was falsified against an
 * independently-ingested column before it shipped (414/414 comparable rows
 * agree). This loader uses that same resolution rather than inventing a second
 * one, and it lives in the same package so it is imported, not restated.
 *
 * LEAKAGE
 * Strictly lagged: `week < asOfWeek`, identical to every other lagged surface.
 * A ledger row that describes a game which has not been played yet is not
 * information a pre-game pick may use.
 *
 * ROW CAPS
 * Measured on prod: 120 players in a lagged week return 1,196 ledger rows, so
 * ~10 rows per player. A real club is 22-40 players, so 400 rows per side is
 * roughly 40 players' worth with headroom. The cap bounds the BLEND, and the
 * count of what the cap discarded is reported rather than hidden: a truncated
 * side is a real limitation of the reading, not a detail.
 */

import { db } from "@sports/db";
import { currentNflSeasonLabel } from "@sports/data-ingestion";
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import type { LedgerRow } from "./engine-pick.js";

/**
 * Resolve the NFL season and week a fixture falls in, as a CALENDAR
 * computation. Used only to bound which stored week rows may be read.
 *
 * The date is the sole source: `games` has no season/week column, and neither do
 * `signals`, `player_game_stats`, `injuries` or `snap_counts`. Week 1 is the
 * first Thursday on or after Sep 8 (the earliest the NFL has ever opened) and
 * each later week is seven days after that.
 *
 * A date that cannot be parsed resolves to null and the caller skips the
 * surface rather than guessing a week. A wrong week here is not a formatting
 * bug, it is a wrong lag bound, which is a leakage bug.
 */
export function nflSeasonWeekForDate(date: Date): { season: number; week: number } | null {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
  const season = currentNflSeasonLabel(date);
  const sep8 = Date.UTC(season, 8, 8);
  const openDow = new Date(sep8).getUTCDay();
  const daysToThursday = (4 - openDow + 7) % 7;
  const week1Thursday = sep8 + daysToThursday * 86_400_000;
  const t = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  if (t < week1Thursday) return { season, week: 1 };
  const week = Math.floor((t - week1Thursday) / (7 * 86_400_000)) + 1;
  // Past week 22 the calendar cannot separate REG from POST. Both the stored
  // rows and the adapters treat POST weeks as ordinary weeks, so pass through.
  return { season, week: Math.min(week, 22) };
}

/** Rows blended per side. See the row-cap note in the header. */
export const MAX_LEDGER_ROWS = 400;
/** Players whose roster is consulted per side. */
const MAX_PLAYERS_PER_SIDE = 80;

export interface LedgerLoadInput {
  readonly homeTeam: string;
  readonly awayTeam: string;
  /** Season of the fixture (NFL season label). */
  readonly season: number;
  /** The fixture's as-of week. Rows from this week onward are refused. */
  readonly asOfWeek: number;
  /** Injectable clock. Drives the lag bound's relation to kickoff. */
  readonly now: Date;
}

export interface LedgerSides {
  readonly home: readonly LedgerRow[];
  readonly away: readonly LedgerRow[];
  /** Rows the per-side cap discarded. Non-zero means the reading is partial. */
  readonly homeTruncated: number;
  readonly awayTruncated: number;
  /** Roster size each side resolved. Zero means the join found nothing. */
  readonly homePlayerCount: number;
  readonly awayPlayerCount: number;
  /**
   * Whether the ledger was actually READ.
   *
   * This exists because "the read failed" and "the ledger holds no weighted
   * row" both arrive as two empty arrays, and they must not be allowed to look
   * the same. An empty ledger is a real answer (the engine is silent because
   * there is nothing to say); a failed read is an unknown, and treating it as
   * the former would let a database blip look like a clean negative result in
   * the very record the arbiter will later be scored on.
   *
   * False only when the read itself threw. An unresolvable team or an empty
   * season is a successful read of a ledger that has nothing for this fixture.
   */
  readonly ledgerReadable: boolean;
  /** Human-readable trace. Never contains SQL. */
  readonly notes: readonly string[];
}

const EMPTY_SIDES: LedgerSides = {
  home: [],
  away: [],
  homeTruncated: 0,
  awayTruncated: 0,
  homePlayerCount: 0,
  awayPlayerCount: 0,
  ledgerReadable: false,
  notes: [],
};

/** The same empty sides, but the read itself succeeded. */
function readButEmpty(notes: readonly string[]): LedgerSides {
  return { ...EMPTY_SIDES, ledgerReadable: true, notes };
}

/**
 * Resolve which players belong to each side, in the lagged window.
 *
 * Two populations, matching the proven loader: the stored `team` column when it
 * is set (older seasons), and the schedule-derived opponent inversion when it
 * is NULL (2025 and 2026). Rows that cannot be placed exactly are DROPPED, never
 * attributed to a neighbouring club.
 */
async function resolveRoster(
  client: Pick<typeof db, "playerGameStat">,
  homeAbbr: string,
  awayAbbr: string,
  season: number,
  lagWeek: number,
  opponentsByTeamWeek: ReadonlyMap<string, string>,
): Promise<{ home: readonly string[]; away: readonly string[] }> {
  // The INJECTED client, not the module import: a caller that supplies a client
  // (and every test asserting on what was queried) was otherwise reading the
  // real database here, which is a test that passes for the wrong reason.
  const stored = await client.playerGameStat.findMany({
    where: { season, week: { lt: lagWeek }, team: { in: [homeAbbr, awayAbbr] } },
    select: { playerId: true, team: true },
    orderBy: { week: "desc" },
    take: MAX_PLAYERS_PER_SIDE * 6,
  });

  const home: string[] = [];
  const away: string[] = [];
  const seen = new Set<string>();
  for (const r of stored) {
    if (r.team !== homeAbbr && r.team !== awayAbbr) continue;
    if (seen.has(r.playerId)) continue;
    seen.add(r.playerId);
    (r.team === homeAbbr ? home : away).push(r.playerId);
  }

  // The NULL-team population. An NFL club plays one game a week, so a stat
  // row's opponent names the club it belongs to. The opponents are gathered from
  // the schedule index the caller already built.
  const opponents = new Set<string>();
  for (let week = 1; week < lagWeek; week++) {
    for (const team of [homeAbbr, awayAbbr]) {
      const opp = opponentsByTeamWeek.get(`${season}:${week}:${team}`);
      if (opp) opponents.add(opp);
    }
  }
  if (opponents.size > 0) {
    const nullTeam = await client.playerGameStat.findMany({
      where: { season, week: { lt: lagWeek }, team: null, opponent: { in: [...opponents] } },
      select: { playerId: true, season: true, week: true, opponent: true },
      orderBy: { week: "desc" },
      take: MAX_PLAYERS_PER_SIDE * 6,
    });
    for (const r of nullTeam) {
      const resolved = r.opponent
        ? resolveViaSchedule(opponentsByTeamWeek, r.season, r.week, r.opponent)
        : null;
      if (resolved !== homeAbbr && resolved !== awayAbbr) continue;
      if (seen.has(r.playerId)) continue;
      seen.add(r.playerId);
      (resolved === homeAbbr ? home : away).push(r.playerId);
    }
  }

  return { home: home.slice(0, MAX_PLAYERS_PER_SIDE), away: away.slice(0, MAX_PLAYERS_PER_SIDE) };
}

function resolveViaSchedule(
  index: ReadonlyMap<string, string>,
  season: number,
  week: number,
  opponent: string,
): string | null {
  return index.get(`${season}:${week}:${opponent}`) ?? null;
}

/**
 * Load both sides' ledger rows. Fails open, per surface: any error yields empty
 * sides and a note, never a throw, because a pick must not die on a ledger read.
 */
export async function loadLedgerSides(
  input: LedgerLoadInput,
  opts: {
    readonly db?: Pick<typeof db, "playerGameStat" | "signal" | "player">;
    readonly opponentsByTeamWeek?: ReadonlyMap<string, string>;
  } = {},
): Promise<LedgerSides> {
  const client = opts.db ?? db;
  const notes: string[] = [];
  const homeAbbr = nflTeamAbbr(input.homeTeam);
  const awayAbbr = nflTeamAbbr(input.awayTeam);
  if (homeAbbr === null || awayAbbr === null) {
    return {
      ...EMPTY_SIDES,
      notes: [
        `team abbreviation unresolved (home=${JSON.stringify(input.homeTeam)}, away=${JSON.stringify(input.awayTeam)}); ledger surfaces empty`,
      ],
    };
  }
  if (!Number.isFinite(input.season) || !Number.isFinite(input.asOfWeek) || input.asOfWeek < 1) {
    return { ...EMPTY_SIDES, notes: ["season/week unresolved; ledger surfaces empty"] };
  }

  const lagWeek = input.asOfWeek;
  const index = opts.opponentsByTeamWeek ?? new Map<string, string>();

  let roster: { home: readonly string[]; away: readonly string[] };
  try {
    roster = await resolveRoster(client, homeAbbr, awayAbbr, input.season, lagWeek, index);
  } catch (err) {
    notes.push(
      `roster resolution failed: ${err instanceof Error ? err.message : String(err)}; ledger surfaces empty`,
    );
    return { ...EMPTY_SIDES, notes };
  }

  const allIds = [...roster.home, ...roster.away];
  if (allIds.length === 0) {
    notes.push(
      `no player_game_stats rows resolvable to ${homeAbbr} or ${awayAbbr} for season ${input.season} before week ${lagWeek}; ledger surfaces empty`,
    );
    return readButEmpty(notes);
  }

  // The canonical crosswalk from the roster's playerIds to their gsisIds, so the
  // `ngs.*` rows (which are keyed in the gsis space) join too.
  let gsisByPlayerId: ReadonlyMap<string, string> = new Map();
  try {
    const players = await client.player.findMany({
      where: { id: { in: allIds } },
      select: { id: true, gsisId: true },
    });
    gsisByPlayerId = new Map(players.map((p) => [p.id, p.gsisId]));
  } catch (err) {
    notes.push(
      `player crosswalk unavailable: ${err instanceof Error ? err.message : String(err)}; ngs-keyed ledger rows will not join`,
    );
  }

  const gsisToPlayerId = new Map<string, string>();
  for (const [playerId, gsisId] of gsisByPlayerId) {
    if (gsisId) gsisToPlayerId.set(gsisId, playerId);
  }

  let raw: {
    entityId: string;
    key: string;
    value: number;
    weight: number;
    confidence: number;
    capturedAt: Date;
  }[];
  try {
    raw = await client.signal.findMany({
      where: {
        entityType: "player",
        // Strictly lagged. A row from the as-of week or later describes a game
        // that has not been played, and a pre-game pick may not read it.
        season: input.season,
        week: { lt: lagWeek },
        entityId: { in: [...allIds, ...gsisToPlayerId.keys()] },
      },
      select: {
        entityId: true,
        key: true,
        value: true,
        weight: true,
        confidence: true,
        capturedAt: true,
      },
      orderBy: { capturedAt: "desc" },
      take: MAX_LEDGER_ROWS * 2,
    });
  } catch (err) {
    notes.push(
      `signal read failed: ${err instanceof Error ? err.message : String(err)}; ledger surfaces empty`,
    );
    return { ...EMPTY_SIDES, notes };
  }

  // A row keyed by gsisId is attributed to the player it belongs to, so both
  // sides bucket by the SAME id space and the home/away split is unambiguous.
  const homeSet = new Set(roster.home);
  const awaySet = new Set(roster.away);
  const homeRows: LedgerRow[] = [];
  const awayRows: LedgerRow[] = [];
  for (const r of raw) {
    const playerId = homeSet.has(r.entityId) || awaySet.has(r.entityId)
      ? r.entityId
      : gsisToPlayerId.get(r.entityId);
    if (playerId === undefined) continue;
    if (!Number.isFinite(r.value)) continue;
    const row: LedgerRow = {
      entityId: playerId,
      key: r.key,
      value: r.value,
      weight: Number.isFinite(r.weight) ? Math.max(0, r.weight) : 0,
      confidence: Number.isFinite(r.confidence) ? r.confidence : 0,
      capturedAt: r.capturedAt,
    };
    if (homeSet.has(playerId)) homeRows.push(row);
    else if (awaySet.has(playerId)) awayRows.push(row);
  }

  const home = homeRows.slice(0, MAX_LEDGER_ROWS);
  const away = awayRows.slice(0, MAX_LEDGER_ROWS);
  const homeTruncated = homeRows.length - home.length;
  const awayTruncated = awayRows.length - away.length;
  if (homeTruncated > 0 || awayTruncated > 0) {
    notes.push(
      `ledger row cap reached (${MAX_LEDGER_ROWS} per side); ` +
        `discarded home ${homeTruncated}, away ${awayTruncated} lower-weighted rows, so the blended reading is partial`,
    );
  }

  return {
    home,
    away,
    homeTruncated,
    awayTruncated,
    homePlayerCount: roster.home.length,
    awayPlayerCount: roster.away.length,
    // The read completed. Whatever it returned, it is a real answer.
    ledgerReadable: true,
    notes,
  };
}
