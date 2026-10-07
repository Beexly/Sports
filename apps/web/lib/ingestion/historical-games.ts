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

  // This replaces the ENTIRE multi-season archive (the table calibration and
  // backtests read from). A transient empty upstream must never wipe it:
  // preserve what's there and report a source-error instead of deleting.
  if (data.length === 0) {
    return {
      status: "source-error",
      rowsWritten: 0,
      seasons: 0,
      error: "upstream returned no rows; existing archive preserved",
    };
  }

  // ATOMIC FULL-ARCHIVE REPLACE — the wipe and EVERY insert chunk commit
  // together or not at all.
  //
  // This is the widest-blast-radius replace in the ingestion layer: the delete
  // is unscoped (`{}`), so it drops the ENTIRE multi-season archive that
  // calibration and backtests read from. Run as a bare delete followed by a
  // loop of awaited chunks, a failure on chunk k leaves the table holding only
  // chunks 0..k-1 — a SILENTLY TRUNCATED archive, which is strictly worse than
  // an empty one: calibration still finds rows, computes over a partial
  // history, and publishes a track record derived from data that was never
  // meant to be a sample. A retry re-enters the same delete-first path, so it
  // cannot self-heal.
  //
  // The batch (array) form is deliberate over the interactive form: it carries
  // no client-side interactive-transaction timeout, and every statement is
  // prepared up front from data ALREADY IN MEMORY — the upstream fetch
  // completed long before this point, so no network call is held open inside
  // the transaction. Chunking is preserved unchanged (Postgres bound-parameter
  // limit); it now bounds statement size WITHIN one transaction instead of
  // splitting the archive across several.
  //
  // Element type is inferred from the delete (deleteMany and createMany return
  // the same PrismaPromise<BatchPayload>), so this needs no `Prisma.*` import.
  const ops = [db.historicalGame.deleteMany({})];
  for (let i = 0; i < data.length; i += CREATE_CHUNK) {
    ops.push(db.historicalGame.createMany({ data: data.slice(i, i + CREATE_CHUNK) }));
  }
  const results = await db.$transaction(ops);
  // results[0] is the delete; the inserts follow in chunk order. The delete's
  // count must never be summed into rowsWritten.
  const rowsWritten = results.slice(1).reduce((sum, r) => sum + (r?.count ?? 0), 0);

  return { status: "ok", rowsWritten, seasons: seasons.size };
}
