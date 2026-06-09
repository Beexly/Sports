import { describe, it, expect } from "vitest";
import {
  COMPETITORS,
  competitorsByTier,
  approvalGatedCount,
  WATCHLIST_THESIS,
} from "./competitor-watchlist";

describe("competitor war-room registry", () => {
  it("has a populated, well-formed registry across all three lanes", () => {
    expect(COMPETITORS.length).toBeGreaterThanOrEqual(20);
    const tiers = new Set(COMPETITORS.map((c) => c.tier));
    expect(tiers).toEqual(new Set(["platform", "optimizer", "media"]));
    for (const c of COMPETITORS) {
      expect(c.name).toBeTruthy();
      expect(c.url.startsWith("https://")).toBe(true);
      expect(c.theirEdge.length).toBeGreaterThan(10);
      expect(c.gseCounter.length).toBeGreaterThan(10); // every rival has a counter-position
      expect(c.legalNote.length).toBeGreaterThan(5); // and a hard line
    }
  });

  it("has unique competitor names", () => {
    const names = COMPETITORS.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("groups by tier preserving every row", () => {
    const groups = competitorsByTier();
    expect(groups.map((g) => g.tier)).toEqual(["platform", "optimizer", "media"]);
    const regrouped = groups.flatMap((g) => g.rows).length;
    expect(regrouped).toBe(COMPETITORS.length);
    for (const g of groups) expect(g.rows.length).toBeGreaterThan(0);
  });

  it("counts approval-gated data paths (betting/DFS/private-import rivals)", () => {
    const n = approvalGatedCount();
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(COMPETITORS.length); // not everything is gated
    expect(n).toBe(COMPETITORS.filter((c) => c.approvalGated).length);
  });

  it("states the do-not-chase thesis", () => {
    expect(WATCHLIST_THESIS.toLowerCase()).toContain("world model");
    expect(WATCHLIST_THESIS.toLowerCase()).toContain("feature-for-feature");
  });
});
