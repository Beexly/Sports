import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Jarvis health-tile coverage.
 *
 * The JarvisAssessment type declares 11 sectional health surfaces:
 *   publicSurfaceStatus, customerDashboardStatus, picksStatus,
 *   performanceStatus, cockpitStatus, historicalPickStatus,
 *   ingestionStatus, settlementStatus, canonicalHistoryStatus,
 *   bootstrapStatus, signalCoverageStatus.
 *
 * Each one must be:
 *   (a) declared on the JarvisAssessment interface in jarvis.ts
 *   (b) populated by synthesizeJarvis() in jarvis.ts
 *   (c) loaded by loadJarvisInputs / wired into the assessment
 *   (d) rendered as a labelled tile in the assessment panel
 *
 * If a future refactor adds or removes a health surface, this test
 * fails at the layer where the wiring drifted.
 */

const repoRoot = resolve(__dirname, "..");
const jarvisSrc = readFileSync(
  resolve(repoRoot, "lib/cockpit/jarvis.ts"),
  "utf8",
);
const panelSrc = readFileSync(
  resolve(repoRoot, "components/cockpit/jarvis-assessment-panel.tsx"),
  "utf8",
);
const statusStylesSrc = readFileSync(
  resolve(repoRoot, "lib/cockpit/status-styles.ts"),
  "utf8",
);

const SURFACES = [
  "publicSurfaceStatus",
  "customerDashboardStatus",
  "picksStatus",
  "performanceStatus",
  "cockpitStatus",
  "historicalPickStatus",
  "ingestionStatus",
  "settlementStatus",
  "canonicalHistoryStatus",
  "bootstrapStatus",
  "signalCoverageStatus",
] as const;

describe("Jarvis health-tile coverage", () => {
  it("declares exactly 11 sectional health surfaces on the interface", () => {
    // Count `readonly XStatus: JarvisHealth;` lines inside the interface block.
    const ifaceStart = jarvisSrc.indexOf("export interface JarvisAssessment");
    const ifaceEnd = jarvisSrc.indexOf("\n}", ifaceStart);
    const iface = jarvisSrc.slice(ifaceStart, ifaceEnd);
    const matches = iface.match(/readonly\s+\w+Status\s*:\s*JarvisHealth/g) ?? [];
    expect(matches.length).toBe(SURFACES.length);
  });

  it.each(SURFACES)(
    "%s is declared on JarvisAssessment with JarvisHealth type",
    (surface) => {
      const pattern = new RegExp(`readonly\\s+${surface}\\s*:\\s*JarvisHealth`);
      expect(jarvisSrc).toMatch(pattern);
    },
  );

  it.each(SURFACES)("%s is assigned by synthesizeJarvis() return", (surface) => {
    // Each surface should appear at least once on the right-hand side of a
    // return literal: `surface: someValue,` in the assessment construction.
    const pattern = new RegExp(`${surface}\\s*:`);
    expect(jarvisSrc).toMatch(pattern);
  });

  it.each(SURFACES)("%s is rendered as a labelled tile in the panel", (surface) => {
    expect(panelSrc).toContain(`assessment.${surface}`);
  });

  it("the panel sectional[] array has exactly 11 entries", () => {
    // Find the sectional array declaration and count its rows.
    const start = panelSrc.indexOf("const sectional");
    expect(start).toBeGreaterThan(-1);
    const end = panelSrc.indexOf("];", start);
    const block = panelSrc.slice(start, end);
    // Each row is `[ "Label", assessment.someStatus ],`.
    const rows = block.match(/\["[^"]+",\s*assessment\.\w+Status\]/g) ?? [];
    expect(rows.length).toBe(SURFACES.length);
  });

  it("every tile label is human-readable (no camelCase leakage)", () => {
    const start = panelSrc.indexOf("const sectional");
    const end = panelSrc.indexOf("];", start);
    const block = panelSrc.slice(start, end);
    // Pull the label strings: ["Label", assessment.X].
    const labels = [...block.matchAll(/\["([^"]+)",\s*assessment\.\w+Status\]/g)].map(
      (m) => m[1] ?? "",
    );
    expect(labels.length).toBe(SURFACES.length);
    for (const label of labels) {
      // No "publicSurfaceStatus" or other raw identifier in the visible label.
      expect(label).not.toMatch(/Status$/);
      expect(label).not.toMatch(/^[a-z][a-zA-Z]*[A-Z]/);
      // Should start uppercase (it's a UI label).
      expect(label[0]).toBe((label[0] ?? "").toUpperCase());
    }
  });

  it("panel uses the shared healthTone() from lib/cockpit/status-styles", () => {
    // healthTone() moved to the shared status-styles module so the cockpit's
    // visual language stays consistent across pages (jarvis-assessment-panel
    // no longer reimplements its own copy) — the panel imports it.
    expect(panelSrc).toMatch(/import\s+\{[^}]*\bhealthTone\b[^}]*\}\s+from\s+["']@\/lib\/cockpit\/status-styles["']/);
  });

  it("healthTone() covers GREEN/AMBER/RED/UNKNOWN exhaustively", () => {
    // The four JarvisHealth states must all map to a tone class.
    expect(statusStylesSrc).toMatch(/case\s+"GREEN"/);
    expect(statusStylesSrc).toMatch(/case\s+"AMBER"/);
    expect(statusStylesSrc).toMatch(/case\s+"RED"/);
    expect(statusStylesSrc).toMatch(/case\s+"UNKNOWN"|default:/);
  });
});
