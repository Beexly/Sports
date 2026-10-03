/**
 * Depth-chart ingestion (nflverse `depth_charts` → DepthChartEntry).
 *
 * Weekly role/order per player. nflverse changed this asset's columns after 2024,
 * so we resolve each field across both schemas with a multi-name pick (the same
 * approach as the read-only depth-charts loader): legacy (≤2024) uses
 * full_name/club_code/depth_team; new (2025+) uses player_name/team/pos_rank.
 * Clearance-gated, rights/freshness-stamped, idempotent per season, with the
 * gsis→Player crosswalk applied (best effort).
 */
import { fetchNflverse, type NflverseDatasetKey } from "@sports/data-ingestion";
import { db } from "@sports/db";
import { nflverseIngestionGate } from "@/lib/ingestion/nflverse-gate";

type CsvRow = Readonly<Record<string, string>>;
type TableFetcher = (key: NflverseDatasetKey, season: number, variant?: string) => Promise<{ records: readonly CsvRow[] }>;

// Keep Postgres bound-parameter count well under its limit (same pattern and
// value as historical-games.ts). The full-season depth-chart asset is not
// small: measured live 2026-09-09, depth_charts_2026.csv carried 505,423 rows
// across all 32 teams — a single unbatched createMany would fail outright.
const CREATE_CHUNK = 2000;

export interface DepthChartIngestResult {
  readonly status: "ok" | "clearance-denied" | "source-error";
  readonly season: number;
  readonly rowsWritten: number;
  readonly blocks?: readonly string[];
  readonly error?: string;
}

function pick(r: CsvRow, keys: readonly string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v !== "") return v;
  }
  return "";
}
function int(value: string): number | null {
  if (value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/**
 * The 2025+ nflverse depth-charts schema drops the `week` column entirely
 * and instead publishes one row per (team, position) for every refresh
 * timestamp (`dt`) since the season began — depth_charts_2026.csv carried
 * 172 distinct `dt` snapshots (2026-03-22..2026-09-08, 505,423 rows total)
 * as of 2026-09-09 (Devin Review, PR #734). Every row defaults to week 0
 * below (there is no week to read), so writing them unscoped would persist
 * six months of roster churn as one indistinguishable season, not the
 * current depth chart. Legacy (<=2024) rows carry a real week column and
 * are left untouched — each is already a distinct, meaningful row.
 */
function scopeToLatestSnapshot(rows: readonly CsvRow[]): readonly CsvRow[] {
  if (rows.some((r) => pick(r, ["week"]) !== "")) return rows;
  const timestamps = rows.map((r) => r["dt"]).filter((d): d is string => !!d);
  if (timestamps.length === 0) return rows;
  const latest = timestamps.reduce((max, d) => (d > max ? d : max));
  return rows.filter((r) => r["dt"] === latest);
}

export async function ingestDepthCharts(
  season: number,
  options: { now?: Date; fetcher?: TableFetcher } = {},
): Promise<DepthChartIngestResult> {
  const now = options.now ?? new Date();
  const fetchTable: TableFetcher = options.fetcher ?? fetchNflverse;

  const gate = nflverseIngestionGate(now);
  if (!gate.ok) return { status: "clearance-denied", season, rowsWritten: 0, blocks: gate.blocks };

  let rows: readonly CsvRow[];
  try {
    rows = (await fetchTable("depth_charts", season)).records;
  } catch (error) {
    return { status: "source-error", season, rowsWritten: 0, error: error instanceof Error ? error.message : "fetch failed" };
  }

  const playerRows = await db.player.findMany({ select: { id: true, gsisId: true } });
  const idByGsis = new Map((Array.isArray(playerRows) ? playerRows : []).map((p) => [p.gsisId, p.id]));

  const data = [];
  for (const r of scopeToLatestSnapshot(rows)) {
    const playerName = pick(r, ["full_name", "player_name", "football_name", "player"]);
    if (!playerName) continue;
    const depthRank = int(pick(r, ["depth_team", "pos_rank"]));
    const gsisId = pick(r, ["gsis_id", "player_id", "elias_id", "espn_id"]) || null;
    data.push({
      playerId: gsisId ? idByGsis.get(gsisId) ?? null : null,
      gsisId,
      playerName,
      season: int(pick(r, ["season"])) ?? season,
      week: int(pick(r, ["week"])) ?? 0,
      team: pick(r, ["club_code", "team", "recent_team"]).toUpperCase() || null,
      position: pick(r, ["position", "depth_position", "pos_abb", "pos_name"]).toUpperCase() || null,
      depthRank,
      role: pick(r, ["pos_slot", "formation", "pos_grp"]) || null,
      sourceId: "nflverse",
      rightsSnapshot: gate.rightsSnapshot,
      fetchedAt: now,
    });
  }

    // Never wipe existing rows on an empty upstream response (transient
  // outage / empty mirror): preserve what's there and report a source-error.
  if (data.length === 0) {
    return { status: "source-error", season, rowsWritten: 0, error: "upstream returned no rows; existing data preserved" };
  }
  // One atomic transaction covering the delete and every insert batch: a
  // createMany failure partway through must not leave the season's rows
  // erased with only some of the replacement written.
  const chunks: (typeof data)[] = [];
  for (let i = 0; i < data.length; i += CREATE_CHUNK) chunks.push(data.slice(i, i + CREATE_CHUNK));
  const [, ...createdChunks] = await db.$transaction([
    db.depthChartEntry.deleteMany({ where: { season } }),
    ...chunks.map((c) => db.depthChartEntry.createMany({ data: c })),
  ]);
  const rowsWritten = createdChunks.reduce((sum, c) => sum + c.count, 0);

  return { status: "ok", season, rowsWritten };
}
