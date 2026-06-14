/**
 * Provenance Fusion Bridge (Pillar B.2)
 *
 * Maps free-text GameSignal.sourceName values to SourceRightsEntry records
 * in the Source Rights Registry. This is the join layer between the signal
 * store (which uses short provider keys) and the rights registry (which uses
 * canonical source_ids).
 *
 * The map is intentionally explicit — no fuzzy matching. Unknown source names
 * return null, which the trace-claim layer surfaces as "unresolved".
 */

import {
  getSourceRightsEntry,
  snapshotRights,
} from "@/lib/scraping/source-rights-registry";
import type { RightsSnapshot } from "@/lib/scraping/source-rights-registry";
import type { SourceRightsEntry } from "@/lib/scraping/source-rights-registry";

// Maps free-text GameSignal.sourceName → SourceRightsEntry.source_id
const SOURCE_NAME_MAP: Readonly<Record<string, string>> = {
  "nflverse": "nflverse",
  "the-odds-api": "the-odds-api",
  "schedule-internal": "platform-internal",  // platform-generated
  "openweather": "openweather-nws",          // NWS alias
  "nws": "openweather-nws",
  "espn-public": "espn-public-api",
};

/**
 * Bridge a free-text GameSignal.sourceName to a SourceRightsEntry.
 * Returns null if the sourceName is not in the map or not in the registry.
 */
export function bridgeSourceName(sourceName: string): SourceRightsEntry | null {
  const registryId = SOURCE_NAME_MAP[sourceName];
  if (!registryId) return null;
  return getSourceRightsEntry(registryId) ?? null;
}

/**
 * Snapshot rights for a given sourceName at the given time.
 * Returns null if the sourceName cannot be bridged to a registry entry.
 */
export function snapshotForSource(
  sourceName: string,
  now = new Date()
): RightsSnapshot | null {
  const entry = bridgeSourceName(sourceName);
  if (!entry) return null;
  return snapshotRights(entry, now);
}
