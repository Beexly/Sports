/**
 * PFR advanced-stats ingestion (nflverse `pfr_advstats` → PfrAdvStat).
 *
 * Persists Pro-Football-Reference charting-grade weekly advanced stats
 * (CC-BY-4.0): QB pressure (sacked/blitzed/hurried/hit/pressured + bad-throw
 * rate), receiving drops/broken tackles, rushing yards before/after contact.
 * Per player-game, keyed by the PFR player id (the asset carries no gsis).
 * Clearance-gated, rights/freshness stamped, idempotent per (season, statType).
 *
 * Phase-A persistence: storage as a system of record. NOT a scoring input.
 * Real columns verified against the live release headers (2026-06-15).
 */
import { fetchNflverse } from "@sports/data-ingestion";
import { db, type Prisma } from "@sports/db";
import { nflverseIngestionGate } from "@/lib/ingestion/nflverse-gate";

export type PfrStatType = "pass" | "rec" | "rush";

type CsvRow = Readonly<Record<string, string>>;
type PfrFetcher = (season: number, statType: PfrStatType) => Promise<{ records: readonly CsvRow[] }>;

export interface PfrAdvStatsIngestResult {
  readonly status: "ok" | "clearance-denied" | "source-error";
  readonly season: number;
  readonly statType: PfrStatType;
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

async function fetchPfr(season: number, statType: PfrStatType): Promise<{ records: readonly CsvRow[] }> {
  const table = await fetchNflverse("pfr_advstats", season, statType);
  return { records: table.records };
}

function toRecord(r: CsvRow, season: number, statType: PfrStatType, rightsSnapshot: Prisma.InputJsonValue, now: Date) {
  const base = {
    pfrPlayerId: r["pfr_player_id"] ?? "",
    playerName: r["pfr_player_name"] ?? "",
    season,
    week: Number(r["week"] ?? "0"),
    seasonType: (r["game_type"] || "REG").toUpperCase().startsWith("POST") ? "POST" : "REG",
    team: r["team"] || null,
    opponent: r["opponent"] || null,
    gameKey: r["game_id"] ?? "",
    statType,
    timesSacked: null as number | null,
    timesBlitzed: null as number | null,
    timesHurried: null as number | null,
    timesHit: null as number | null,
    timesPressured: null as number | null,
    timesPressuredPct: null as number | null,
    passingBadThrows: null as number | null,
    passingBadThrowPct: null as number | null,
    passingDrops: null as number | null,
    passingDropPct: null as number | null,
    receivingBrokenTackles: null as number | null,
    receivingDrop: null as number | null,
    receivingDropPct: null as number | null,
    receivingInt: null as number | null,
    receivingRat: null as number | null,
    carries: null as number | null,
    rushingYardsBeforeContact: null as number | null,
    rushingYardsBeforeContactAvg: null as number | null,
    rushingYardsAfterContact: null as number | null,
    rushingYardsAfterContactAvg: null as number | null,
    rushingBrokenTackles: null as number | null,
    sourceId: "nflverse",
    rightsSnapshot,
    fetchedAt: now,
  };

  if (statType === "pass") {
    base.timesSacked = int(r["times_sacked"]);
    base.timesBlitzed = int(r["times_blitzed"]);
    base.timesHurried = int(r["times_hurried"]);
    base.timesHit = int(r["times_hit"]);
    base.timesPressured = int(r["times_pressured"]);
    base.timesPressuredPct = num(r["times_pressured_pct"]);
    base.passingBadThrows = int(r["passing_bad_throws"]);
    base.passingBadThrowPct = num(r["passing_bad_throw_pct"]);
    base.passingDrops = int(r["passing_drops"]);
    base.passingDropPct = num(r["passing_drop_pct"]);
  } else if (statType === "rec") {
    base.receivingBrokenTackles = int(r["receiving_broken_tackles"]);
    base.receivingDrop = int(r["receiving_drop"]);
    base.receivingDropPct = num(r["receiving_drop_pct"]);
    base.receivingInt = int(r["receiving_int"]);
    base.receivingRat = num(r["receiving_rat"]);
  } else {
    base.carries = int(r["carries"]);
    base.rushingYardsBeforeContact = num(r["rushing_yards_before_contact"]);
    base.rushingYardsBeforeContactAvg = num(r["rushing_yards_before_contact_avg"]);
    base.rushingYardsAfterContact = num(r["rushing_yards_after_contact"]);
    base.rushingYardsAfterContactAvg = num(r["rushing_yards_after_contact_avg"]);
    base.rushingBrokenTackles = int(r["rushing_broken_tackles"]);
  }
  return base;
}

export async function ingestPfrAdvStats(
  season: number,
  statType: PfrStatType,
  options: { now?: Date; fetcher?: PfrFetcher } = {},
): Promise<PfrAdvStatsIngestResult> {
  const now = options.now ?? new Date();
  const fetchTable: PfrFetcher = options.fetcher ?? fetchPfr;

  const gate = nflverseIngestionGate(now);
  if (!gate.ok) return { status: "clearance-denied", season, statType, rowsWritten: 0, blocks: gate.blocks };

  let records: readonly CsvRow[];
  try {
    records = (await fetchTable(season, statType)).records;
  } catch (error) {
    return { status: "source-error", season, statType, rowsWritten: 0, error: error instanceof Error ? error.message : "fetch failed" };
  }

  const data = records
    .filter((r) => (r["pfr_player_id"] ?? "") !== "" && (r["game_id"] ?? "") !== "")
    .map((r) => toRecord(r, season, statType, gate.rightsSnapshot, now));

    // Never wipe existing rows on an empty upstream response (transient
  // outage / empty mirror): preserve what's there and report a source-error.
  if (data.length === 0) {
    return { status: "source-error", season, statType, rowsWritten: 0, error: "upstream returned no rows; existing data preserved" };
  }
  await db.pfrAdvStat.deleteMany({ where: { season, statType } });
  const created = data.length > 0 ? await db.pfrAdvStat.createMany({ data }) : null;

  return { status: "ok", season, statType, rowsWritten: created?.count ?? data.length };
}
