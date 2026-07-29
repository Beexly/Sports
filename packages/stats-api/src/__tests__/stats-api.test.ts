import { describe, expect, it } from "vitest";
import {
  catalogStats,
  getMetricCatalog,
  handleCatalogSummary,
  handleCoverageMatrix,
  handleGetMetric,
  handleListMetrics,
  handleGetMetricValue,
  createMemoryValueProvider,
  buildStatsOpenApi,
} from "../index.js";

describe("GSE Stats API catalog density", () => {
  it("registers a world-class dense multi-sport catalog", () => {
    const s = catalogStats();
    expect(s.total).toBeGreaterThanOrEqual(500);
    expect(s.publicApi).toBeGreaterThanOrEqual(400);
    expect(s.bySport.NFL).toBeGreaterThan(100);
    expect(s.byFamily.market).toBeGreaterThan(20);
  });

  it("unique metric ids", () => {
    const ids = getMetricCatalog().map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("handlers refuse-default", () => {
  it("lists public metrics by default", () => {
    const r = handleListMetrics({});
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.metrics.every((m) => m.publicApi)).toBe(true);
      expect(r.data.metrics.length).toBeGreaterThan(100);
    }
  });

  it("refuses dark proprietary metric on public get", () => {
    const r = handleGetMetric("gse.optical_confirmation_score");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });

  it("returns edge index when public/pro eligible", () => {
    const r = handleGetMetric("gse.edge_index", "PRO");
    expect(r.ok).toBe(true);
  });

  it("catalog summary includes law + density", () => {
    const r = handleCatalogSummary();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.law).toContain("refuse-default");
      expect(r.data.stats.total).toBeGreaterThanOrEqual(500);
    }
  });

  it("coverage matrix present", () => {
    const r = handleCoverageMatrix();
    expect(r.ok).toBe(true);
  });

  it("openapi builds", () => {
    const doc = buildStatsOpenApi();
    expect(doc.openapi).toBe("3.1.0");
  });
});

describe("PIT values", () => {
  it("refuses invalid asOf", async () => {
    const r = await handleGetMetricValue({
      metricId: "gse.edge_index", // pro_api
      entityId: "game_1",
      asOf: "not-a-date",
      tier: "PRO",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("asof_invalid");
  });

  it("refuses missing asOf", async () => {
    const r = await handleGetMetricValue({
      metricId: "gse.edge_index",
      entityId: "game_1",
      asOf: "",
      tier: "PRO",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("asof_missing");
  });

  it("returns 501 without provider (definition-first honesty)", async () => {
    const r = await handleGetMetricValue({
      metricId: "gse.edge_index", // pro_api
      entityId: "game_1",
      asOf: "2025-11-01T18:00:00.000Z",
      tier: "PRO",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(501);
  });

  it("returns value with memory provider", async () => {
    const provider = createMemoryValueProvider({
      "gse.edge_index|game_1": 0.041,
    });
    const r = await handleGetMetricValue(
      {
        metricId: "gse.edge_index", // pro_api
        entityId: "game_1",
        asOf: "2025-11-01T18:00:00.000Z",
        tier: "PRO",
      },
      provider,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.value).toBe(0.041);
      expect(r.data.provenance.pitCorrect).toBe(true);
    }
  });

  it("refuses dark metric values", async () => {
    const r = await handleGetMetricValue({
      metricId: "gse.optical_confirmation_score",
      entityId: "x",
      asOf: "2025-11-01T18:00:00.000Z",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });
});
