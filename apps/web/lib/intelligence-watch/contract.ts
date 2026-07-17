/**
 * Intelligence Watch v0 (W005) — the default contract builder.
 *
 * V0 ships no UI to customize a watch, so this is the ONLY constructor:
 * watch every attribute, surface on any single matching change. Naming it
 * "default" rather than presenting it as a saved preference keeps the
 * surface honest about what does not exist yet (no persistence, no
 * per-attribute opt-out) — see WORKSTREAM_005_INTELLIGENCE_WATCH_V0.md.
 */

import type { WatchlistEntry } from "@/lib/watchlist/types";
import type { IntelligenceWatchContract } from "./types";

const DEFAULT_MATERIALITY_THRESHOLD = 1;

export function defaultIntelligenceWatchContract(
  entry: WatchlistEntry,
  now: Date = new Date(),
): IntelligenceWatchContract {
  return {
    watchlistEntryId: entry.id,
    entityId: entry.entityId,
    entityType: entry.entityType,
    watchedAttributes: [],
    materialityThreshold: DEFAULT_MATERIALITY_THRESHOLD,
    createdAt: now.toISOString(),
  };
}
