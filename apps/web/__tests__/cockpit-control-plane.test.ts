import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadIntelligenceControlPlaneView } from "@/lib/cockpit/intelligence-control-plane";

const repoRoot = resolve(__dirname, "..");

describe("cockpit source control plane", () => {
  it("builds an operator summary from systems, domains, and fallback chains", () => {
    const view = loadIntelligenceControlPlaneView();

    expect(view.summary.recommendedActions.length).toBeGreaterThan(0);
    expect(view.systems.length).toBeGreaterThanOrEqual(4);
    expect(view.sourceHealth.length).toBeGreaterThanOrEqual(6);
    expect(view.domains.length).toBeGreaterThanOrEqual(8);
    expect(view.fallbackChains.length).toBeGreaterThanOrEqual(4);
    expect(view.debugTraces).toHaveLength(view.systems.length);
    expect(view.snapshot.coverage).toHaveLength(view.domains.length);
    expect(view.snapshot.fallbackChains).toHaveLength(view.fallbackChains.length);
  });

  it("keeps P0/P1 blind spots visible to the operator", () => {
    const view = loadIntelligenceControlPlaneView();

    expect(view.summary.blindSpots).toBeGreaterThan(0);
    expect(
      view.domains.some(
        (row) =>
          row.requirement.domain === "OFFICIALS" &&
          row.evaluation.state === "MANUAL_REVIEW_REQUIRED"
      )
    ).toBe(true);
  });

  it("/cockpit/sources renders the real control plane instead of the old stub", () => {
    const sourcePage = readFileSync(
      resolve(repoRoot, "app/cockpit/sources/page.tsx"),
      "utf8"
    );

    expect(sourcePage).toMatch(/Source Control Plane/);
    expect(sourcePage).toMatch(/Source Health/);
    expect(sourcePage).toMatch(/Domain Coverage/);
    expect(sourcePage).toMatch(/Fallback Chain/);
    expect(sourcePage).toMatch(/Debug Trace/);
    expect(sourcePage).not.toMatch(/Source-intelligence ledger is being rebuilt/);
  });

  it("derives source-health and debug-trace rows from the control-plane contracts", () => {
    const view = loadIntelligenceControlPlaneView();

    expect(
      view.sourceHealth.some(
        (row) =>
          row.sourceName === "Weather API primary" &&
          row.healthStatus === "DEGRADED" &&
          row.freshnessState === "STALE"
      )
    ).toBe(true);
    expect(
      view.debugTraces.some(
        (row) =>
          row.systemName === "Debug Trace Collector" &&
          row.traceStatus === "STALE" &&
          row.telemetryTraceId === "trace-debug-collector-fixture"
      )
    ).toBe(true);
  });
});
