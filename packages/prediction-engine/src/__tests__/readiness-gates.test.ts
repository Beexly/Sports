import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getReadinessGates } from "../readiness";

/**
 * Unit tests for getReadinessGates() — pins the mapping from PlatformConfig
 * to ReadinessGates. Tests run in a clean env (all gates off) to assert the
 * most restrictive possible startup state, then selectively enable gates
 * to verify each mapping is correct.
 */

const GATE_VARS = [
  "CANONICAL_HISTORY_ENABLED",
  "DERIVED_MODEL_HISTORY_ENABLED",
  "PUBLIC_PICKS_ENABLED",
  "PUBLIC_BLOG_ENABLED",
  "PERFORMANCE_STATS_ENABLED",
  "FEATURED_PICK_PROMOTION_ENABLED",
  "OUTCOME_LEARNING_ENABLED",
  "CONFIDENCE_DISPLAY_MODE",
  "MIN_DATA_QUALITY_FOR_GAME_LOG",
  "MIN_SETTLED_PICKS_FOR_LEARNING",
];

function withEnv(overrides: Record<string, string>, fn: () => void): void {
  const saved: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(overrides)) {
    saved[k] = process.env[k];
    process.env[k] = v;
  }
  try {
    fn();
  } finally {
    for (const [k, orig] of Object.entries(saved)) {
      if (orig === undefined) delete process.env[k];
      else process.env[k] = orig;
    }
  }
}

describe("getReadinessGates — env → gate mapping", () => {
  let saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    saved = {};
    for (const key of GATE_VARS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  describe("constant gates", () => {
    it("canScore is always true", () => {
      expect(getReadinessGates().canScore).toBe(true);
    });

    it("canPersistPicks is always true", () => {
      expect(getReadinessGates().canPersistPicks).toBe(true);
    });

    it("canApplyCalibrationAdjustments is always false", () => {
      // Literal false type — auto-calibration can never be env-enabled
      expect(getReadinessGates().canApplyCalibrationAdjustments).toBe(false);
    });
  });

  describe("boolean gate mappings", () => {
    it("canPersistCanonicalHistory ← CANONICAL_HISTORY_ENABLED (off by default)", () => {
      expect(getReadinessGates().canPersistCanonicalHistory).toBe(false);
      withEnv({ CANONICAL_HISTORY_ENABLED: "true" }, () => {
        expect(getReadinessGates().canPersistCanonicalHistory).toBe(true);
      });
    });

    it("canUseDerivedHistory ← DERIVED_MODEL_HISTORY_ENABLED (off by default)", () => {
      expect(getReadinessGates().canUseDerivedHistory).toBe(false);
      withEnv({ DERIVED_MODEL_HISTORY_ENABLED: "true" }, () => {
        expect(getReadinessGates().canUseDerivedHistory).toBe(true);
      });
    });

    it("canExposePublicPicks ← PUBLIC_PICKS_ENABLED (off by default)", () => {
      expect(getReadinessGates().canExposePublicPicks).toBe(false);
      withEnv({ PUBLIC_PICKS_ENABLED: "true" }, () => {
        expect(getReadinessGates().canExposePublicPicks).toBe(true);
      });
    });

    it("canPublishContent ← PUBLIC_BLOG_ENABLED (off by default)", () => {
      expect(getReadinessGates().canPublishContent).toBe(false);
      withEnv({ PUBLIC_BLOG_ENABLED: "true" }, () => {
        expect(getReadinessGates().canPublishContent).toBe(true);
      });
    });

    it("canExposePerformanceStats ← PERFORMANCE_STATS_ENABLED (off by default)", () => {
      expect(getReadinessGates().canExposePerformanceStats).toBe(false);
      withEnv({ PERFORMANCE_STATS_ENABLED: "true" }, () => {
        expect(getReadinessGates().canExposePerformanceStats).toBe(true);
      });
    });

    it("canPromoteFeaturedPicks ← FEATURED_PICK_PROMOTION_ENABLED (off by default)", () => {
      expect(getReadinessGates().canPromoteFeaturedPicks).toBe(false);
      withEnv({ FEATURED_PICK_PROMOTION_ENABLED: "true" }, () => {
        expect(getReadinessGates().canPromoteFeaturedPicks).toBe(true);
      });
    });

    it("canLearnFromOutcomes ← OUTCOME_LEARNING_ENABLED (off by default)", () => {
      expect(getReadinessGates().canLearnFromOutcomes).toBe(false);
      withEnv({ OUTCOME_LEARNING_ENABLED: "true" }, () => {
        expect(getReadinessGates().canLearnFromOutcomes).toBe(true);
      });
    });
  });

  describe("derived / computed gates", () => {
    it("isBootstrapMode = !canPersistCanonicalHistory", () => {
      expect(getReadinessGates().isBootstrapMode).toBe(true); // default: canonical off
      withEnv({ CANONICAL_HISTORY_ENABLED: "true" }, () => {
        expect(getReadinessGates().isBootstrapMode).toBe(false);
      });
    });

    it("confidenceDisplayMode defaults to 'labels'", () => {
      expect(getReadinessGates().confidenceDisplayMode).toBe("labels");
    });

    it("minDataQualityForGameLog defaults to 40", () => {
      expect(getReadinessGates().minDataQualityForGameLog).toBe(40);
    });

    it("minSettledPicksForLearning defaults to 100", () => {
      expect(getReadinessGates().minSettledPicksForLearning).toBe(100);
    });
  });

  describe("full bootstrap-mode state", () => {
    it("in default (all off) state, every gate that can be open is closed", () => {
      const gates = getReadinessGates();
      expect(gates.canPersistCanonicalHistory).toBe(false);
      expect(gates.canUseDerivedHistory).toBe(false);
      expect(gates.canExposePublicPicks).toBe(false);
      expect(gates.canPublishContent).toBe(false);
      expect(gates.canExposePerformanceStats).toBe(false);
      expect(gates.canPromoteFeaturedPicks).toBe(false);
      expect(gates.canLearnFromOutcomes).toBe(false);
      expect(gates.isBootstrapMode).toBe(true);
    });
  });
});
