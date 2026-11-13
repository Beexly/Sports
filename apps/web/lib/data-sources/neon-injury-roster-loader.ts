/**
 * Live Neon injury + active-roster verification loader (WP-3).
 *
 * Replaces static WEEK8/WEEK9 roster arrays with a live join of the Week 10
 * injury report (public.injuries, 800 rows / 32 teams) against the evidence
 * tables that prove a player is actually on an active roster:
 *
 *   public.snap_counts        — offensive/defensive/ST snaps per week
 *   public.player_game_stats  — box-score counting stats per week
 *   public.depth_chart_entries— official depth rank per week
 *   public.players            — gsisId → playerId crosswalk
 *
 * DENOMINATOR LAW (gate T-07): every per-game rate divides by the INDIVIDUAL
 * player's games played (player_gp / playerGamesPlayed) — the count of distinct
 * weeks that player actually appears in snap_counts / player_game_stats.
 * Team games played is exposed ONLY as context and is NEVER a rate denominator.
 * A player with zero game evidence gets null rates, never a team-GP fallback
 * and never an invented rate.
 *
 * READ-ONLY. Never prints or returns connection material.
 */
import { withNeonClient, sanitizeDbError } from "./neon-client.js";

// ---------------------------------------------------------------------------
// Row shapes (mirror the Neon columns actually selected)
// ---------------------------------------------------------------------------

export interface InjuryReportRow {
  readonly playerId: string | null;
  readonly gsisId: string | null;
  readonly playerName: string;
  readonly season: number;
  readonly week: number;
  readonly team: string;
  readonly position: string | null;
  readonly reportStatus: string | null;
  readonly practiceStatus: string | null;
  readonly primaryInjury: string | null;
  readonly fetchedAt?: string | Date | null;
}

export interface SnapCountRow {
  readonly playerId: string | null;
  readonly playerName: string;
  readonly season: number;
  readonly week: number;
  readonly team: string;
  readonly offenseSnaps: number | null;
  readonly defenseSnaps: number | null;
  readonly stSnaps: number | null;
}

export interface PlayerGameStatRow {
  readonly playerId: string | null;
  readonly season: number;
  readonly week: number;
  readonly team: string;
  readonly attempts: number | null;
  readonly carries: number | null;
  readonly receptions: number | null;
  readonly targets: number | null;
  readonly receivingYards: number | null;
  readonly rushingYards: number | null;
}

export interface DepthChartRow {
  readonly playerId: string | null;
  readonly gsisId: string | null;
  readonly playerName: string;
  readonly season: number;
  readonly week: number;
  readonly team: string;
  readonly position: string | null;
  readonly depthRank: number | null;
}

export interface PlayerCrosswalkRow {
  readonly id: string;
  readonly gsisId: string | null;
  readonly fullName: string;
}

// ---------------------------------------------------------------------------
// Pure denominator + rate core (unit-tested without a database)
// ---------------------------------------------------------------------------

/**
 * player_gp — the individual player's games played: distinct weeks with ANY
 * game evidence (snaps or a box-score row). Duplicate rows inside one week
 * count once. This is the ONLY legal denominator for per-game rates.
 */
export function playerGamesPlayed(
  snapWeeks: readonly number[],
  statWeeks: readonly number[],
): number {
  const weeks = new Set<number>();
  for (const w of snapWeeks) if (Number.isFinite(w)) weeks.add(w);
  for (const w of statWeeks) if (Number.isFinite(w)) weeks.add(w);
  return weeks.size;
}

/**
 * Per-game rate. Divides STRICTLY by player_gp. When the player has no game
 * evidence (player_gp <= 0) or the numerator is missing, returns null —
 * never falls back to team games played, never fabricates a rate.
 */
export function perGameRate(
  total: number | null | undefined,
  playerGp: number,
): number | null {
  if (total === null || total === undefined || !Number.isFinite(total)) return null;
  if (!Number.isFinite(playerGp) || playerGp <= 0) return null;
  return total / playerGp;
}

export type RosterStatus =
  | "ACTIVE_VERIFIED" // depth entry + game evidence
  | "DEPTH_ONLY" // depth entry, no game evidence yet
  | "REPORT_ONLY"; // injury report only — roster unverified

export interface RosterVerificationRow {
  readonly playerName: string;
  readonly team: string;
  readonly position: string | null;
  readonly playerId: string | null;
  readonly gsisId: string | null;
  readonly reportStatus: string | null;
  readonly practiceStatus: string | null;
  readonly primaryInjury: string | null;
  /** The player's OWN games played (player_gp). Rate denominator. */
  readonly playerGamesPlayed: number;
  /** Context ONLY — never used as a rate denominator. */
  readonly teamGamesPlayed: number | null;
  readonly depthRank: number | null;
  readonly depthWeek: number | null;
  readonly lastSnapWeek: number | null;
  readonly lastStatWeek: number | null;
  readonly rosterStatus: RosterStatus;
  /** reportStatus suggests the player may not suit up (Out / IR / Doubtful). */
  readonly availabilityConcern: boolean;
  readonly offenseSnapsPerGame: number | null;
  readonly targetsPerGame: number | null;
  readonly carriesPerGame: number | null;
  readonly receptionsPerGame: number | null;
  readonly receivingYardsPerGame: number | null;
  readonly rushingYardsPerGame: number | null;
}

const CONCERN_STATUSES = new Set(["out", "doubtful", "injured reserve", "ir"]);

function normName(name: string): string {
  return name.toLowerCase().replace(/[.']/g, "").replace(/\s+/g, " ").trim();
}

function sumNullable(values: readonly (number | null | undefined)[]): number | null {
  let total = 0;
  let seen = false;
  for (const v of values) {
    if (v === null || v === undefined || !Number.isFinite(v)) continue;
    total += v;
    seen = true;
  }
  return seen ? total : null;
}

export interface VerifyRosterInput {
  readonly injuries: readonly InjuryReportRow[];
  readonly snaps: readonly SnapCountRow[];
  readonly stats: readonly PlayerGameStatRow[];
  readonly depth: readonly DepthChartRow[];
  readonly players?: readonly PlayerCrosswalkRow[];
  /** Team games played — context only, never a denominator. */
  readonly teamGames?: Readonly<Record<string, number>>;
}

/**
 * Pure join: injury report × snap counts × box scores × depth charts.
 * Identity resolution order: playerId → gsisId crosswalk → (team, name).
 */
export function verifyActiveRoster(input: VerifyRosterInput): RosterVerificationRow[] {
  const { injuries, snaps, stats, depth, players = [], teamGames = {} } = input;

  const idByGsis = new Map<string, string>();
  const idByNameTeam = new Map<string, string>();
  for (const p of players) {
    if (p.gsisId) idByGsis.set(p.gsisId, p.id);
    idByNameTeam.set(normName(p.fullName), p.id);
  }

  const resolveId = (row: { playerId: string | null; gsisId?: string | null; playerName?: string }): string | null => {
    if (row.playerId) return row.playerId;
    if (row.gsisId && idByGsis.has(row.gsisId)) return idByGsis.get(row.gsisId)!;
    return null;
  };

  // Index evidence by resolved playerId, with (team, name) fallback buckets.
  const snapsById = new Map<string, SnapCountRow[]>();
  const snapsByName = new Map<string, SnapCountRow[]>();
  for (const s of snaps) {
    const id = resolveId(s);
    if (id) {
      const b = snapsById.get(id);
      if (b) b.push(s);
      else snapsById.set(id, [s]);
    }
    const key = `${s.team}::${normName(s.playerName)}`;
    const b = snapsByName.get(key);
    if (b) b.push(s);
    else snapsByName.set(key, [s]);
  }

  const statsById = new Map<string, PlayerGameStatRow[]>();
  for (const s of stats) {
    const id = resolveId(s);
    if (!id) continue;
    const b = statsById.get(id);
    if (b) b.push(s);
    else statsById.set(id, [s]);
  }

  // Latest depth entry per player (by week, then best rank).
  const depthById = new Map<string, DepthChartRow>();
  const depthByName = new Map<string, DepthChartRow>();
  const considerDepth = (map: Map<string, DepthChartRow>, key: string, row: DepthChartRow) => {
    const prev = map.get(key);
    if (
      !prev ||
      row.week > prev.week ||
      (row.week === prev.week && (row.depthRank ?? 99) < (prev.depthRank ?? 99))
    ) {
      map.set(key, row);
    }
  };
  for (const d of depth) {
    const id = resolveId(d);
    if (id) considerDepth(depthById, id, d);
    considerDepth(depthByName, `${d.team}::${normName(d.playerName)}`, d);
  }

  const out: RosterVerificationRow[] = [];
  for (const inj of injuries) {
    const id = resolveId(inj);
    const nameKey = `${inj.team}::${normName(inj.playerName)}`;

    const snapRows = (id ? snapsById.get(id) : undefined) ?? snapsByName.get(nameKey) ?? [];
    const statRows = (id ? statsById.get(id) : undefined) ?? [];
    const depthRow = (id ? depthById.get(id) : undefined) ?? depthByName.get(nameKey) ?? null;

    // player_gp: distinct weeks of actual game evidence for THIS player.
    const snapWeeks = snapRows
      .filter((s) => (s.offenseSnaps ?? 0) > 0 || (s.defenseSnaps ?? 0) > 0 || (s.stSnaps ?? 0) > 0)
      .map((s) => s.week);
    const statWeeks = statRows.map((s) => s.week);
    const playerGp = playerGamesPlayed(snapWeeks, statWeeks);

    const offenseSnaps = sumNullable(snapRows.map((s) => s.offenseSnaps));
    const targets = sumNullable(statRows.map((s) => s.targets));
    const carries = sumNullable(statRows.map((s) => s.carries));
    const receptions = sumNullable(statRows.map((s) => s.receptions));
    const receivingYards = sumNullable(statRows.map((s) => s.receivingYards));
    const rushingYards = sumNullable(statRows.map((s) => s.rushingYards));

    const hasDepth = depthRow !== null && (depthRow.depthRank ?? 0) >= 1;
    const rosterStatus: RosterStatus = hasDepth
      ? playerGp >= 1
        ? "ACTIVE_VERIFIED"
        : "DEPTH_ONLY"
      : "REPORT_ONLY";

    const reportStatus = inj.reportStatus;
    const availabilityConcern =
      reportStatus !== null && CONCERN_STATUSES.has(reportStatus.toLowerCase().trim());

    out.push({
      playerName: inj.playerName,
      team: inj.team,
      position: inj.position ?? depthRow?.position ?? null,
      playerId: id,
      gsisId: inj.gsisId,
      reportStatus,
      practiceStatus: inj.practiceStatus,
      primaryInjury: inj.primaryInjury,
      playerGamesPlayed: playerGp,
      teamGamesPlayed: teamGames[inj.team] ?? null,
      depthRank: depthRow?.depthRank ?? null,
      depthWeek: depthRow?.week ?? null,
      lastSnapWeek: snapWeeks.length ? Math.max(...snapWeeks) : null,
      lastStatWeek: statWeeks.length ? Math.max(...statWeeks) : null,
      rosterStatus,
      availabilityConcern,
      // Every rate below divides by playerGamesPlayed (player_gp) — NEVER team GP.
      offenseSnapsPerGame: perGameRate(offenseSnaps, playerGp),
      targetsPerGame: perGameRate(targets, playerGp),
      carriesPerGame: perGameRate(carries, playerGp),
      receptionsPerGame: perGameRate(receptions, playerGp),
      receivingYardsPerGame: perGameRate(receivingYards, playerGp),
      rushingYardsPerGame: perGameRate(rushingYards, playerGp),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Live loader
// ---------------------------------------------------------------------------

export interface InjuryRosterLoadResult {
  readonly season: number;
  readonly week: number;
  readonly injuryRows: number;
  readonly teams: number;
  readonly rows: RosterVerificationRow[];
  readonly statusCounts: Record<RosterStatus, number>;
  readonly maxFetchedAt: string | null;
}

export interface LoadInjuryRosterOptions {
  readonly season?: number;
  readonly week?: number;
}

/**
 * Load the live Week 10 injury report joined with active-roster evidence.
 * Defaults: season 2026, week 10 (the current 800-row / 32-team report).
 */
export async function loadWeek10InjuryRoster(
  options: LoadInjuryRosterOptions = {},
): Promise<InjuryRosterLoadResult> {
  const season = options.season ?? 2026;
  const week = options.week ?? 10;
  try {
    return await withNeonClient(async (client) => {
      const injuries = await client.query(
        `SELECT "playerId", "gsisId", "playerName", season, week, team, position,
                "reportStatus", "practiceStatus", "primaryInjury", "fetchedAt"
           FROM public.injuries
          WHERE season = $1 AND week = $2`,
        [season, week],
      );
      // Evidence: every completed week of the season up to the report week.
      const snaps = await client.query(
        `SELECT "playerId", "playerName", season, week, team,
                "offenseSnaps", "defenseSnaps", "stSnaps"
           FROM public.snap_counts
          WHERE season = $1 AND week <= $2`,
        [season, week],
      );
      const stats = await client.query(
        `SELECT "playerId", season, week, team, attempts, carries, receptions,
                targets, "receivingYards", "rushingYards"
           FROM public.player_game_stats
          WHERE season = $1 AND week <= $2`,
        [season, week],
      );
      const depth = await client.query(
        `SELECT "playerId", "gsisId", "playerName", season, week, team, position, "depthRank"
           FROM public.depth_chart_entries
          WHERE season = $1 AND week <= $2`,
        [season, week],
      );
      const players = await client.query(
        `SELECT id, "gsisId", "fullName" FROM public.players`,
      );

      // Team games played — context only (distinct weeks with team snap rows).
      const teamWeeks = new Map<string, Set<number>>();
      for (const s of snaps.rows as SnapCountRow[]) {
        let set = teamWeeks.get(s.team);
        if (!set) {
          set = new Set();
          teamWeeks.set(s.team, set);
        }
        set.add(s.week);
      }
      const teamGames: Record<string, number> = {};
      for (const [team, weeks] of teamWeeks) teamGames[team] = weeks.size;

      const rows = verifyActiveRoster({
        injuries: injuries.rows as InjuryReportRow[],
        snaps: snaps.rows as SnapCountRow[],
        stats: stats.rows as PlayerGameStatRow[],
        depth: depth.rows as DepthChartRow[],
        players: players.rows as PlayerCrosswalkRow[],
        teamGames,
      });

      const statusCounts: Record<RosterStatus, number> = {
        ACTIVE_VERIFIED: 0,
        DEPTH_ONLY: 0,
        REPORT_ONLY: 0,
      };
      for (const r of rows) statusCounts[r.rosterStatus] += 1;

      let maxFetched: number | null = null;
      for (const r of injuries.rows as InjuryReportRow[]) {
        const t = r.fetchedAt ? new Date(r.fetchedAt).getTime() : NaN;
        if (Number.isFinite(t) && (maxFetched === null || t > maxFetched)) maxFetched = t;
      }

      return {
        season,
        week,
        injuryRows: rows.length,
        teams: new Set(rows.map((r) => r.team)).size,
        rows,
        statusCounts,
        maxFetchedAt: maxFetched !== null ? new Date(maxFetched).toISOString() : null,
      };
    });
  } catch (error) {
    throw new Error(`loadWeek10InjuryRoster failed: ${sanitizeDbError(error)}`);
  }
}