import { describe, expect, it } from "vitest";
import {
  canonicalHistoryEnabled,
  contextualVaultCtaEnabled,
  isFeatureEnabled,
  performanceStatsEnabled,
  proofSurfaceEmailCaptureEnabled,
  publicBlogEnabled,
  publicPicksEnabled,
} from "./feature-flags";

describe("feature flags", () => {
  it("treats 1 and true as enabled", () => {
    process.env.TEST_FLAG_ONE = "1";
    process.env.TEST_FLAG_TRUE = "true";

    expect(isFeatureEnabled("TEST_FLAG_ONE")).toBe(true);
    expect(isFeatureEnabled("TEST_FLAG_TRUE")).toBe(true);
  });

  it("treats missing and non-matching values as disabled", () => {
    delete process.env.TEST_FLAG_MISSING;
    process.env.TEST_FLAG_FALSE = "false";
    process.env.TEST_FLAG_ZERO = "0";

    expect(isFeatureEnabled("TEST_FLAG_MISSING")).toBe(false);
    expect(isFeatureEnabled("TEST_FLAG_FALSE")).toBe(false);
    expect(isFeatureEnabled("TEST_FLAG_ZERO")).toBe(false);
  });

  it("exposes explicit gate helpers for trust-sensitive public surfaces", () => {
    process.env.PROOF_SURFACE_EMAIL_CAPTURE_ENABLED = "true";
    process.env.CONTEXTUAL_VAULT_CTA_ENABLED = "1";
    process.env.PUBLIC_PICKS_ENABLED = "1";
    process.env.PUBLIC_BLOG_ENABLED = "true";
    process.env.PERFORMANCE_STATS_ENABLED = "true";
    process.env.CANONICAL_HISTORY_ENABLED = "1";

    expect(proofSurfaceEmailCaptureEnabled()).toBe(true);
    expect(contextualVaultCtaEnabled()).toBe(true);
    expect(publicPicksEnabled()).toBe(true);
    expect(publicBlogEnabled()).toBe(true);
    expect(performanceStatsEnabled()).toBe(true);
    expect(canonicalHistoryEnabled()).toBe(true);
  });
});
