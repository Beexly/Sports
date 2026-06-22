import { describe, it, expect } from "vitest";
import { auditSignalLineage, type SignalFactor } from "@/lib/picks/signal-lineage";

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
