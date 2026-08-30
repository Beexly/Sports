import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(
  resolve(__dirname, "..", "components/cockpit/jarvis-assessment-panel.tsx"),
  "utf8"
);

describe("JarvisAssessmentPanel — contract", () => {
  it("exports the component and props type", () => {
    expect(src).toMatch(/export\s+function\s+JarvisAssessmentPanel/);
    expect(src).toMatch(/export\s+interface\s+JarvisAssessmentPanelProps/);
  });

  it("renders every sectional status from JarvisAssessment", () => {
    for (const field of [
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
    ]) {
      expect(src).toContain(`assessment.${field}`);
    }
  });

  it("uses a data-testid for tests to target", () => {
    expect(src).toMatch(/data-testid="jarvis-assessment-panel"/);
    expect(src).toMatch(/data-testid="jarvis-launch-status"/);
  });

  it("color-codes every JarvisLaunchStatus and JarvisHealth value", () => {
    for (const status of [
      "LAUNCH_READY",
      "LAUNCH_READY_PENDING_EXTERNAL_CONFIG",
      "NOT_READY_DATA",
      "NOT_READY_VALIDATION",
      "NOT_READY_SAFETY",
      "UNKNOWN",
    ]) {
      expect(src).toContain(status);
    }
    for (const health of ["GREEN", "AMBER", "RED", "UNKNOWN"]) {
      expect(src).toContain(`"${health}"`);
    }
  });

  it("does not import db, fetch, or perform side effects", () => {
    expect(src).not.toMatch(/from\s+["']@sports\/db["']/);
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/Math\.random/);
  });
});
