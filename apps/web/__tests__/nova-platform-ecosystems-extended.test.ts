import { describe, expect, it } from "vitest";
import {
  AI_PLATFORM_OPPORTUNITIES,
  EXTENDED_AI_PLATFORM_OPPORTUNITIES,
  combinePlatformOpportunities,
  validateExtendedPlatformEcosystem,
} from "@/lib/opportunity-engine";

describe("NOVA extended developer economy", () => {
  it("keeps the extended ecosystem structurally valid and duplicate-free", () => {
    expect(validateExtendedPlatformEcosystem()).toEqual([]);
    const combined = combinePlatformOpportunities(
      AI_PLATFORM_OPPORTUNITIES,
      EXTENDED_AI_PLATFORM_OPPORTUNITIES,
    );
    const ids = combined.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(combined.length).toBeGreaterThanOrEqual(30);
  });

  it("maps high-value direct or transactional developer channels", () => {
    for (const id of [
      "salesforce-agentexchange",
      "atlassian-forge-marketplace",
      "shopify-app-store",
      "rapidapi-gse",
      "apify-store",
      "canva-premium-apps",
      "oracle-cloud-marketplace",
    ]) {
      const item = EXTENDED_AI_PLATFORM_OPPORTUNITIES.find((candidate) => candidate.id === id);
      expect(item, id).toBeDefined();
      expect(item?.nativePaymentAvailable, id).toBe(true);
    }
  });

  it("keeps Zapier distribution separate from native payment", () => {
    const zapier = EXTENDED_AI_PLATFORM_OPPORTUNITIES.find(
      (item) => item.id === "zapier-integration-directory",
    );
    expect(zapier?.state).toBe("LIVE_DISTRIBUTION");
    expect(zapier?.nativePaymentAvailable).toBe(false);
    expect(zapier?.blockers.join(" ")).toMatch(/native usage payout is not verified/i);
  });

  it("uses Garrett's HR expertise where the platform fit is stronger than sports", () => {
    const salesforce = EXTENDED_AI_PLATFORM_OPPORTUNITIES.find(
      (item) => item.id === "salesforce-agentexchange",
    );
    expect(salesforce?.gsePlay).toMatch(/HR leadership expertise/i);
    expect(salesforce?.targetProjects).toContain("HR AI");
  });

  it("preserves rights constraints for actors, data, and commerce apps", () => {
    const apify = EXTENDED_AI_PLATFORM_OPPORTUNITIES.find((item) => item.id === "apify-store");
    const rapid = EXTENDED_AI_PLATFORM_OPPORTUNITIES.find((item) => item.id === "rapidapi-gse");
    const shopify = EXTENDED_AI_PLATFORM_OPPORTUNITIES.find((item) => item.id === "shopify-app-store");
    expect(apify?.blockers.join(" ")).toMatch(/source terms/i);
    expect(rapid?.blockers.join(" ")).toMatch(/source licenses/i);
    expect(shopify?.blockers.join(" ")).toMatch(/merchant-data/i);
  });
});
