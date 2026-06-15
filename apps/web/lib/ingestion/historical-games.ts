/**
 * Historical games ingestion (nflverse `schedules` / games.csv → HistoricalGame).
 *
 * One settled row per game since 1999: closing spread/total/moneylines + final
 * score + result. The `schedules` asset is a SINGLE file across all seasons, so
 * one fetch backfills the entire history. Clearance-gated and rights/freshness
 * stamped. This is the real settled (forecast, outcome) archive that the engine
 * backtest and calibration run against — facts only, never a forecast.
 */
import { fetchNflverse, type NflverseDatasetKey } from "@sports/data-ingestion";
import { db } from "@sports/db";
import { nflverseIngestionGate } from "@/lib/ingestion/nflverse-gate";

type CsvRow = Readonly<Record<string, string>>;
type TableFetcher = (key: NflverseDatasetKey, season: number, variant?: string) => Promise<{ records: readonly CsvRow[] }>;

export interface HistoricalGamesIngestResult {
  readonly status: "ok" | "clearance-denied" | "source-error";
  readonly rowsWritten: number;
  readonly seasons: number; // distinct seasons covered
  readonly blocks?: readonly string[];
  readonly error?: string;
}

function num(value: string | undefined): number | null {
  if (value === undefined || value === "" || value === "NA") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function int(value: string | undefined): number | null {
  const n = num(value);
  return n === null ? null : Math.round(n);
}

const CREATE_CHUNK = 2000; // keep Postgres bound-parameter count well under its limit

export async function ingestHistoricalGames(
  options: { now?: Date; fetcher?: TableFetcher } = {},
): Promise<HistoricalGamesIngestResult> {
  const now = options.now ?? new Date();
  const fetchTable: TableFetcher = options.fetcher ?? fetchNflverse;

  const gate = nflverseIngestionGate(now);
  if (!gate.ok) return { status: "clearance-denied", rowsWritten: 0, seasons: 0, blocks: gate.blocks };

  let rows: readonly CsvRow[];
  try {
    rows = (await fetchTable("schedules", 0)).records; // schedules is one file across all seasons
  } catch (error) {
    return { status: "source-error", rowsWritten: 0, seasons: 0, error: error instanceof Error ? error.message : "fetch failed" };
  }

  const seasons = new Set<number>();
  const data = [];
  for (const r of rows) {
    const season = int(r["season"]);
    const week = int(r["week"]);
    const awayTeam = r["away_team"];
    const homeTeam = r["home_team"];
    if (season === null || week === null || !awayTeam || !homeTeam) continue;
    const homeScore = int(r["home_score"]);
    const awayScore = int(r["away_score"]);
    seasons.add(season);
    data.push({
      gameKey: r["game_id"] || `${season}_${String(week).padStart(2, "0")}_${awayTeam}_${homeTeam}`,
      season,
      week,
      gameType: r["game_type"] || "REG",
      awayTeam,
      homeTeam,
      awayScore,
      homeScore,
      result: num(r["result"]) ?? (homeScore !== null && awayScore !== null ? homeScore - awayScore : null),
      spreadLine: num(r["spread_line"]),
      totalLine: num(r["total_line"]),
      awayMoneyline: int(r["away_moneyline"]),
      homeMoneyline: int(r["home_moneyline"]),
      sourceId: "nflverse",
      rightsSnapshot: gate.rightsSnapshot,
      fetchedAt: now,
    });
  }

  // Idempotent full refresh: historical games are immutable; the current season
  // fills in as it plays. Replace the table, then chunk the insert.
  await db.historicalGame.deleteMany({});
  let rowsWritten = 0;
  for (let i = 0; i < data.length; i += CREATE_CHUNK) {
    const chunk = data.slice(i, i + CREATE_CHUNK);
    const created = await db.historicalGame.createMany({ data: chunk });
    rowsWritten += created?.count ?? chunk.length;
  }

  return { status: "ok", rowsWritten, seasons: seasons.size };
}
