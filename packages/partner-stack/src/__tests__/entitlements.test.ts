import { describe, expect, it } from "vitest";
import {
  authorizeMetricAccess,
  defaultMinTier,
  resolveSessionTier,
} from "../entitlements.js";

describe("entitlements", () => {
  it("defaults FREE", () => {
    const r = resolveSessionTier({});
    expect(r.tier).toBe("FREE");
    expect(r.spoofBlocked).toBe(false);
  });

  it("blocks query spoof without session", () => {
    const r = resolveSessionTier({ queryTier: "ELITE" });
    expect(r.tier).toBe("FREE");
    expect(r.spoofBlocked).toBe(true);
  });

  it("allows query only in dev mode", () => {
    const r = resolveSessionTier({ queryTier: "PRO" }, { allowQueryOnly: true });
    expect(r.tier).toBe("PRO");
    expect(r.source).toBe("query_dev");
  });

  it("session stripeTier wins over query", () => {
    const r = resolveSessionTier({
      stripeTier: "PRO",
      queryTier: "ELITE",
    });
    expect(r.tier).toBe("PRO");
    expect(r.source).toBe("session.stripeTier");
  });

  it("price id maps to tier", () => {
    const r = resolveSessionTier({ stripePriceId: "price_gse_elite_monthly" });
    expect(r.tier).toBe("ELITE");
  });

  it("refuses non-public metrics", () => {
    const a = authorizeMetricAccess(
      { stripeTier: "ELITE" },
      { metricId: "own.model.p", minTier: "ELITE", publicApiEligible: false },
    );
    expect(a.ok).toBe(false);
    if (!a.ok) expect(a.code).toBe("not_public");
  });

  it("refuses insufficient tier", () => {
    const a = authorizeMetricAccess(
      { stripeTier: "FREE" },
      { metricId: "own.stat.epa", minTier: "PRO", publicApiEligible: true },
    );
    expect(a.ok).toBe(false);
    if (!a.ok) expect(a.code).toBe("tier_insufficient");
  });

  it("allows entitled access", () => {
    const a = authorizeMetricAccess(
      { stripeTier: "PRO" },
      { metricId: "own.stat.epa", minTier: "PRO", publicApiEligible: true },
    );
    expect(a.ok).toBe(true);
  });

  it("defaultMinTier ranks model as ELITE", () => {
    expect(defaultMinTier("own.model.p")).toBe("ELITE");
    expect(defaultMinTier("own.kpi.refusal_rate")).toBe("FREE");
    expect(defaultMinTier("own.stat.epa_roll")).toBe("PRO");
  });
});
