import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getPlatformConfig } from "../platform-config.js";

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

describe("getPlatformConfig — boolean gates default to false", () => {
  it("canonicalHistoryEnabled defaults to false", () => {
    expect(getPlatformConfig().canonicalHistoryEnabled).toBe(false);
  });

  it("derivedModelHistoryEnabled defaults to false", () => {
    expect(getPlatformConfig().derivedModelHistoryEnabled).toBe(false);
  });

  it("publicPicksEnabled defaults to false", () => {
    expect(getPlatformConfig().publicPicksEnabled).toBe(false);
  });

  it("publicBlogEnabled defaults to false", () => {
    expect(getPlatformConfig().publicBlogEnabled).toBe(false);
  });

  it("performanceStatsEnabled defaults to false", () => {
    expect(getPlatformConfig().performanceStatsEnabled).toBe(false);
  });

  it("featuredPickPromotionEnabled defaults to false", () => {
    expect(getPlatformConfig().featuredPickPromotionEnabled).toBe(false);
  });

  it("outcomeLearningEnabled defaults to false", () => {
    expect(getPlatformConfig().outcomeLearningEnabled).toBe(false);
  });
});

describe("getPlatformConfig — parseBool via CANONICAL_HISTORY_ENABLED", () => {
  it("parses 'true' as true", () => {
    process.env["CANONICAL_HISTORY_ENABLED"] = "true";
    expect(getPlatformConfig().canonicalHistoryEnabled).toBe(true);
  });

  it("parses '1' as true", () => {
    process.env["CANONICAL_HISTORY_ENABLED"] = "1";
    expect(getPlatformConfig().canonicalHistoryEnabled).toBe(true);
  });

  it("parses 'True' (mixed case) as true", () => {
    process.env["CANONICAL_HISTORY_ENABLED"] = "True";
    expect(getPlatformConfig().canonicalHistoryEnabled).toBe(true);
  });

  it("parses 'TRUE' (upper case) as true", () => {
    process.env["CANONICAL_HISTORY_ENABLED"] = "TRUE";
    expect(getPlatformConfig().canonicalHistoryEnabled).toBe(true);
  });

  it("parses 'false' as false", () => {
    process.env["CANONICAL_HISTORY_ENABLED"] = "false";
    expect(getPlatformConfig().canonicalHistoryEnabled).toBe(false);
  });

  it("parses '0' as false", () => {
    process.env["CANONICAL_HISTORY_ENABLED"] = "0";
    expect(getPlatformConfig().canonicalHistoryEnabled).toBe(false);
  });

  it("parses empty string as the default (false)", () => {
    process.env["CANONICAL_HISTORY_ENABLED"] = "";
    expect(getPlatformConfig().canonicalHistoryEnabled).toBe(false);
  });
});

describe("getPlatformConfig — confidenceDisplayMode", () => {
  it("defaults to 'labels' when env var is absent", () => {
    expect(getPlatformConfig().confidenceDisplayMode).toBe("labels");
  });

  it("accepts 'precision'", () => {
    process.env["CONFIDENCE_DISPLAY_MODE"] = "precision";
    expect(getPlatformConfig().confidenceDisplayMode).toBe("precision");
  });

  it("accepts 'labels'", () => {
    process.env["CONFIDENCE_DISPLAY_MODE"] = "labels";
    expect(getPlatformConfig().confidenceDisplayMode).toBe("labels");
  });

  it("accepts 'internal'", () => {
    process.env["CONFIDENCE_DISPLAY_MODE"] = "internal";
    expect(getPlatformConfig().confidenceDisplayMode).toBe("internal");
  });

  it("falls back to 'labels' for unknown values", () => {
    process.env["CONFIDENCE_DISPLAY_MODE"] = "unknown-value";
    expect(getPlatformConfig().confidenceDisplayMode).toBe("labels");
  });

  it("falls back to 'labels' for empty string", () => {
    process.env["CONFIDENCE_DISPLAY_MODE"] = "";
    expect(getPlatformConfig().confidenceDisplayMode).toBe("labels");
  });
});

describe("getPlatformConfig — numeric gates (parseIntSafe)", () => {
  it("minDataQualityForGameLog defaults to 40", () => {
    expect(getPlatformConfig().minDataQualityForGameLog).toBe(40);
  });

  it("minDataQualityForGameLog parses a valid integer", () => {
    process.env["MIN_DATA_QUALITY_FOR_GAME_LOG"] = "60";
    expect(getPlatformConfig().minDataQualityForGameLog).toBe(60);
  });

  it("minDataQualityForGameLog falls back to default on non-numeric input", () => {
    process.env["MIN_DATA_QUALITY_FOR_GAME_LOG"] = "not-a-number";
    expect(getPlatformConfig().minDataQualityForGameLog).toBe(40);
  });

  it("minDataQualityForGameLog falls back to default on empty string", () => {
    process.env["MIN_DATA_QUALITY_FOR_GAME_LOG"] = "";
    expect(getPlatformConfig().minDataQualityForGameLog).toBe(40);
  });

  it("minSettledPicksForLearning defaults to 100", () => {
    expect(getPlatformConfig().minSettledPicksForLearning).toBe(100);
  });

  it("minSettledPicksForLearning parses a valid integer", () => {
    process.env["MIN_SETTLED_PICKS_FOR_LEARNING"] = "250";
    expect(getPlatformConfig().minSettledPicksForLearning).toBe(250);
  });

  it("minSettledPicksForLearning falls back to default on NaN", () => {
    process.env["MIN_SETTLED_PICKS_FOR_LEARNING"] = "abc";
    expect(getPlatformConfig().minSettledPicksForLearning).toBe(100);
  });
});
