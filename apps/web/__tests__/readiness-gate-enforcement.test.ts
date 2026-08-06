import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Readiness-gate enforcement — source-level invariants.
 *
 * These tests pin a set of "the gate must be honored here" patterns in
 * the engine code. They're cheap to run, fast to fail, and they catch a
 * whole class of regression where a refactor lifts a flag out of a path
 * that depended on it.
 */

const repoRoot = resolve(__dirname, "..", "..", "..");

function read(p: string): string {
  return readFileSync(resolve(repoRoot, p), "utf8");
}

describe("Readiness gate enforcement at the engine boundary", () => {
  it("ingestion pipeline derives isFeatured from canPromoteFeaturedPicks", () => {
    const src = read("packages/ingestion-pipeline/src/process-sport.ts");
    // The assignment that decides isFeatured must reference the gate.
    expect(src).toMatch(/isFeatured\s*=\s*[^;]*gates\.canPromoteFeaturedPicks/);
  });

  it("ingestion pipeline never sets isFeatured: true outside the gate-derived value", () => {
    const src = read("packages/ingestion-pipeline/src/process-sport.ts");
    // No literal `isFeatured: true` should appear — every write must use
    // the `isFeatured` variable that the gate produced. (This catches a
    // copy-paste regression like `isFeatured: true,` slipping into a
    // workaround code path.)
    const literalTrueWrites = src.match(/isFeatured\s*:\s*true/g);
    expect(literalTrueWrites, "isFeatured must be the gate-derived variable, never a hard-coded true").toBeNull();
  });

  it("ingestion pipeline derives isBootstrap from gates and never hardcodes false", () => {
    const src = read("packages/ingestion-pipeline/src/process-sport.ts");
    expect(src).toMatch(/isBootstrap/);
    // Hardcoded `isBootstrap: false` on a write is a leak vector during
    // bootstrap mode. The variable should come from the gate.
    const literalFalseOnWrite = src.match(/create:\s*\{[^}]*isBootstrap\s*:\s*false/);
    expect(
      literalFalseOnWrite,
      "ingestion pipeline must not hardcode isBootstrap=false in a create payload"
    ).toBeNull();
  });

  it("readiness module surfaces canPromoteFeaturedPicks", () => {
    const src = read("packages/prediction-engine/src/readiness.ts");
    expect(src).toMatch(/canPromoteFeaturedPicks/);
  });

  it("readiness module surfaces canExposePublicPicks", () => {
    const src = read("packages/prediction-engine/src/readiness.ts");
    expect(src).toMatch(/canExposePublicPicks/);
  });

  it("readiness module surfaces canExposePerformanceStats", () => {
    const src = read("packages/prediction-engine/src/readiness.ts");
    expect(src).toMatch(/canExposePerformanceStats/);
  });

  it("canApplyCalibrationAdjustments routes through CALIBRATION_ADJUSTMENTS_ENABLED env gate (default false)", () => {
    const readinessSrc = read("packages/prediction-engine/src/readiness.ts");
    const configSrc = read("packages/prediction-engine/src/platform-config.ts");
    // Gate is env-configurable but defaults to false — activation still
    // requires the audited MODEL_VERSION sequence in docs/path-to-70.md §7.
    expect(readinessSrc).toMatch(/canApplyCalibrationAdjustments\s*:\s*config\.calibrationAdjustmentsEnabled/);
    expect(configSrc).toMatch(/CALIBRATION_ADJUSTMENTS_ENABLED/);
    expect(configSrc).toMatch(/calibrationAdjustmentsEnabled.*false/);
  });

  it("bootstrapGateResponse helper is exported with the right shape", () => {
    const src = read("packages/prediction-engine/src/readiness.ts");
    expect(src).toMatch(/export function bootstrapGateResponse/);
    expect(src).toMatch(/bootstrapMode/);
    expect(src).toMatch(/feature_gate/);
    expect(src).toMatch(/reason/)
  });

  it("process-sport derives isBootstrap from !canPersistCanonicalHistory at function entry", () => {
    const src = read("packages/ingestion-pipeline/src/process-sport.ts");
    // The expression `!gates.canPersistCanonicalHistory` should be the
    // single source for the isBootstrap variable inside this function.
    expect(src).toMatch(/const\s+isBootstrap\s*=\s*!\s*gates\.canPersistCanonicalHistory/);
  });

  it("process-sport upsert .create blocks pass isBootstrap (no literal true/false)", () => {
    const src = read("packages/ingestion-pipeline/src/process-sport.ts");
    // The create payloads must reference the gate-derived variable. We
    // already assert no literal `isBootstrap: false` exists in a create
    // block elsewhere; check the converse for `isBootstrap: true` too.
    const literalTrueInCreate = src.match(/create:\s*\{[^}]*isBootstrap\s*:\s*true/);
    expect(
      literalTrueInCreate,
      "process-sport must not hardcode isBootstrap=true in a create payload — derive it from the gate."
    ).toBeNull();
  });

  it("process-sport upsert .update never overwrites isBootstrap (era is immutable)", () => {
    const src = read("packages/ingestion-pipeline/src/process-sport.ts");
    // The update block must NOT carry an isBootstrap key. Origin era is
    // set at creation and never changed by a refresh.
    const m = src.match(/update:\s*\{([^}]+)\}/);
    if (m) {
      expect(
        /isBootstrap/.test(m[1] ?? ""),
        "process-sport upsert.update must not include isBootstrap — creation era is immutable."
      ).toBe(false);
    }
  });
});
