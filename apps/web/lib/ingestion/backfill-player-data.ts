/**
 * Multi-season backfill orchestrator for nflverse player data.
 *
 * Loops a season range and runs the existing per-season ingestions (weekly
 * stats, snap counts, injuries), respecting each dataset's earliest available
 * season. Players ingest first each season so injuries resolve their playerId.
 * Idempotent (each per-season ingestion upserts/replaces its own season).
 */
import { ingestPlayerWeeklyStats } from "@/lib/ingestion/player-stats";
import { ingestSnapCounts, type SnapCountIngestResult } from "@/lib/ingestion/snap-counts";
import { ingestInjuries, type InjuryIngestResult } from "@/lib/ingestion/injuries";

/** Earliest season each nflverse dataset reliably covers. */
export const DATASET_MIN_SEASON = { stats: 1999, snaps: 2012, injuries: 2009 } as const;

type PlayerStatsResult = Awaited<ReturnType<typeof ingestPlayerWeeklyStats>>;

export interface SeasonBackfillResult {
  readonly season: number;
  readonly stats: PlayerStatsResult | "skipped";
  readonly snaps: SnapCountIngestResult | "skipped";
  readonly injuries: InjuryIngestResult | "skipped";
}

export interface BackfillResult {
  readonly from: number;
  readonly to: number;
  readonly seasonsProcessed: number;
  readonly allOk: boolean;
  readonly results: readonly SeasonBackfillResult[];
}

function ok(r: { status: string } | "skipped"): boolean {
  return r === "skipped" || r.status === "ok";
}

export async function backfillPlayerData(from: number, to: number): Promise<BackfillResult> {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const results: SeasonBackfillResult[] = [];

  for (let season = lo; season <= hi; season++) {
    // Players first (creates Player rows) so injuries can resolve playerId.
    const stats: PlayerStatsResult | "skipped" =
      season >= DATASET_MIN_SEASON.stats ? await ingestPlayerWeeklyStats(season) : "skipped";
    const [snaps, injuries] = await Promise.all([
      season >= DATASET_MIN_SEASON.snaps ? ingestSnapCounts(season) : Promise.resolve("skipped" as const),
      season >= DATASET_MIN_SEASON.injuries ? ingestInjuries(season) : Promise.resolve("skipped" as const),
    ]);
    results.push({ season, stats, snaps, injuries });
  }

  const allOk = results.every((r) => ok(r.stats) && ok(r.snaps) && ok(r.injuries));
  return { from: lo, to: hi, seasonsProcessed: results.length, allOk, results };
}
