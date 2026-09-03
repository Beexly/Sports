/**
 * "Is the labelled season simply not published yet?" — the one signal that
 * lets a scheduled nflverse ingestion fall back to the completed floor.
 *
 * Two shapes mean unpublished: the source answered 404 (nflverse-source
 * throws `nflverse fetch failed (404) for <url>`), or it answered "ok" with
 * the older combined asset and zero rows for the labelled season. Any other
 * source error (5xx, timeout, network) is an outage: it must keep the failure
 * path so the run is recorded as failed, never masked by a floor retry that
 * happens to succeed. clearance-denied is a rights stop, never a retry.
 */
const UNPUBLISHED_ERROR = /\b404\b|not found/i;

export interface SeasonIngestionSignal {
  readonly status: string;
  readonly statsUpserted: number;
  readonly error?: string | null;
}

export function isUnpublishedSeasonSignal(stats: SeasonIngestionSignal): boolean {
  if (stats.status === "ok") return stats.statsUpserted === 0;
  if (stats.status !== "source-error") return false;
  return UNPUBLISHED_ERROR.test(stats.error ?? "");
}
