import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Pin the shape of the ReadinessGates interface that the cockpit + the
 * Jarvis loader + every customer-surface gate-check depends on.
 *
 * Source-level: parse packages/prediction-engine/src/readiness.ts and
 * assert it declares every key we consume downstream.
 */

const repoRoot = resolve(__dirname, "..", "..", "..");
const src = readFileSync(
  resolve(repoRoot, "packages/prediction-engine/src/readiness.ts"),
  "utf8"
);

const REQUIRED_GATE_FIELDS = [
  "canScore",
  "canPersistPicks",
  "canPersistCanonicalHistory",
  "canUseDerivedHistory",
  "canExposePublicPicks",
  "canPromoteFeaturedPicks",
  "canPublishContent",
  "canExposePerformanceStats",
  "canLearnFromOutcomes",
  "canApplyCalibrationAdjustments",
  "isBootstrapMode",
  "confidenceDisplayMode",
  "minDataQualityForGameLog",
  "minSettledPicksForLearning",
];

describe("ReadinessGates contract", () => {
  for (const field of REQUIRED_GATE_FIELDS) {
    it(`declares ${field}`, () => {
      expect(
        src.includes(`${field}`),
        `ReadinessGates is missing required field: ${field}`
      ).toBe(true);
    });
  }

  it("canApplyCalibrationAdjustments is declared and wired to the env-configurable gate", () => {
    // Gate is now env-driven (CALIBRATION_ADJUSTMENTS_ENABLED, default false).
    // Activation still requires the audited MODEL_VERSION sequence.
    expect(src).toContain("canApplyCalibrationAdjustments");
    expect(src).toMatch(/calibrationAdjustmentsEnabled/);
  });

  it("getReadinessGates() returns the canonical shape", () => {
    expect(src).toMatch(/export\s+function\s+getReadinessGates/);
    expect(src).toMatch(/:\s*ReadinessGates/);
  });

  it("bootstrapGateResponse() returns the expected JSON envelope", () => {
    expect(src).toMatch(/export\s+function\s+bootstrapGateResponse/);
    expect(src).toMatch(/bootstrapMode:\s*true/);
    expect(src).toMatch(/hint:\s*"/);
  });
});
