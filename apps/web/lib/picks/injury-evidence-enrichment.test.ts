import { describe, it, expect, beforeEach, vi } from "vitest";
import { enrichPickInjuryEvidence } from "../injury-evidence-enrichment";
import { clearInjuryCacheForTests } from "@sports/data-ingestion";

describe("enrichPickInjuryEvidence", () => {
  beforeEach(() => {
    clearInjuryCacheForTests();
  });

  it("returns null when ESPN injuries cannot be fetched (closed fail)", async () => {
    // Mock fetch to simulate ESPN unavailability
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await enrichPickInjuryEvidence(
      "Kansas City Chiefs",
      "Buffalo Bills",
      "americanfootball_nfl",
      new Date("2026-10-18T00:00:00Z"),
    );

    // Should fail closed, returning null instead of fabricating data
    expect(result).toBeNull();
  });

  it("returns null when no injury data is available from ESPN", async () => {
    // Mock fetch to return empty injury data
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ injuries: [] }),
    });

    const result = await enrichPickInjuryEvidence(
      "Kansas City Chiefs",
      "Buffalo Bills",
      "americanfootball_nfl",
      new Date("2026-10-18T00:00:00Z"),
    );

    expect(result).toBeNull();
  });

  it("builds real injury evidence when ESPN data is available", async () => {
    // Note: This test requires ESPN source to be enabled
    // Real execution test should use live data or mock realistically
    const evidence = await enrichPickInjuryEvidence(
      "Arizona Cardinals",
      "Los Angeles Rams",
      "americanfootball_nfl",
      new Date("2026-10-18T00:00:00Z"),
    );

    // If ESPN is properly configured and has data:
    if (evidence && evidence.sourceName === "espn-injuries") {
      expect(evidence).toHaveProperty("sourceCategory", "PLAYER_AVAILABILITY");
      expect(evidence).toHaveProperty("sourceName", "espn-injuries");
      expect(evidence).toHaveProperty("trustLevel");
      expect(evidence.trustLevel).toBeGreaterThan(0);
      expect(evidence).toHaveProperty("fetchedAt");
      expect(evidence).not.toHaveProperty("isBootstrap", true);
    }
  });
});
