/**
 * Rush-tendency ingestion (nflverse play-by-play → PlayerRushProfile).
 *
 * Aggregates per-rusher run direction (gap + location distribution + EPA/run)
 * from PBP, fetched with COLUMN PROJECTION so the big file stays light. The
 * basis for a gap/zone/power scheme lean. Clearance-gated, rights/freshness
 * stamped, idempotent per season.
 */
import { fetchNflverseText, parseCsv } from "@sports/data-ingestion";
import { db } from "@sports/db";
import { nflverseIngestionGate } from "@/lib/ingestion/nflverse-gate";

type CsvRow = Readonly<Record<string, string>>;
type PbpFetcher = (season: number) => Promise<{ records: readonly CsvRow[] }>;

const PBP_COLUMNS = ["rusher_player_id", "rusher_player_name", "rusher", "run_gap", "run_location", "posteam", "play_type", "epa", "season"];

export interface RushTendenciesIngestResult {
  readonly status: "ok" | "clearance-denied" | "source-error";
  readonly season: number;
  readonly rowsWritten: number;
  readonly blocks?: readonly string[];
  readonly error?: string;
}

interface Agg {
  runs: number;
  guard: number;
  tackle: number;
  end: number;
  left: number;
  middle: number;
  right: number;
  epa: number;
  name: string;
  team: string | null;
}

async function fetchPbp(season: number): Promise<{ records: readonly CsvRow[] }> {
  const text = await fetchNflverseText("pbp", season);
  return { records: parseCsv(text, { columns: PBP_COLUMNS }).records };
}

export async function ingestRushTendencies(
  season: number,
  options: { now?: Date; fetcher?: PbpFetcher } = {},
): Promise<RushTendenciesIngestResult> {
  const now = options.now ?? new Date();
  const fetchTable: PbpFetcher = options.fetcher ?? fetchPbp;

  const gate = nflverseIngestionGate(now);
  if (!gate.ok) return { status: "clearance-denied", season, rowsWritten: 0, blocks: gate.blocks };

  let records: readonly CsvRow[];
  try {
    records = (await fetchTable(season)).records;
  } catch (error) {
    return { status: "source-error", season, rowsWritten: 0, error: error instanceof Error ? error.message : "fetch failed" };
  }

  const byRusher = new Map<string, Agg>();
  for (const r of records) {
    if (r["play_type"] !== "run") continue;
    const gsis = r["rusher_player_id"];
    if (!gsis) continue;
    const a = byRusher.get(gsis) ?? { runs: 0, guard: 0, tackle: 0, end: 0, left: 0, middle: 0, right: 0, epa: 0, name: gsis, team: null };
    a.runs += 1;
    const gap = r["run_gap"];
    if (gap === "guard") a.guard += 1;
    else if (gap === "tackle") a.tackle += 1;
    else if (gap === "end") a.end += 1;
    const loc = r["run_location"];
    if (loc === "left") a.left += 1;
    else if (loc === "middle") a.middle += 1;
    else if (loc === "right") a.right += 1;
    const epa = Number(r["epa"]);
    if (Number.isFinite(epa)) a.epa += epa;
    a.name = r["rusher_player_name"] ?? r["rusher"] ?? a.name;
    a.team = r["posteam"] ?? a.team;
    byRusher.set(gsis, a);
  }

  const data = [];
  for (const [gsisId, a] of byRusher) {
    if (a.runs === 0) continue;
    data.push({
      gsisId,
      playerName: a.name,
      season,
      team: a.team,
      runs: a.runs,
      guardRuns: a.guard,
      tackleRuns: a.tackle,
      endRuns: a.end,
      leftRuns: a.left,
      middleRuns: a.middle,
      rightRuns: a.right,
      epaPerRun: Math.round((a.epa / a.runs) * 1e4) / 1e4,
      sourceId: "nflverse",
      rightsSnapshot: gate.rightsSnapshot,
      fetchedAt: now,
    });
  }

  await db.playerRushProfile.deleteMany({ where: { season } });
  const created = data.length > 0 ? await db.playerRushProfile.createMany({ data }) : null;

  return { status: "ok", season, rowsWritten: created?.count ?? data.length };
}
