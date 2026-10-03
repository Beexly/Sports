/**
 * Watchlist — shared types.
 *
 * The follow/alert retention primitive: a user follows a TEAM or PLAYER, and
 * (Elite-only, gated) a GRADED-only alert loop can later notify them. See
 * `alert-eligibility.ts` for the graded-only doctrine and `alert-dispatch.ts`
 * for the inert-by-default send seam.
 *
 * Pure module — no DB, no env, no React. Safe to import from lib, API
 * routes, and components alike.
 */

export type WatchlistEntityType = "TEAM" | "PLAYER";

export const WATCHLIST_ENTITY_TYPES: readonly WatchlistEntityType[] = ["TEAM", "PLAYER"];

export function isWatchlistEntityType(value: unknown): value is WatchlistEntityType {
  return value === "TEAM" || value === "PLAYER";
}

/** One followed entity, as persisted. */
export interface WatchlistEntry {
  readonly id: string;
  readonly userId: string;
  readonly entityType: WatchlistEntityType;
  readonly entityId: string;
  readonly createdAt: Date;
}

/** A candidate follow/unfollow target, pre-persistence. */
export interface WatchlistTarget {
  readonly entityType: WatchlistEntityType;
  readonly entityId: string;
}
