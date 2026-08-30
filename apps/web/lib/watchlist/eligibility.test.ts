import { describe, it, expect } from "vitest";
import type { SubscriptionTier } from "@sports/types";
import {
  WATCHLIST_FOLLOW_LIMITS,
  followLimitForTier,
  isOverFollowLimit,
  canFollowEntities,
  isAlreadyFollowing,
  dedupeWatchlistTargets,
} from "./eligibility";
import type { WatchlistEntry, WatchlistTarget } from "./types";

const ALL_TIERS: SubscriptionTier[] = ["FREE", "FANTASY", "PRO", "ELITE"];

describe("canFollowEntities — following is open to every tier", () => {
  it("every tier may follow (the gate is the cap, not the action)", () => {
    for (const tier of ALL_TIERS) {
      expect(canFollowEntities(tier)).toBe(true);
    }
  });
});

describe("followLimitForTier / isOverFollowLimit", () => {
  it("FREE and FANTASY share a modest cap", () => {
    expect(followLimitForTier("FREE")).toBe(WATCHLIST_FOLLOW_LIMITS.FREE);
    expect(followLimitForTier("FANTASY")).toBe(WATCHLIST_FOLLOW_LIMITS.FANTASY);
    expect(WATCHLIST_FOLLOW_LIMITS.FREE).toBe(WATCHLIST_FOLLOW_LIMITS.FANTASY);
  });

  it("PRO has a materially higher cap than FREE", () => {
    const pro = followLimitForTier("PRO");
    const free = followLimitForTier("FREE");
    expect(pro).not.toBeNull();
    expect(free).not.toBeNull();
    expect(pro as number).toBeGreaterThan(free as number);
  });

  it("ELITE is unlimited (null) and never over the limit", () => {
    expect(followLimitForTier("ELITE")).toBeNull();
    expect(isOverFollowLimit("ELITE", 0)).toBe(false);
    expect(isOverFollowLimit("ELITE", 10_000)).toBe(false);
  });

  it("blocks exactly at and above the cap, allows below it", () => {
    const limit = followLimitForTier("FREE") as number;
    expect(isOverFollowLimit("FREE", limit - 1)).toBe(false);
    expect(isOverFollowLimit("FREE", limit)).toBe(true);
    expect(isOverFollowLimit("FREE", limit + 1)).toBe(true);
  });
});

describe("isAlreadyFollowing", () => {
  const existing: Pick<WatchlistEntry, "entityType" | "entityId">[] = [
    { entityType: "TEAM", entityId: "team-1" },
    { entityType: "PLAYER", entityId: "player-1" },
  ];

  it("true for an exact (entityType, entityId) match", () => {
    expect(isAlreadyFollowing(existing, { entityType: "TEAM", entityId: "team-1" })).toBe(true);
  });

  it("false for a different entityId of the same entityType", () => {
    expect(isAlreadyFollowing(existing, { entityType: "TEAM", entityId: "team-2" })).toBe(false);
  });

  it("false when entityId matches but entityType differs (TEAM vs PLAYER namespaces don't collide)", () => {
    expect(isAlreadyFollowing(existing, { entityType: "PLAYER", entityId: "team-1" })).toBe(
      false,
    );
  });

  it("false against an empty list", () => {
    expect(isAlreadyFollowing([], { entityType: "TEAM", entityId: "team-1" })).toBe(false);
  });
});

describe("dedupeWatchlistTargets", () => {
  it("drops exact duplicates, keeping the first occurrence", () => {
    const targets: WatchlistTarget[] = [
      { entityType: "TEAM", entityId: "team-1" },
      { entityType: "TEAM", entityId: "team-1" },
      { entityType: "PLAYER", entityId: "team-1" }, // different namespace, kept
      { entityType: "TEAM", entityId: "team-2" },
    ];
    const result = dedupeWatchlistTargets(targets);
    expect(result).toHaveLength(3);
    expect(result).toEqual([
      { entityType: "TEAM", entityId: "team-1" },
      { entityType: "PLAYER", entityId: "team-1" },
      { entityType: "TEAM", entityId: "team-2" },
    ]);
  });

  it("returns an empty array for an empty input", () => {
    expect(dedupeWatchlistTargets([])).toEqual([]);
  });
});
