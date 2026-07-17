/**
 * Intelligence Watch v0 (W005) — shared types.
 *
 * A per-watchlist-entry preference about which kinds of change over a
 * followed entity are worth surfacing, compiled against the W002 Worldline
 * bitemporal delta engine rather than the narrower "a pick settled" alert
 * doctrine `watchlist/alert-eligibility.ts` already owns. See
 * docs/frontier/WORKSTREAM_005_INTELLIGENCE_WATCH_V0.md for the naming note
 * (this is `IntelligenceWatchContract`, not `IntelligenceContract` — the
 * latter name is already taken by an unrelated Metacortex plan-compiler
 * concept on a separate, unmerged branch).
 *
 * Pure module — no DB, no env, no React.
 */

import type { WatchlistEntityType } from "@/lib/watchlist/types";
import type { WorldDeltaEntry } from "@/lib/worldline";

/**
 * A user's standing preference over one watchlist entry. V0 has no UI to
 * customize this — `defaultIntelligenceWatchContract` (contract.ts) is the
 * only constructor today, and it is honestly labeled as a default, not
 * personalization that doesn't exist yet.
 */
export interface IntelligenceWatchContract {
  readonly watchlistEntryId: string;
  readonly entityId: string;
  readonly entityType: WatchlistEntityType;
  /** Worldline attribute names this user cares about. Empty = all attributes. */
  readonly watchedAttributes: readonly string[];
  /** Minimum number of matching delta entries before this is worth surfacing. */
  readonly materialityThreshold: number;
  readonly createdAt: string;
}

export type IntelligenceWatchIneligibleReason = "not_entitled" | "no_material_change";

export type IntelligenceWatchOutcome =
  | { readonly surface: false; readonly reason: IntelligenceWatchIneligibleReason }
  | { readonly surface: true; readonly matchingEntries: readonly WorldDeltaEntry[] };
