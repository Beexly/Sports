import { describe, it, expect } from "vitest";
import { auditSignalLineage, staleActiveFactors, type SignalFactor } from "@/lib/picks/signal-lineage";
import { isStaleForTier } from "@/lib/picks/tier-ttl";

function factor(overrides: Partial<SignalFactor> = {}): SignalFactor {
  return {
    key: "market.consensus",
    label: "Market consensus (de-vigged)",
    sourceId: "the-odds-api",
    sourceTier: 2,
    capturedAt: "2026-06-22T17:00:00.000Z",
    rightsStatus: "approved_api",
    freshnessMinutes: 5,
    active: true,
    blockedReason: null,
    weight: 0.5,
    weakness: "market can be wrong on thin markets",
    decisionImpact: "raised",
    ...overrides,
  };
}

describe("signal lineage audit", () => {
  it("passes a clean Tier-1/2, rights-clean, weakness-stated active set", () => {
    const v = auditSignalLineage([factor(), factor({ key: "context.atsForm", sourceTier: 1, sourceId: "nflverse" })]);
    expect(v.publicSafe).toBe(true);
    expect(v.violations).toEqual([]);
    expect(v.activeFactors).toHaveLength(2);
    expect(v.lowestActiveTier).toBe(2);
  });

  it("flags an ACTIVE factor below Tier 2 (only Tier 1/2 may back a claim)", () => {
    const v = auditSignalLineage([factor({ key: "weak.reddit", sourceTier: 5 })]);
    expect(v.publicSafe).toBe(false);
    expect(v.violations.join(" ")).toMatch(/Tier 5/);
  });

  it("flags an active factor with a rights-blocked status", () => {
    const v = auditSignalLineage([factor({ rightsStatus: "permission_required" })]);
    expect(v.publicSafe).toBe(false);
    expect(v.violations.join(" ")).toMatch(/rights status/);
  });

  it("flags the contradiction of an active factor that carries a block reason", () => {
    const v = auditSignalLineage([factor({ active: true, blockedReason: "no odds before kickoff" })]);
    expect(v.publicSafe).toBe(false);
    expect(v.violations.join(" ")).toMatch(/block reason/);
  });

  it("requires an active factor to state its weakness", () => {
    const v = auditSignalLineage([factor({ weakness: "  " })]);
    expect(v.publicSafe).toBe(false);
    expect(v.violations.join(" ")).toMatch(/state its weakness/);
  });

  it("does not apply the laws to BLOCKED (inactive) factors — they are just recorded", () => {
    const v = auditSignalLineage([
      factor(),
      factor({ key: "weak.reddit", sourceTier: 5, active: false, blockedReason: "tier 5 never backs a pick", weakness: "" }),
    ]);
    expect(v.publicSafe).toBe(true);
    expect(v.blockedFactors).toHaveLength(1);
    expect(v.activeFactors).toHaveLength(1);
  });

  it("reports the stalest active factor", () => {
    const v = auditSignalLineage([factor({ freshnessMinutes: 5 }), factor({ key: "x", freshnessMinutes: 90 })]);
    expect(v.maxActiveStaleMinutes).toBe(90);
  });
});

describe("staleActiveFactors — S4, wired to the per-tier TTL matrix", () => {
  it("flags a Tier-2 (live, 2m TTL) factor at 5 minutes old", () => {
    const stale = staleActiveFactors([factor({ sourceTier: 2, freshnessMinutes: 5 })], isStaleForTier);
    expect(stale).toHaveLength(1);
  });

  it("does not flag a Tier-3 (2hr TTL) factor at the same 5 minutes", () => {
    const stale = staleActiveFactors([factor({ sourceTier: 3, freshnessMinutes: 5 })], isStaleForTier);
    expect(stale).toHaveLength(0);
  });

  it("ignores BLOCKED (inactive) factors regardless of age", () => {
    const stale = staleActiveFactors(
      [factor({ sourceTier: 2, freshnessMinutes: 999, active: false })],
      isStaleForTier,
    );
    expect(stale).toHaveLength(0);
  });

  it("applies the Tier-1 game-day-injury override via the injected predicate", () => {
    const injury = factor({ key: "injury.status", sourceTier: 1, freshnessMinutes: 8 });
    const notInjury = factor({ key: "context.other", sourceTier: 1, freshnessMinutes: 8 });
    const stale = staleActiveFactors(
      [injury, notInjury],
      isStaleForTier,
      (f) => f.key === "injury.status",
    );
    // 8m: stale under the 5m game-day-injury TTL, fresh under the 15m standard TTL.
    expect(stale.map((f) => f.key)).toEqual(["injury.status"]);
  });

  it("does not change auditSignalLineage's own publicSafe verdict — purely additive", () => {
    const factors = [factor({ sourceTier: 2, freshnessMinutes: 999 })];
    const v = auditSignalLineage(factors);
    expect(v.publicSafe).toBe(true); // auditSignalLineage has no TTL notion at all
    expect(staleActiveFactors(factors, isStaleForTier)).toHaveLength(1); // but this does
  });
});
