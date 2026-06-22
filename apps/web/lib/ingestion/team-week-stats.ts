/**
 * Team-week stats ingestion (nflverse `stats_team` → TeamWeekStat).
 *
 * Persists the published team-week aggregates (CC-BY-4.0): offensive EPA/CPOE,
 * air yards, first downs, TDs + headline defensive box. Keyed by team (no player
 * crosswalk). Clearance-gated, rights/freshness stamped, idempotent per season.
 *
 * Phase-A persistence: storage as a system of record. NOT a scoring input.
 * Real columns verified against the live release headers (2026-06-15).
 */
import { fetchNflverse } from "@sports/data-ingestion";
import { db, type Prisma } from "@sports/db";
import { nflverseIngestionGate } from "@/lib/ingestion/nflverse-gate";

type CsvRow = Readonly<Record<string, string>>;
type TeamFetcher = (season: number) => Promise<{ records: readonly CsvRow[] }>;

export interface TeamWeekStatsIngestResult {
  readonly status: "ok" | "clearance-denied" | "source-error";
  readonly season: number;
  readonly rowsWritten: number;
  readonly blocks?: readonly string[];
  readonly error?: string;
}

const num = (v: string | undefined): number | null => {
  if (v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const int = (v: string | undefined): number | null => {
  const n = num(v);
  return n === null ? null : Math.round(n);
};

async function fetchTeam(season: number): Promise<{ records: readonly CsvRow[] }> {
  const table = await fetchNflverse("stats_team_week", season);
  return { records: table.records };
}

function toRecord(r: CsvRow, season: number, rightsSnapshot: Prisma.InputJsonValue, now: Date) {
  return {
    season,
    week: Number(r["week"] ?? "0"),
    seasonType: (r["season_type"] || "REG").toUpperCase().startsWith("POST") ? "POST" : "REG",
    team: r["team"] ?? "",
    opponent: r["opponent_team"] || null,
    completions: int(r["completions"]),
    attempts: int(r["attempts"]),
    passYards: num(r["passing_yards"]),
    passTds: int(r["passing_tds"]),
    passInt: int(r["passing_interceptions"]),
    sacksSuffered: int(r["sacks_suffered"]),
    passAirYards: num(r["passing_air_yards"]),
    passYac: num(r["passing_yards_after_catch"]),
    passFirstDowns: int(r["passing_first_downs"]),
    passEpa: num(r["passing_epa"]),
    passCpoe: num(r["passing_cpoe"]),
    carries: int(r["carries"]),
    rushYards: num(r["rushing_yards"]),
    rushTds: int(r["rushing_tds"]),
    rushFirstDowns: int(r["rushing_first_downs"]),
    rushEpa: num(r["rushing_epa"]),
    receptions: int(r["receptions"]),
    targets: int(r["targets"]),
    recYards: num(r["receiving_yards"]),
    recEpa: num(r["receiving_epa"]),
    defSacks: num(r["def_sacks"]),
    defInterceptions: int(r["def_interceptions"]),
    defQbHits: int(r["def_qb_hits"]),
    defTacklesForLoss: int(r["def_tackles_for_loss"]),
    defPassDefended: int(r["def_pass_defended"]),
    defTds: int(r["def_tds"]),
    sourceId: "nflverse",
    rightsSnapshot,
    fetchedAt: now,
  };
}

export async function ingestTeamWeekStats(
  season: number,
  options: { now?: Date; fetcher?: TeamFetcher } = {},
): Promise<TeamWeekStatsIngestResult> {
  const now = options.now ?? new Date();
  const fetchTable: TeamFetcher = options.fetcher ?? fetchTeam;

  const gate = nflverseIngestionGate(now);
  if (!gate.ok) return { status: "clearance-denied", season, rowsWritten: 0, blocks: gate.blocks };

  let records: readonly CsvRow[];
  try {
    records = (await fetchTable(season)).records;
  } catch (error) {
    return { status: "source-error", season, rowsWritten: 0, error: error instanceof Error ? error.message : "fetch failed" };
  }

  const data = records
    .filter((r) => (r["team"] ?? "") !== "" && Number(r["week"] ?? "0") >= 1)
    .map((r) => toRecord(r, season, gate.rightsSnapshot, now));

    // Never wipe existing rows on an empty upstream response (transient
  // outage / empty mirror): preserve what's there and report a source-error.
  if (data.length === 0) {
    return { status: "source-error", season, rowsWritten: 0, error: "upstream returned no rows; existing data preserved" };
  }
  await db.teamWeekStat.deleteMany({ where: { season } });
  const created = data.length > 0 ? await db.teamWeekStat.createMany({ data }) : null;

  return { status: "ok", season, rowsWritten: created?.count ?? data.length };
}
