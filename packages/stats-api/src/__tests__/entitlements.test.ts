import { describe, expect, it } from "vitest";
import {
  surfacesForTier,
  handleListMetrics,
  handleGetMetric,
  getMetricById,
  metricVisibleToTier,
} from "../index.js";

describe("stripe tier → stats API surfaces", () => {
  it("FREE only public_api", () => {
    expect([...surfacesForTier("FREE")]).toEqual(["public_api"]);
  });
  it("PRO unlocks pro_api", () => {
    expect(surfacesForTier("PRO")).toContain("pro_api");
    expect(surfacesForTier("PRO")).not.toContain("elite_api");
  });
  it("ELITE unlocks elite_api", () => {
    expect(surfacesForTier("ELITE")).toContain("elite_api");
  });
  it("list FREE excludes pro_api metrics", () => {
    const free = handleListMetrics({ tier: "FREE", publicOnly: true });
    const pro = handleListMetrics({ tier: "PRO", publicOnly: true });
    expect(free.ok && pro.ok).toBe(true);
    if (free.ok && pro.ok) {
      expect(free.data.metrics.length).toBeLessThan(pro.data.metrics.length);
      expect(free.data.metrics.every((m) => m.rights.surface === "public_api")).toBe(true);
    }
  });
  it("pro_api metric refuses FREE get", () => {
    // find a pro_api metric
    const proList = handleListMetrics({ tier: "PRO", family: "market" });
    expect(proList.ok).toBe(true);
    if (!proList.ok) return;
    const proMetric = proList.data.metrics.find((m) => m.rights.surface === "pro_api");
    expect(proMetric).toBeTruthy();
    const r = handleGetMetric(proMetric!.id, "FREE");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("tier_insufficient");
  });
  it("dark never visible", () => {
    const m = getMetricById("gse.optical_confirmation_score");
    expect(m).toBeTruthy();
    expect(metricVisibleToTier(m!, "ELITE")).toBe(false);
  });
});
