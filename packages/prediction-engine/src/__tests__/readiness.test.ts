import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getReadinessGates, bootstrapGateResponse } from "../readiness.js";

const ENV_KEYS = [
  "CANONICAL_HISTORY_ENABLED",
  "DERIVED_MODEL_HISTORY_ENABLED",
  "PUBLIC_PICKS_ENABLED",
  "PUBLIC_BLOG_ENABLED",
  "PERFORMANCE_STATS_ENABLED",
  "CONFIDENCE_DISPLAY_MODE",
  "FEATURED_PICK_PROMOTION_ENABLED",
  "MIN_DATA_QUALITY_FOR_GAME_LOG",
  "OUTCOME_LEARNING_ENABLED",
  "MIN_SETTLED_PICKS_FOR_LEARNING",
] as const;

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = saved[key];
    }
  }
});

// ============================================================
// bootstrapGateResponse
// ============================================================

describe("bootstrapGateResponse", () => {
  it("includes the feature name in the error message", () => {
    const res = bootstrapGateResponse("Public picks");
    expect(res.error).toContain("Public picks");
  });

  it("bootstrapMode is always true (literal type)", () => {
    const res = bootstrapGateResponse("Content publishing");
    expect(res.bootstrapMode).toBe(true);
  });

  it("includes a non-empty hint", () => {
    const res = bootstrapGateResponse("Performance stats");
    expect(typeof res.hint).toBe("string");
    expect(res.hint.length).toBeGreaterThan(0);
  });

  it("returns an object with exactly error, bootstrapMode, and hint keys", () => {
    const res = bootstrapGateResponse("Feature X");
    expect(Object.keys(res).sort()).toEqual(["bootstrapMode", "error", "hint"]);
  });
});

// ============================================================
// getReadinessGates — invariant gates
// ============================================================

describe("getReadinessGates — invariant gates", () => {
  it("canScore is always true regardless of config", () => {
    expect(getReadinessGates().canScore).toBe(true);
  });

  it("canPersistPicks is always true regardless of config", () => {
    expect(getReadinessGates().canPersistPicks).toBe(true);
  });

  it("canApplyCalibrationAdjustments is always false", () => {
    // Calibration weight changes require explicit human review and a model version bump.
    process.env["CANONICAL_HISTORY_ENABLED"] = "true";
    process.env["DERIVED_MODEL_HISTORY_ENABLED"] = "true";
    process.env["OUTCOME_LEARNING_ENABLED"] = "true";
    expect(getReadinessGates().canApplyCalibrationAdjustments).toBe(false);
  });
});

// ============================================================
// getReadinessGates — all-off defaults (bootstrap mode)
// ============================================================

describe("getReadinessGates — defaults (all env vars absent)", () => {
  it("isBootstrapMode is true when canonicalHistoryEnabled is false", () => {
    expect(getReadinessGates().isBootstrapMode).toBe(true);
  });

  it("canPersistCanonicalHistory is false by default", () => {
    expect(getReadinessGates().canPersistCanonicalHistory).toBe(false);
  });

  it("canUseDerivedHistory is false by default", () => {
    expect(getReadinessGates().canUseDerivedHistory).toBe(false);
  });

  it("canExposePublicPicks is false by default", () => {
    expect(getReadinessGates().canExposePublicPicks).toBe(false);
  });

  it("canPromoteFeaturedPicks is false by default", () => {
    expect(getReadinessGates().canPromoteFeaturedPicks).toBe(false);
  });

  it("canPublishContent is false by default", () => {
    expect(getReadinessGates().canPublishContent).toBe(false);
  });

  it("canExposePerformanceStats is false by default", () => {
    expect(getReadinessGates().canExposePerformanceStats).toBe(false);
  });

  it("canLearnFromOutcomes is false by default", () => {
    expect(getReadinessGates().canLearnFromOutcomes).toBe(false);
  });

  it("confidenceDisplayMode defaults to 'labels'", () => {
    expect(getReadinessGates().confidenceDisplayMode).toBe("labels");
  });
});

// ============================================================
// getReadinessGates — env-driven gate mapping
// ============================================================

describe("getReadinessGates — gate mapping follows config", () => {
  it("isBootstrapMode flips to false when canonicalHistoryEnabled=true", () => {
    process.env["CANONICAL_HISTORY_ENABLED"] = "true";
    expect(getReadinessGates().isBootstrapMode).toBe(false);
  });

  it("canPersistCanonicalHistory follows canonicalHistoryEnabled", () => {
    process.env["CANONICAL_HISTORY_ENABLED"] = "true";
    expect(getReadinessGates().canPersistCanonicalHistory).toBe(true);
  });

  it("canUseDerivedHistory follows derivedModelHistoryEnabled", () => {
    process.env["DERIVED_MODEL_HISTORY_ENABLED"] = "true";
    expect(getReadinessGates().canUseDerivedHistory).toBe(true);
  });

  it("canExposePublicPicks follows publicPicksEnabled", () => {
    process.env["PUBLIC_PICKS_ENABLED"] = "true";
    expect(getReadinessGates().canExposePublicPicks).toBe(true);
  });

  it("canPublishContent follows publicBlogEnabled", () => {
    process.env["PUBLIC_BLOG_ENABLED"] = "true";
    expect(getReadinessGates().canPublishContent).toBe(true);
  });

  it("canExposePerformanceStats follows performanceStatsEnabled", () => {
    process.env["PERFORMANCE_STATS_ENABLED"] = "true";
    expect(getReadinessGates().canExposePerformanceStats).toBe(true);
  });

  it("canLearnFromOutcomes follows outcomeLearningEnabled", () => {
    process.env["OUTCOME_LEARNING_ENABLED"] = "true";
    expect(getReadinessGates().canLearnFromOutcomes).toBe(true);
  });

  it("confidenceDisplayMode follows CONFIDENCE_DISPLAY_MODE env var", () => {
    process.env["CONFIDENCE_DISPLAY_MODE"] = "precision";
    expect(getReadinessGates().confidenceDisplayMode).toBe("precision");
  });

  it("minDataQualityForGameLog follows MIN_DATA_QUALITY_FOR_GAME_LOG env var", () => {
    process.env["MIN_DATA_QUALITY_FOR_GAME_LOG"] = "65";
    expect(getReadinessGates().minDataQualityForGameLog).toBe(65);
  });

  it("minSettledPicksForLearning follows MIN_SETTLED_PICKS_FOR_LEARNING env var", () => {
    process.env["MIN_SETTLED_PICKS_FOR_LEARNING"] = "200";
    expect(getReadinessGates().minSettledPicksForLearning).toBe(200);
  });

  it("config field is the raw PlatformConfig", () => {
    process.env["PUBLIC_PICKS_ENABLED"] = "true";
    const gates = getReadinessGates();
    expect(gates.config.publicPicksEnabled).toBe(true);
    // The gate and config field should agree
    expect(gates.canExposePublicPicks).toBe(gates.config.publicPicksEnabled);
  });
});

// ============================================================
// getReadinessGates — bootstrap progression phases
// ============================================================

describe("getReadinessGates — bootstrap progression phases", () => {
  it("Phase 0 (all defaults): all gates closed", () => {
    const gates = getReadinessGates();
    expect(gates.isBootstrapMode).toBe(true);
    expect(gates.canExposePublicPicks).toBe(false);
    expect(gates.canPublishContent).toBe(false);
    expect(gates.canExposePerformanceStats).toBe(false);
    expect(gates.canLearnFromOutcomes).toBe(false);
    expect(gates.canApplyCalibrationAdjustments).toBe(false);
  });

  it("Phase 2 (canonical history enabled): exits bootstrap mode", () => {
    process.env["CANONICAL_HISTORY_ENABLED"] = "true";
    const gates = getReadinessGates();
    expect(gates.isBootstrapMode).toBe(false);
    expect(gates.canPersistCanonicalHistory).toBe(true);
    // Other gates still closed without their own env var
    expect(gates.canExposePublicPicks).toBe(false);
    expect(gates.canUseDerivedHistory).toBe(false);
  });

  it("Phase 3 (derived history enabled): ATS/H2H gates open", () => {
    process.env["CANONICAL_HISTORY_ENABLED"] = "true";
    process.env["DERIVED_MODEL_HISTORY_ENABLED"] = "true";
    const gates = getReadinessGates();
    expect(gates.canUseDerivedHistory).toBe(true);
    expect(gates.canApplyCalibrationAdjustments).toBe(false); // still locked
  });
});
