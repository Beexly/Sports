/**
 * StatKing commercial-display gate — the per-record rights check that sits
 * BELOW `STATS_PUBLIC` (`apps/web/lib/launch/public-surface-gate.ts`). That
 * flag is all-or-nothing for the whole `/stats` tree; this module is the
 * narrower check a record must also pass before its derived metrics or raw
 * source list render to a customer, per
 * docs/ops/GATE_MATRIX_2026-09-08.md §2.
 *
 * Fail-closed: a source id is cleared only if it is registered in
 * `SOURCE_RIGHTS_REGISTRY` with `commercial_display_allowed: true`. Anything
 * else — an unregistered id or a registered-but-uncleared source (ESPN,
 * Sleeper, ffopportunity, PFR advstats, Kalshi, etc. all currently read
 * `commercial_display_allowed: false`) — fails the record closed.
 *
 * FIXTURE SENTINEL CARVE-OUT: today every StatKing snapshot is synthetic
 * fixture data (`StatusRibbon status="fixture"` on every page), and its
 * `source_lineage` values are internal placeholders ("open_snapshot",
 * "fixture_fallback"), not real third-party source ids — there is nothing
 * external to clear. Those sentinels are excluded from the rights check
 * rather than failed closed, so this gate is a no-op against today's fixture
 * data and only starts blocking the moment a real ingestion pass writes an
 * actual (uncleared) registry source id into a record's lineage.
 */

import { getSourceRightsEntry } from "@/lib/scraping/source-rights-registry";

/** Internal placeholder ids used while StatKing data is fixture/snapshot-backed, not real ingestion. */
export const FIXTURE_SENTINEL_SOURCE_IDS: ReadonlySet<string> = new Set([
  "open_snapshot",
  "fixture_fallback",
]);

/** True iff `sourceId` is a fixture placeholder, not a real third-party source. */
export function isFixtureSentinelSourceId(sourceId: string): boolean {
  return FIXTURE_SENTINEL_SOURCE_IDS.has(sourceId);
}

/**
 * True iff `sourceId` is a real, registered source cleared for commercial
 * display. An unregistered id is NOT cleared (fail closed) — it is not a
 * fixture sentinel, so an unrecognized string is treated as an uncleared
 * external source rather than assumed safe.
 */
export function isSourceClearedForDisplay(sourceId: string): boolean {
  return getSourceRightsEntry(sourceId)?.commercial_display_allowed === true;
}

/**
 * A record's lineage is cleared for public commercial display iff every
 * REAL (non-sentinel) source it names is individually cleared. Fixture
 * sentinels are ignored. A lineage with no real sources (all sentinels, or
 * empty) is cleared — there is no uncleared external source to fail on.
 */
export function isLineageClearedForDisplay(sourceLineage: readonly string[] | undefined): boolean {
  const real = realSourcesIn(sourceLineage);
  return real.every(isSourceClearedForDisplay);
}

/** The non-sentinel source ids in a lineage, for diagnostics/UI. */
export function realSourcesIn(sourceLineage: readonly string[] | undefined): string[] {
  if (!sourceLineage) return [];
  return sourceLineage.filter((id) => !isFixtureSentinelSourceId(id));
}

/** The real sources in a lineage that block commercial display, for diagnostics/UI. */
export function unclearedSourcesIn(sourceLineage: readonly string[] | undefined): string[] {
  return realSourcesIn(sourceLineage).filter((id) => !isSourceClearedForDisplay(id));
}
