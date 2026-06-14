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
import { fetchNflverse, type NflverseDatasetKey } from "@sports/data-ingestion";
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
 * NFL seasons are labelled by their starting year (~September). Before September
 * the most recent labelled season is the prior calendar year.
 */
export function currentNflSeason(now = new Date()): number {
  return now.getUTCMonth() >= 8 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
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
  const fetchTable: TableFetcher = options.fetcher ?? fetchNflverse;

  // 1. Clearance gate. A denied result MUST stop the job (CLAUDE.md invariant).
  const gate = nflverseIngestionGate(now);
  if (!gate.ok) {
    return { status: "clearance-denied", season, playersUpserted: 0, statsUpserted: 0, blocks: gate.blocks };
  }
  const rightsSnapshot = gate.rightsSnapshot;

  // 2. Fetch the real nflverse weekly asset.
  let rows: readonly CsvRow[];
  try {
    const table = await fetchTable("player_stats_week", season);
    rows = table.records;
  } catch (error) {
    return {
      status: "source-error",
      season,
      playersUpserted: 0,
      statsUpserted: 0,
      error: error instanceof Error ? error.message : "fetch failed",
    };
  }

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
      recentTeam: r["recent_team"] ?? null,
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
      team: r["recent_team"] ?? null,
      opponent: r["opponent_team"] ?? null,
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
