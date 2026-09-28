/**
 * Player weekly-stats ingestion (nflverse → system of record).
 *
 * Persists the free nflverse `player_stats_week` release asset into the
 * Player / PlayerGameStat tables. This is the first ingestion path to actually
 * enforce the Scraping Clearance Engine: the job is gated by `checkClearance`
 * and every persisted row carries the point-in-time `RightsSnapshot` it
 * returned plus `fetchedAt` — honoring the CLAUDE.md rights + no-stale-data
 * invariants. These are HISTORICAL facts only; nothing here feeds the
 * prediction engine (that is a separate, gated MODEL_VERSION step).
 *
 * nflverse is CC-BY-4.0 (free) so this can run on a frequent cadence at no
 * metered cost — unlike the paid Odds API path.
 */
import {
  fetchNflverse,
  fetchNflversePlayerStatsWeek,
  ingestionTargetNflSeason as ingestionTargetSeasonFromLabel,
  resolveFootballStatsSeason,
  type NflverseDatasetKey,
} from "@sports/data-ingestion";
import { db } from "@sports/db";
import { nflverseIngestionGate } from "@/lib/ingestion/nflverse-gate";

type CsvRow = Readonly<Record<string, string>>;
type TableFetcher = (key: NflverseDatasetKey, season: number, variant?: string) => Promise<{ records: readonly CsvRow[] }>;

export interface PlayerStatsIngestResult {
  readonly status: "ok" | "clearance-denied" | "source-error";
  readonly season: number;
  readonly playersUpserted: number;
  readonly statsUpserted: number;
  readonly blocks?: readonly string[];
  readonly error?: string;
}

function num(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function int(value: string | undefined): number | null {
  const n = num(value);
  return n === null ? null : Math.round(n);
}

/**
 * Read a field that nflverse has renamed across seasons.
 *
 * WHY (measured 2026-09-28 on live Neon). This file read the team key from
 * `recent_team` alone. nflverse renamed that column after 2024, so
 * `player_game_stats.team` is now written NULL: empty on all 1,068 rows of 2026
 * and all of 2025, while seasons 2020-2024 are fully populated (5,447-5,698 rows
 * each). `opponent` stayed full throughout, which is the tell — one field lost
 * its source and the other did not.
 *
 * WHY IT MATTERS BEYOND A NULL COLUMN. `team` is the join key the whole
 * adjustment layer fans out on (`computeAdjustments` builds `byTeam` from it),
 * so an empty team means every §1 OL_INJURY / §2 SECONDARY_INJURY /
 * §3 PASS_RUSH_INJURY adjustment finds no teammates and silently produces
 * nothing. The ingest reported success. Two 2025+ seasons of player data were
 * invisible to the team-scoped rules.
 *
 * `depth-charts.ts` already carries this exact `pick()` helper and its own
 * comment records the same 2025 schema break; this file was the one that did not
 * get it. Same remedy, same helper shape, so both files resolve a renamed field
 * the same way.
 */
function pick(r: Readonly<Record<string, string>>, keys: readonly string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v !== "") return v;
  }
  return "";
}

/**
 * Team code for a stats row, or null when upstream carries neither spelling.
 * `recent_team` (legacy, populated through 2024) then `team` (2025+).
 */
function teamCode(r: Readonly<Record<string, string>>): string | null {
  const t = pick(r, ["recent_team", "team"]);
  return t === "" ? null : t;
}

/** Opponent code: `opponent_team` legacy, `opponent` 2025+. */
function opponentCode(r: Readonly<Record<string, string>>): string | null {
  const o = pick(r, ["opponent_team", "opponent"]);
  return o === "" ? null : o;
}

/**
 * Stats season for engines + website + crons.
 *
 * Delegates to `resolveFootballStatsSeason` so product surfaces stay on the
 * completed REG floor (through 2025 in Aug 2026) until a newer season has real
 * REG rows — never invents current-season completeness. Callers that need the
 * calendar label (September+) should use `currentNflSeasonLabel` instead.
 */
export function currentNflSeason(now = new Date()): number {
  return resolveFootballStatsSeason(now).season;
}

/**
 * Season the ingestion crons should ASK THE SOURCE for: the labelled current
 * season (September 2026 → 2026), not the completed-REG floor above. The floor
 * is right for display (never advertise an empty season) but wrong for a
 * cursor: following it, the crons re-ingested 2025 for the whole 2026 season.
 * Callers fall back to `currentNflSeason` when the source has not published
 * the labelled season yet, so runs stay green and 2026 is picked up the day
 * nflverse ships week-1 rows.
 */
export function ingestionTargetNflSeason(now = new Date()): number {
  return ingestionTargetSeasonFromLabel(now);
}

/**
 * Ingest one season of weekly player stats. Idempotent: re-running upserts the
 * same rows (unique on player+season+week+seasonType). Returns a summary; never
 * throws on a source/clearance failure — it reports the status instead so the
 * caller (cron/worker) can record an IngestionRun.
 */
export async function ingestPlayerWeeklyStats(
  season: number,
  options: { now?: Date; fetcher?: TableFetcher } = {},
): Promise<PlayerStatsIngestResult> {
  const now = options.now ?? new Date();
  // The season-scoped fetcher is the DEFAULT for this asset and only for it:
  // `player_stats_week` is one 33MB file spanning every season since 1999, so
  // the unfiltered fetch built ~26 seasons of records and the cron was killed
  // for memory. An injected `options.fetcher` (tests, and any other consumer)
  // still wins, so this changes no test's wire format.
  const fetchTable: TableFetcher =
    options.fetcher ??
    ((key: NflverseDatasetKey, s: number, variant?: string) =>
      key === "player_stats_week"
        ? fetchNflversePlayerStatsWeek(key, s, variant)
        : fetchNflverse(key, s, variant));

  // 1. Clearance gate. A denied result MUST stop the job (CLAUDE.md invariant).
  const gate = nflverseIngestionGate(now);
  if (!gate.ok) {
    return { status: "clearance-denied", season, playersUpserted: 0, statsUpserted: 0, blocks: gate.blocks };
  }
  const rightsSnapshot = gate.rightsSnapshot;

  // 2. Fetch the real nflverse weekly asset.
  let fetched: readonly CsvRow[];
  try {
    const table = await fetchTable("player_stats_week", season);
    fetched = table.records;
  } catch (error) {
    return {
      status: "source-error",
      season,
      playersUpserted: 0,
      statsUpserted: 0,
      error: error instanceof Error ? error.message : "fetch failed",
    };
  }

  // 2b. Hard-filter to the REQUESTED season. The combined nflverse
  // `player_stats_week` asset spans every season since 1999 in one file; the
  // cron/planner contract (and the Vercel maxDuration budget) is exactly ONE
  // season per invocation. Without this filter every run would attempt ~26
  // seasons of sequential upserts, time out, and never advance the
  // data-derived backfill cursor.
  const rows = fetched.filter((r) => int(r["season"]) === season);

  // 3. Dedupe players (last row wins for the denormalized fields).
  const players = new Map<
    string,
    { fullName: string; position: string | null; recentTeam: string | null; headshotUrl: string | null }
  >();
  for (const r of rows) {
    const gsis = r["player_id"];
    if (!gsis) continue;
    players.set(gsis, {
      fullName: r["player_display_name"] ?? r["player_name"] ?? gsis,
      position: r["position"] ?? null,
      recentTeam: teamCode(r),
      headshotUrl: r["headshot_url"] ?? null,
    });
  }

  // 4. Upsert players; keep gsis → internal id map for the stat rows.
  const idByGsis = new Map<string, string>();
  let playersUpserted = 0;
  for (const [gsisId, p] of players) {
    const player = await db.player.upsert({
      where: { gsisId },
      create: { gsisId, fullName: p.fullName, position: p.position, recentTeam: p.recentTeam, headshotUrl: p.headshotUrl },
      update: { fullName: p.fullName, position: p.position, recentTeam: p.recentTeam, headshotUrl: p.headshotUrl },
      select: { id: true },
    });
    // Stub client (no DATABASE_URL) returns null — skip rather than crash.
    if (player === null || player === undefined) continue;
    idByGsis.set(gsisId, player.id);
    playersUpserted += 1;
  }

  // 5. Upsert weekly stat rows.
  let statsUpserted = 0;
  for (const r of rows) {
    const gsis = r["player_id"];
    if (!gsis) continue;
    const playerId = idByGsis.get(gsis);
    if (playerId === undefined) continue;
    const rowSeason = int(r["season"]);
    const week = int(r["week"]);
    if (rowSeason === null || week === null) continue;
    const seasonType = (r["season_type"] ?? "REG").toUpperCase().startsWith("POST") ? "POST" : "REG";

    const stat = {
      team: teamCode(r),
      opponent: opponentCode(r),
      attempts: int(r["attempts"]),
      carries: int(r["carries"]),
      receptions: int(r["receptions"]),
      targets: int(r["targets"]),
      targetShare: num(r["target_share"]),
      receivingYards: num(r["receiving_yards"]),
      rushingYards: num(r["rushing_yards"]),
      fantasyPointsPpr: num(r["fantasy_points_ppr"]),
      passingEpa: num(r["passing_epa"]),
      rushingEpa: num(r["rushing_epa"]),
      receivingEpa: num(r["receiving_epa"]),
      sourceId: "nflverse",
      rightsSnapshot,
      fetchedAt: now,
    };

    await db.playerGameStat.upsert({
      where: { playerId_season_week_seasonType: { playerId, season: rowSeason, week, seasonType } },
      create: { playerId, season: rowSeason, week, seasonType, ...stat },
      update: stat,
    });
    statsUpserted += 1;
  }

  return { status: "ok", season, playersUpserted, statsUpserted };
}
