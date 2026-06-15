/**
 * Next Gen Stats ingestion (nflverse `nextgen_stats` aggregates → NextGenStat).
 *
 * Persists the FREE, published NGS weekly aggregates (CC-BY-4.0) — not the
 * proprietary raw tracking feed. One pass per (season, statType) variant:
 * passing (time-to-throw, CPOE), receiving (separation, cushion, YAC-over-
 * expected), rushing (rush-yards-over-expected). Keyed by gsis id, idempotent
 * per (season, statType). Clearance-gated, rights/freshness stamped.
 *
 * Phase-A persistence: storage as a system of record. NOT wired into scoring —
 * turning these into a live score input is a separate, calibration-gated step.
 *
 * Season-aggregate rows (week 0 per NGS convention) are skipped so the table
 * holds a single, non-double-counting weekly grain.
 */
import { fetchNflverse } from "@sports/data-ingestion";
import { db, type Prisma } from "@sports/db";
import { nflverseIngestionGate } from "@/lib/ingestion/nflverse-gate";

export type NgsStatType = "passing" | "receiving" | "rushing";

type CsvRow = Readonly<Record<string, string>>;
type NgsFetcher = (season: number, statType: NgsStatType) => Promise<{ records: readonly CsvRow[] }>;

export interface NextGenStatsIngestResult {
  readonly status: "ok" | "clearance-denied" | "source-error";
  readonly season: number;
  readonly statType: NgsStatType;
  readonly rowsWritten: number;
  readonly blocks?: readonly string[];
  readonly error?: string;
}

const num = (v: string | undefined): number | null => {
  if (v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

async function fetchNgs(season: number, statType: NgsStatType): Promise<{ records: readonly CsvRow[] }> {
  const table = await fetchNflverse("ngs", season, statType);
  return { records: table.records };
}

/** Map one NGS row to the persisted shape for its variant (unknown cols → null). */
function toRecord(r: CsvRow, season: number, statType: NgsStatType, rightsSnapshot: Prisma.InputJsonValue, now: Date) {
  const base = {
    gsisId: r["player_gsis_id"] ?? "",
    playerName: r["player_display_name"] ?? "",
    position: r["player_position"] || null,
    season,
    week: Number(r["week"] ?? "0"),
    seasonType: r["season_type"] || "REG",
    team: r["team_abbr"] || null,
    statType,
    // all-variant metrics default null; filled per type below
    avgTimeToThrow: null as number | null,
    avgCompletedAirYards: null as number | null,
    avgIntendedAirYards: null as number | null,
    aggressiveness: null as number | null,
    avgAirYardsToSticks: null as number | null,
    completionPct: null as number | null,
    expectedCompletionPct: null as number | null,
    cpoe: null as number | null,
    passerRating: null as number | null,
    avgCushion: null as number | null,
    avgSeparation: null as number | null,
    pctShareIntendedAirYards: null as number | null,
    catchPct: null as number | null,
    avgYac: null as number | null,
    avgExpectedYac: null as number | null,
    avgYacAboveExpectation: null as number | null,
    rushEfficiency: null as number | null,
    pctAttemptsGte8Defenders: null as number | null,
    avgTimeToLos: null as number | null,
    expectedRushYards: null as number | null,
    rushYardsOverExpected: null as number | null,
    rushYardsOverExpectedPerAtt: null as number | null,
    rushPctOverExpected: null as number | null,
    sourceId: "nflverse",
    rightsSnapshot,
    fetchedAt: now,
  };

  if (statType === "passing") {
    base.avgTimeToThrow = num(r["avg_time_to_throw"]);
    base.avgCompletedAirYards = num(r["avg_completed_air_yards"]);
    base.avgIntendedAirYards = num(r["avg_intended_air_yards"]);
    base.aggressiveness = num(r["aggressiveness"]);
    base.avgAirYardsToSticks = num(r["avg_air_yards_to_sticks"]);
    base.completionPct = num(r["completion_percentage"]);
    base.expectedCompletionPct = num(r["expected_completion_percentage"]);
    base.cpoe = num(r["completion_percentage_above_expectation"]);
    base.passerRating = num(r["passer_rating"]);
  } else if (statType === "receiving") {
    base.avgCushion = num(r["avg_cushion"]);
    base.avgSeparation = num(r["avg_separation"]);
    base.avgIntendedAirYards = num(r["avg_intended_air_yards"]);
    base.pctShareIntendedAirYards = num(r["percent_share_of_intended_air_yards"]);
    base.catchPct = num(r["catch_percentage"]);
    base.avgYac = num(r["avg_yac"]);
    base.avgExpectedYac = num(r["avg_expected_yac"]);
    base.avgYacAboveExpectation = num(r["avg_yac_above_expectation"]);
  } else {
    base.rushEfficiency = num(r["efficiency"]);
    base.pctAttemptsGte8Defenders = num(r["percent_attempts_gte_eight_defenders"]);
    base.avgTimeToLos = num(r["avg_time_to_los"]);
    base.expectedRushYards = num(r["expected_rush_yards"]);
    base.rushYardsOverExpected = num(r["rush_yards_over_expected"]);
    base.rushYardsOverExpectedPerAtt = num(r["rush_yards_over_expected_per_att"]);
    base.rushPctOverExpected = num(r["rush_pct_over_expected"]);
  }
  return base;
}

export async function ingestNextGenStats(
  season: number,
  statType: NgsStatType,
  options: { now?: Date; fetcher?: NgsFetcher } = {},
): Promise<NextGenStatsIngestResult> {
  const now = options.now ?? new Date();
  const fetchTable: NgsFetcher = options.fetcher ?? fetchNgs;

  const gate = nflverseIngestionGate(now);
  if (!gate.ok) return { status: "clearance-denied", season, statType, rowsWritten: 0, blocks: gate.blocks };

  let records: readonly CsvRow[];
  try {
    records = (await fetchTable(season, statType)).records;
  } catch (error) {
    return { status: "source-error", season, statType, rowsWritten: 0, error: error instanceof Error ? error.message : "fetch failed" };
  }

  const data = records
    // Skip NGS season-aggregate rows (week 0) and rows with no player key.
    .filter((r) => Number(r["week"] ?? "0") >= 1 && (r["player_gsis_id"] ?? "") !== "")
    .map((r) => toRecord(r, season, statType, gate.rightsSnapshot, now));

  await db.nextGenStat.deleteMany({ where: { season, statType } });
  const created = data.length > 0 ? await db.nextGenStat.createMany({ data }) : null;

  return { status: "ok", season, statType, rowsWritten: created?.count ?? data.length };
}
