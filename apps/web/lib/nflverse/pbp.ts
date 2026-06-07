/**
 * Play-by-play (PBP) loader — the per-play foundation from nflverse.
 *
 * nflverse publishes one season-scoped play_by_play_{season}.csv asset (the same
 * data nflreadr / nfl_data_py read) carrying EPA, win probability, success, air
 * yards, pass-rate-over-expected (pass_oe), and dozens of other per-play fields.
 * This is the FIRST PBP loader in the codebase, and the file is large — hundreds
 * of columns over ~50k plays per season — so callers must NOT retain the parsed
 * records array. The contract here is deliberately streaming-friendly:
 *
 *   loadPbp({ season, onRecords })
 *
 * fetches with multi-host failover, parses to row records, hands the records to a
 * caller-supplied `onRecords` reducer EXACTLY ONCE, and then drops its own
 * reference. A builder is expected to fold those records into compact per-team /
 * per-player accumulators in a single pass so the full record array is never kept
 * alive. Reads `[season, season - 1]` so an empty current season falls back to
 * the most recent complete one.
 *
 * Read-only, real nflverse data (CC-BY-4.0), multi-host failover, honest
 * source-error. Performs no writes and is not a scoring input.
 */

import {
  assertIngestible,
  fetchWithFailover,
  nflverseUrl,
  parseCsv,
  withMirrors,
} from "@sports/data-ingestion";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface PbpLoadResult<T> {
  readonly status: "live" | "source-error";
  /** Season actually used (after [season, season-1] fallback). */
  readonly season: number;
  /** Total parsed play rows handed to the reducer (0 on error). */
  readonly sourceRows: number;
  /** The reduced value produced by `onRecords`, or null on error. */
  readonly value: T | null;
  /** The URL that served (or the primary URL attempted) on error. */
  readonly sourceUrl: string;
  readonly error: string | null;
}

/**
 * Fetch one season of play-by-play and fold it into a compact value in a single
 * pass. `onRecords` is called exactly once with the full record array; the loader
 * never returns the records themselves, so the large array is eligible for GC the
 * moment the reducer returns. Tries [season, season - 1].
 */
export async function loadPbp<T>({
  season = latestNflverseInspectionSeason(),
  onRecords,
  timeoutMs = 20000,
  fetcher = fetch,
}: {
  season?: number;
  onRecords: (records: readonly CsvRecord[], season: number) => T;
  timeoutMs?: number;
  fetcher?: FetchLike;
}): Promise<PbpLoadResult<T>> {
  assertIngestible("nflverse");

  const candidates = [season, season - 1];
  let lastError: unknown = null;
  let lastUrl = nflverseUrl("pbp", season);

  for (const candidate of candidates) {
    const url = nflverseUrl("pbp", candidate);
    lastUrl = url;
    try {
      const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs });
      const { records } = parseCsv(await response.text());
      if (records.length === 0) throw new Error(`empty play_by_play ${candidate}`);
      // Reduce in a single pass; do NOT retain `records` after this call.
      const value = onRecords(records, candidate);
      return {
        status: "live",
        season: candidate,
        sourceRows: records.length,
        value,
        sourceUrl: url,
        error: null,
      };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    status: "source-error",
    season,
    sourceRows: 0,
    value: null,
    sourceUrl: lastUrl,
    error: lastError instanceof Error ? lastError.message : "UNKNOWN",
  };
}
