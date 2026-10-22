import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getPlatformConfig } from "../platform-config";

/**
 * Unit tests for getPlatformConfig — verifies the "fail closed" invariant.
 *
 * Non-negotiable: every boolean gate must default to false when the
 * corresponding env var is absent or empty. An accidentally "open" gate
 * could expose bootstrap data, raw picks, or performance stats before
 * the system is operationally ready.
 */

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
      if (orig === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = orig;
      }
    }
  }
}

const BOOLEAN_GATES = [
  "CANONICAL_HISTORY_ENABLED",
  "DERIVED_MODEL_HISTORY_ENABLED",
  "PUBLIC_PICKS_ENABLED",
  "PUBLIC_BLOG_ENABLED",
  "PERFORMANCE_STATS_ENABLED",
  "FEATURED_PICK_PROMOTION_ENABLED",
  "OUTCOME_LEARNING_ENABLED",
] as const;

const GATE_TO_CONFIG_KEY: Record<(typeof BOOLEAN_GATES)[number], keyof ReturnType<typeof getPlatformConfig>> = {
  CANONICAL_HISTORY_ENABLED:      "canonicalHistoryEnabled",
  DERIVED_MODEL_HISTORY_ENABLED:  "derivedModelHistoryEnabled",
  PUBLIC_PICKS_ENABLED:           "publicPicksEnabled",
  PUBLIC_BLOG_ENABLED:            "publicBlogEnabled",
  PERFORMANCE_STATS_ENABLED:      "performanceStatsEnabled",
  FEATURED_PICK_PROMOTION_ENABLED:"featuredPickPromotionEnabled",
  OUTCOME_LEARNING_ENABLED:       "outcomeLearningEnabled",
};

describe("getPlatformConfig — fail closed defaults", () => {
  // Capture and restore all gate env vars around each test
  let saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    saved = {};
    for (const key of BOOLEAN_GATES) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    delete process.env["CONFIDENCE_DISPLAY_MODE"];
    delete process.env["MIN_DATA_QUALITY_FOR_GAME_LOG"];
    delete process.env["MIN_SETTLED_PICKS_FOR_LEARNING"];
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    }
  });

  for (const envKey of BOOLEAN_GATES) {
    it(`${envKey} defaults to false when env var is absent`, () => {
      const config = getPlatformConfig();
      const configKey = GATE_TO_CONFIG_KEY[envKey];
      expect(config[configKey]).toBe(false);
    });
  }

  for (const envKey of BOOLEAN_GATES) {
    it(`${envKey} defaults to false when set to empty string`, () => {
      withEnv({ [envKey]: "" }, () => {
        const config = getPlatformConfig();
        const configKey = GATE_TO_CONFIG_KEY[envKey];
        expect(config[configKey]).toBe(false);
      });
    });
  }

  it("all boolean gates are false simultaneously when no env vars set", () => {
    const config = getPlatformConfig();
    for (const envKey of BOOLEAN_GATES) {
      const configKey = GATE_TO_CONFIG_KEY[envKey];
      expect(config[configKey], `${envKey} should default false`).toBe(false);
    }
  });

  it("gates activate when set to 'true'", () => {
    withEnv({ PUBLIC_PICKS_ENABLED: "true" }, () => {
      expect(getPlatformConfig().publicPicksEnabled).toBe(true);
    });
  });

  it("gates activate when set to '1'", () => {
    withEnv({ CANONICAL_HISTORY_ENABLED: "1" }, () => {
      expect(getPlatformConfig().canonicalHistoryEnabled).toBe(true);
    });
  });

  it("gates stay false for unexpected truthy strings", () => {
    withEnv({ PUBLIC_PICKS_ENABLED: "yes" }, () => {
      expect(getPlatformConfig().publicPicksEnabled).toBe(false);
    });
    withEnv({ PUBLIC_PICKS_ENABLED: "on" }, () => {
      expect(getPlatformConfig().publicPicksEnabled).toBe(false);
    });
    withEnv({ PUBLIC_PICKS_ENABLED: "TRUE" }, () => {
      expect(getPlatformConfig().publicPicksEnabled).toBe(true); // case-insensitive
    });
  });

  it("confidenceDisplayMode defaults to 'labels' when absent", () => {
    expect(getPlatformConfig().confidenceDisplayMode).toBe("labels");
  });

  it("confidenceDisplayMode accepts valid modes", () => {
    withEnv({ CONFIDENCE_DISPLAY_MODE: "precision" }, () => {
      expect(getPlatformConfig().confidenceDisplayMode).toBe("precision");
    });
    withEnv({ CONFIDENCE_DISPLAY_MODE: "internal" }, () => {
      expect(getPlatformConfig().confidenceDisplayMode).toBe("internal");
    });
  });

  it("confidenceDisplayMode falls back to 'labels' for unknown values", () => {
    withEnv({ CONFIDENCE_DISPLAY_MODE: "raw" }, () => {
      expect(getPlatformConfig().confidenceDisplayMode).toBe("labels");
    });
  });

  it("minDataQualityForGameLog defaults to 40", () => {
    expect(getPlatformConfig().minDataQualityForGameLog).toBe(40);
  });

  it("minSettledPicksForLearning defaults to 100", () => {
    expect(getPlatformConfig().minSettledPicksForLearning).toBe(100);
  });

  it("minDataQualityForGameLog parses integer from env", () => {
    withEnv({ MIN_DATA_QUALITY_FOR_GAME_LOG: "60" }, () => {
      expect(getPlatformConfig().minDataQualityForGameLog).toBe(60);
    });
  });

  it("minDataQualityForGameLog falls back to default on NaN", () => {
    withEnv({ MIN_DATA_QUALITY_FOR_GAME_LOG: "notanumber" }, () => {
      expect(getPlatformConfig().minDataQualityForGameLog).toBe(40);
    });
  });

  it("minSettledPicksForLearning parses integer from env", () => {
    withEnv({ MIN_SETTLED_PICKS_FOR_LEARNING: "200" }, () => {
      expect(getPlatformConfig().minSettledPicksForLearning).toBe(200);
    });
  });

  it("minSettledPicksForLearning falls back to 100 on NaN", () => {
    withEnv({ MIN_SETTLED_PICKS_FOR_LEARNING: "bad" }, () => {
      expect(getPlatformConfig().minSettledPicksForLearning).toBe(100);
    });
  });

  it("parseBool treats explicit 'false' string as false", () => {
    withEnv({ PUBLIC_PICKS_ENABLED: "false" }, () => {
      expect(getPlatformConfig().publicPicksEnabled).toBe(false);
    });
  });

  it("parseBool treats '0' as false", () => {
    withEnv({ PUBLIC_PICKS_ENABLED: "0" }, () => {
      expect(getPlatformConfig().publicPicksEnabled).toBe(false);
    });
  });
});
