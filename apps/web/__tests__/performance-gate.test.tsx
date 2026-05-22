import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { PerformanceBootstrapState } from "@/components/performance/bootstrap-state";

/**
 * Performance Gate Test — Phase 2
 *
 * Verifies the public `/performance` page respects the platform readiness
 * gate (`canExposePerformanceStats`) and renders a bootstrap-state UI when
 * the gate is closed or when no canonical settled picks exist.
 *
 * Two layers of assertion:
 *   1. SOURCE-LEVEL: the page file imports `getReadinessGates`, references
 *      `canExposePerformanceStats`, and short-circuits to
 *      `PerformanceBootstrapState`.
 *   2. RENDER-LEVEL: the bootstrap state component renders the right
 *      copy in both gate-closed and gate-open-but-empty modes.
 */

const pageSource = readFileSync(
  resolve(__dirname, "..", "app", "performance", "page.tsx"),
  "utf8"
);

describe("Performance page — gate enforcement (source-level)", () => {
  it("imports getReadinessGates from the prediction engine", () => {
    expect(pageSource).toMatch(
      /import\s+\{[^}]*getReadinessGates[^}]*\}\s+from\s+["']@sports\/prediction-engine["']/
    );
  });

  it("checks the canExposePerformanceStats gate at the top of the page", () => {
    expect(pageSource).toMatch(/gates\.canExposePerformanceStats/);
  });

  it("renders the PerformanceBootstrapState when the gate is closed", () => {
    expect(pageSource).toMatch(
      /import\s+\{[^}]*PerformanceBootstrapState[^}]*\}\s+from\s+["']@\/components\/performance\/bootstrap-state["']/
    );
    expect(pageSource).toMatch(
      /!gates\.canExposePerformanceStats[\s\S]{0,1500}<PerformanceBootstrapState/
    );
  });

  it("does NOT call the database before the gate check", () => {
    // Find the index of the first DB call and the first gate check; gate must come first.
    const gateIdx = pageSource.indexOf("gates.canExposePerformanceStats");
    const dbIdx = pageSource.indexOf("getPerformanceSummaries(");
    expect(gateIdx).toBeGreaterThan(-1);
    expect(dbIdx).toBeGreaterThan(-1);
    expect(gateIdx).toBeLessThan(dbIdx);
  });

  it("includes methodology metadata (sample size, model version, win-rate definition) in the gated branch", () => {
    expect(pageSource).toMatch(/wins divided by decided outcomes/);
    expect(pageSource).toMatch(/model\s*version/i);
    expect(pageSource).toMatch(/sample\s*size/i);
  });
});

describe("PerformanceBootstrapState — gate-closed render", () => {
  it("renders the disabled label when the gate is off", () => {
    render(
      <PerformanceBootstrapState
        gateEnabled={false}
        minSettledPicksForLearning={100}
      />
    );
    expect(screen.getByTestId("bootstrap-status-label").textContent).toMatch(
      /Public stats disabled/i
    );
  });

  it("does NOT display fake win rate numbers", () => {
    const { container } = render(
      <PerformanceBootstrapState
        gateEnabled={false}
        minSettledPicksForLearning={100}
      />
    );
    // A win rate would be something like "67.5%" — there should be no
    // percentage numbers anywhere in the bootstrap state UI.
    expect(container.textContent).not.toMatch(/\d+(\.\d+)?%/);
  });

  it("includes the readiness ladder and the risk disclosure", () => {
    render(
      <PerformanceBootstrapState
        gateEnabled={false}
        minSettledPicksForLearning={100}
      />
    );
    expect(screen.getByTestId("readiness-ladder")).toBeInTheDocument();
    expect(screen.getByTestId("risk-disclosure")).toBeInTheDocument();
  });

  it("surfaces the minimum-settled-picks threshold from PlatformConfig", () => {
    render(
      <PerformanceBootstrapState
        gateEnabled={false}
        minSettledPicksForLearning={250}
      />
    );
    expect(screen.getByTestId("readiness-ladder").textContent).toContain("250");
  });
});

describe("PerformanceBootstrapState — gate-open-but-empty render", () => {
  it("uses 'No canonical performance data yet' wording, not 'disabled'", () => {
    render(
      <PerformanceBootstrapState
        gateEnabled
        minSettledPicksForLearning={100}
      />
    );
    expect(screen.getByTestId("bootstrap-status-label").textContent).toMatch(
      /No canonical performance data yet/i
    );
  });
});
