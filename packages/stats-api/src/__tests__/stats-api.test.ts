import { describe, expect, it } from "vitest";
import {
  catalogStats,
  getMetricCatalog,
  handleCatalogSummary,
  handleCoverageMatrix,
  handleGetMetric,
  handleListMetrics,
  buildStatsOpenApi,
} from "../index.js";

describe("GSE Stats API catalog density", () => {
  it("registers a dense multi-sport catalog", () => {
    const s = catalogStats();
    expect(s.total).toBeGreaterThan(100);
    expect(s.publicApi).toBeGreaterThan(40);
    expect(s.bySport.NFL).toBeGreaterThan(20);
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
    }
  });

  it("refuses dark proprietary metric on public get", () => {
    const r = handleGetMetric("gse.optical_confirmation_score");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });

  it("returns edge index when public/pro eligible", () => {
    const r = handleGetMetric("gse.edge_index");
    // pro_api is publicApiEligible true
    expect(r.ok).toBe(true);
  });

  it("catalog summary includes law", () => {
    const r = handleCatalogSummary();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.law).toContain("refuse-default");
      expect(r.data.stats.total).toBeGreaterThan(100);
    }
  });

  it("coverage matrix present", () => {
    const r = handleCoverageMatrix();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.sources.length).toBeGreaterThan(5);
    }
  });

  it("openapi builds", () => {
    const doc = buildStatsOpenApi();
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.paths["/metrics"]).toBeTruthy();
  });
});
