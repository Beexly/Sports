import { describe, it, expect } from "vitest";
import {
  TIER_TTL_MATRIX,
  tierTtlEntry,
  ttlMinutesFor,
  isStaleForTier,
  stalenessCopyViolation,
  assertNoStaleFreshnessClaim,
  StalenessCopyError,
} from "@/lib/picks/tier-ttl";
import type { SourceTier } from "@/lib/picks/signal-lineage";

describe("TIER_TTL_MATRIX — the doctrine as data", () => {
  it("covers all six tiers exactly once", () => {
    const tiers = TIER_TTL_MATRIX.map((e) => e.tier).sort();
    expect(tiers).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("Tier 1: 15 min standard, 5 min game-day-injury", () => {
    expect(tierTtlEntry(1)).toEqual({ tier: 1, standardMinutes: 15, gameDayInjuryMinutes: 5 });
  });

  it("Tier 2 (live): 2 min, no game-day-injury override", () => {
    expect(tierTtlEntry(2)).toEqual({ tier: 2, standardMinutes: 2, gameDayInjuryMinutes: null });
  });

  it("Tier 3: 2 hours", () => {
    expect(tierTtlEntry(3).standardMinutes).toBe(120);
  });

  it("only Tier 1 carries a game-day-injury override", () => {
    for (const entry of TIER_TTL_MATRIX) {
      if (entry.tier === 1) continue;
      expect(entry.gameDayInjuryMinutes).toBeNull();
    }
  });

  it("throws on an unknown tier rather than guessing", () => {
    expect(() => tierTtlEntry(7 as SourceTier)).toThrow(RangeError);
  });
});

describe("ttlMinutesFor / isStaleForTier", () => {
  it("game-day-injury context tightens Tier 1 from 15m to 5m", () => {
    expect(ttlMinutesFor(1)).toBe(15);
    expect(ttlMinutesFor(1, { isGameDayInjury: true })).toBe(5);
  });

  it("game-day-injury context is a no-op on any tier but 1", () => {
    expect(ttlMinutesFor(3, { isGameDayInjury: true })).toBe(ttlMinutesFor(3));
  });

  it("REGRESSION CASE: a 6-minute-old Tier-1 injury report on game day is stale", () => {
    // The exact scenario the doctrine calls out: without the tightened
    // override this would read as fresh under the 15m standard TTL.
    expect(isStaleForTier(1, 6, { isGameDayInjury: true })).toBe(true);
    expect(isStaleForTier(1, 6)).toBe(false); // same age, NOT game-day-injury: still fresh
  });

  it("exactly at the TTL boundary is NOT yet stale", () => {
    expect(isStaleForTier(2, 2)).toBe(false);
    expect(isStaleForTier(2, 2.0001)).toBe(true);
  });

  it("a negative or non-finite age is treated as stale, never as fresh", () => {
    expect(isStaleForTier(1, -1)).toBe(true);
    expect(isStaleForTier(1, NaN)).toBe(true);
    expect(isStaleForTier(1, Infinity)).toBe(true);
  });
});

describe("staleness copy fence", () => {
  it("flags 'current'/'live'/'confirmed' adjacent to breached-TTL data", () => {
    expect(stalenessCopyViolation("Current injury status: OUT", 1, 20, { isGameDayInjury: true })).toBe(
      "current",
    );
    expect(stalenessCopyViolation("Live odds from the market", 2, 5)).toBe("live");
    expect(stalenessCopyViolation("Confirmed starter", 1, 20, { isGameDayInjury: true })).toBe("confirmed");
    expect(stalenessCopyViolation("Data is up to date", 3, 200)).toBe("up to date");
  });

  it("stays quiet when the data is still fresh, regardless of copy", () => {
    expect(stalenessCopyViolation("Current injury status: OUT", 1, 3, { isGameDayInjury: true })).toBeNull();
    expect(stalenessCopyViolation("Live odds", 2, 1)).toBeNull();
  });

  it("stays quiet on stale data that makes no freshness claim", () => {
    expect(stalenessCopyViolation("Last reported OUT (from an earlier update)", 1, 20, { isGameDayInjury: true })).toBeNull();
  });

  it("word-boundary: 'recurring' does not falsely match 'current'", () => {
    expect(stalenessCopyViolation("A recurring pattern this season", 1, 20, { isGameDayInjury: true })).toBeNull();
  });

  it("case-insensitive", () => {
    expect(stalenessCopyViolation("LIVE line movement", 2, 5)).toBe("live");
  });

  it("assertNoStaleFreshnessClaim throws with the tier/age in the message; passes when honest", () => {
    expect(() => assertNoStaleFreshnessClaim("Live odds", 2, 5)).toThrow(StalenessCopyError);
    try {
      assertNoStaleFreshnessClaim("Live odds", 2, 5);
    } catch (err) {
      expect(err).toBeInstanceOf(StalenessCopyError);
      const e = err as StalenessCopyError;
      expect(e.tier).toBe(2);
      expect(e.ageMinutes).toBe(5);
      expect(e.message).toContain("live");
    }
    expect(() => assertNoStaleFreshnessClaim("Live odds", 2, 1)).not.toThrow();
  });
});
