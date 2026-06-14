/**
 * Injury-report ingestion (nflverse `injuries` → Injury).
 *
 * Weekly injury/practice report status per player. Clearance-gated and
 * rights/freshness-stamped. Idempotent per season (the season's rows are
 * replaced on each run). Carries the gsis id so a later crosswalk can link to
 * the Player table; `playerId` is left null for now.
 *
 * NOTE: nflverse injuries are the lagged weekly *report*, not a live inactives
 * feed. They are facts as published; nothing here is a forecast.
 */
import { fetchNflverse, type NflverseDatasetKey } from "@sports/data-ingestion";
import { db } from "@sports/db";
import { nflverseIngestionGate } from "@/lib/ingestion/nflverse-gate";

type CsvRow = Readonly<Record<string, string>>;
type TableFetcher = (key: NflverseDatasetKey, season: number, variant?: string) => Promise<{ records: readonly CsvRow[] }>;

export interface InjuryIngestResult {
  readonly status: "ok" | "clearance-denied" | "source-error";
  readonly season: number;
  readonly rowsWritten: number;
  readonly blocks?: readonly string[];
  readonly error?: string;
}

function int(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export async function ingestInjuries(
  season: number,
  options: { now?: Date; fetcher?: TableFetcher } = {},
): Promise<InjuryIngestResult> {
  const now = options.now ?? new Date();
  const fetchTable: TableFetcher = options.fetcher ?? fetchNflverse;

  const gate = nflverseIngestionGate(now);
  if (!gate.ok) return { status: "clearance-denied", season, rowsWritten: 0, blocks: gate.blocks };

  let rows: readonly CsvRow[];
  try {
    rows = (await fetchTable("injuries", season)).records;
  } catch (error) {
    return { status: "source-error", season, rowsWritten: 0, error: error instanceof Error ? error.message : "fetch failed" };
  }

  const data = [];
  for (const r of rows) {
    const playerName = r["full_name"];
    if (!playerName) continue;
    data.push({
      gsisId: r["gsis_id"] ?? null,
      playerName,
      season: int(r["season"]) ?? season,
      week: int(r["week"]) ?? 0,
      team: r["team"] ?? null,
      position: r["position"] ?? null,
      reportStatus: r["report_status"] ?? null,
      practiceStatus: r["practice_status"] ?? null,
      primaryInjury: r["report_primary_injury"] ?? r["practice_primary_injury"] ?? null,
      sourceId: "nflverse",
      rightsSnapshot: gate.rightsSnapshot,
      fetchedAt: now,
    });
  }

  // Idempotent per season: replace the season's rows.
  await db.injury.deleteMany({ where: { season } });
  const created = data.length > 0 ? await db.injury.createMany({ data }) : null;

  return { status: "ok", season, rowsWritten: created?.count ?? data.length };
}
