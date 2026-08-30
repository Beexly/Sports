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
  for (const r of rows) {
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
  await db.depthChartEntry.deleteMany({ where: { season } });
  const created = data.length > 0 ? await db.depthChartEntry.createMany({ data }) : null;

  return { status: "ok", season, rowsWritten: created?.count ?? data.length };
}
