import { describe, it, expect } from "vitest";
import {
  COST_TIER_RANK,
  selectSourcesForNeed,
  cheapestSourceForNeed,
  hasFreeCoverage,
  SOURCE_COST_PROFILES,
} from "@/lib/data-sources/cost-policy";

describe("cost-policy: free-first ordering", () => {
  it("free tiers always rank below paid tiers", () => {
    expect(COST_TIER_RANK.free_unlimited).toBeLessThan(COST_TIER_RANK.free_quota);
    expect(COST_TIER_RANK.free_quota).toBeLessThan(COST_TIER_RANK.licensed_flat);
    expect(COST_TIER_RANK.licensed_flat).toBeLessThan(COST_TIER_RANK.trial);
    expect(COST_TIER_RANK.trial).toBeLessThan(COST_TIER_RANK.paid_metered);
  });

  it("cfb_scores prefers the free no-key source (henrygd) over paid", () => {
    const ordered = selectSourcesForNeed("cfb_scores");
    expect(ordered[0]?.id).toBe("henrygd-ncaa");
    // never returns a paid source ahead of an available free one
    const firstPaidIdx = ordered.findIndex((s) => s.tier === "paid_metered" || s.tier === "trial");
    const lastFreeIdx = ordered.map((s) => s.tier).lastIndexOf("free_quota");
    if (firstPaidIdx >= 0 && lastFreeIdx >= 0) expect(lastFreeIdx).toBeLessThan(firstPaidIdx);
  });

  it("cheapestSourceForNeed returns the lowest marginal-cost option", () => {
    expect(cheapestSourceForNeed("cfb_scores")?.id).toBe("henrygd-ncaa");
    expect(cheapestSourceForNeed("cfb_odds")?.id).toBe("the-odds-api-ncaaf"); // licensed_flat beats trial/paid
  });

  it("free coverage exists for the core CFB facts needs", () => {
    expect(hasFreeCoverage("cfb_scores")).toBe(true);
    expect(hasFreeCoverage("cfb_standings")).toBe(true);
    expect(hasFreeCoverage("cfb_stats")).toBe(true);
  });

  it("ordering is sorted by cost rank for every need", () => {
    const needs = ["cfb_scores", "cfb_standings", "cfb_rankings", "cfb_schedules", "cfb_stats", "cfb_odds"] as const;
    for (const need of needs) {
      const ranks = selectSourcesForNeed(need).map((s) => COST_TIER_RANK[s.tier]);
      const sorted = [...ranks].sort((a, b) => a - b);
      expect(ranks).toEqual(sorted);
    }
  });

  it("every profile covers at least one need and carries a gate flag", () => {
    for (const p of SOURCE_COST_PROFILES) {
      expect(p.covers.length).toBeGreaterThan(0);
      expect(typeof p.gated).toBe("boolean");
    }
  });
});
