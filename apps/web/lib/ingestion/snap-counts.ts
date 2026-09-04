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
    // Never wipe existing rows on an empty upstream response (transient
  // outage / empty mirror): preserve what's there and report a source-error.
  if (data.length === 0) {
    return { status: "source-error", season, rowsWritten: 0, error: "upstream returned no rows; existing data preserved" };
  }
  // ATOMIC SEASON REPLACE — the delete and the insert commit together or not
  // at all. Issued as two separate awaits, any failure between them (a row the
  // DB rejects, a connection drop, a pooled-connection or route timeout) leaves
  // the season DELETED and never re-inserted. A retry re-enters the same
  // delete-first path, so it cannot self-heal, and the empty-upstream guard
  // above does not cover it: `data` WAS non-empty — the delete simply landed
  // and the insert did not. Same defect class as the team-efficiency season
  // replace. `data.length > 0` is guaranteed by the guard above, so the old
  // ternary is dead and the insert is unconditional.
  const [, created] = await db.$transaction([
    db.snapCount.deleteMany({ where: { season } }),
    db.snapCount.createMany({ data }),
  ]);

  return { status: "ok", season, rowsWritten: created?.count ?? data.length };
}
