/**
 * Snap-counts ingestion (nflverse `snap_counts` → SnapCount).
 *
 * Offense/defense/special-teams snaps + share per player-game. Clearance-gated
 * and rights/freshness-stamped like every nflverse path. Idempotent per season
 * (the season's rows are replaced on each run). Rows key off the PFR player id
 * (the asset's natural id); linkage to the gsis-keyed Player table is a later
 * crosswalk step, so `playerId` is left null for now.
 */
import { fetchNflverse, type NflverseDatasetKey } from "@sports/data-ingestion";
import { db } from "@sports/db";
import { nflverseIngestionGate } from "@/lib/ingestion/nflverse-gate";

type CsvRow = Readonly<Record<string, string>>;
type TableFetcher = (key: NflverseDatasetKey, season: number, variant?: string) => Promise<{ records: readonly CsvRow[] }>;

export interface SnapCountIngestResult {
  readonly status: "ok" | "clearance-denied" | "source-error";
  readonly season: number;
  readonly rowsWritten: number;
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

export async function ingestSnapCounts(
  season: number,
  options: { now?: Date; fetcher?: TableFetcher } = {},
): Promise<SnapCountIngestResult> {
  const now = options.now ?? new Date();
  const fetchTable: TableFetcher = options.fetcher ?? fetchNflverse;

  const gate = nflverseIngestionGate(now);
  if (!gate.ok) return { status: "clearance-denied", season, rowsWritten: 0, blocks: gate.blocks };

  let rows: readonly CsvRow[];
  try {
    rows = (await fetchTable("snap_counts", season)).records;
  } catch (error) {
    return { status: "source-error", season, rowsWritten: 0, error: error instanceof Error ? error.message : "fetch failed" };
  }

  const data = [];
  for (const r of rows) {
    const playerName = r["player"];
    if (!playerName) continue;
    data.push({
      pfrPlayerId: r["pfr_player_id"] ?? null,
      playerName,
      season: int(r["season"]) ?? season,
      week: int(r["week"]) ?? 0,
      seasonType: (r["game_type"] ?? "REG").toUpperCase().startsWith("POST") ? "POST" : "REG",
      team: r["team"] ?? null,
      opponent: r["opponent"] ?? null,
      position: r["position"] ?? null,
      offenseSnaps: int(r["offense_snaps"]),
      offensePct: num(r["offense_pct"]),
      defenseSnaps: int(r["defense_snaps"]),
      defensePct: num(r["defense_pct"]),
      stSnaps: int(r["st_snaps"]),
      stPct: num(r["st_pct"]),
      sourceId: "nflverse",
      rightsSnapshot: gate.rightsSnapshot,
      fetchedAt: now,
    });
  }

  // Idempotent per season: replace the season's rows.
  await db.snapCount.deleteMany({ where: { season } });
  const created = data.length > 0 ? await db.snapCount.createMany({ data }) : null;

  return { status: "ok", season, rowsWritten: created?.count ?? data.length };
}
