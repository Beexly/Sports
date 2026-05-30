/**
 * Targeted coverage for summarizeJarvisDiff branches not reached by
 * jarvis-diff.test.ts.
 *
 * The primary test only verifies "empty string when no changes" and
 * "matches /sectional|launchStatus/" for ingestion stale. It does NOT
 * individually test the +/- safety and +/- config parts of the summary.
 *
 * This file constructs JarvisDiff objects directly to test each branch
 * of summarizeJarvisDiff in isolation.
 */

import { describe, it, expect } from "vitest";
import { summarizeJarvisDiff } from "@/lib/cockpit/jarvis-diff";
import type { JarvisDiff } from "@/lib/cockpit/jarvis-diff";

function baseDiff(overrides: Partial<JarvisDiff> = {}): JarvisDiff {
  return {
    hasChanges: false,
    launchStatusChanged: false,
    sectionalChanges: [],
    warningCountChanges: [],
    newSafetyWarnings: [],
    clearedSafetyWarnings: [],
    newExternalConfig: [],
    clearedExternalConfig: [],
    ...overrides,
  };
}

// ============================================================
// hasChanges=false → empty string
// ============================================================

describe("summarizeJarvisDiff — no changes", () => {
  it("returns empty string when hasChanges is false", () => {
    expect(summarizeJarvisDiff(baseDiff())).toBe("");
  });
});

// ============================================================
// launchStatusChanged branch
// ============================================================

describe("summarizeJarvisDiff — launchStatusChanged", () => {
  it("includes 'launchStatus changed' when launchStatusChanged is true", () => {
    const summary = summarizeJarvisDiff(baseDiff({ hasChanges: true, launchStatusChanged: true }));
    expect(summary).toContain("launchStatus changed");
  });
});

// ============================================================
// sectionalChanges branch
// ============================================================

describe("summarizeJarvisDiff — sectionalChanges", () => {
  it("includes 'N sectional change(s)' for non-zero sectionalChanges", () => {
    const summary = summarizeJarvisDiff(baseDiff({
      hasChanges: true,
      sectionalChanges: [
        { key: "ingestion", previous: "HEALTHY", current: "DEGRADED" },
        { key: "model", previous: "GOOD", current: "WARN" },
      ],
    }));
    expect(summary).toContain("2 sectional change(s)");
  });

  it("includes '1 sectional change(s)' for a single change", () => {
    const summary = summarizeJarvisDiff(baseDiff({
      hasChanges: true,
      sectionalChanges: [{ key: "ingestion", previous: "HEALTHY", current: "DEGRADED" }],
    }));
    expect(summary).toContain("1 sectional change(s)");
  });
});

// ============================================================
// newSafetyWarnings branch
// ============================================================

describe("summarizeJarvisDiff — newSafetyWarnings", () => {
  it("includes '+N safety' for new safety warnings", () => {
    const summary = summarizeJarvisDiff(baseDiff({
      hasChanges: true,
      newSafetyWarnings: ["Warning A", "Warning B"],
    }));
    expect(summary).toContain("+2 safety");
  });

  it("includes '+1 safety' for single new safety warning", () => {
    const summary = summarizeJarvisDiff(baseDiff({
      hasChanges: true,
      newSafetyWarnings: ["Warning A"],
    }));
    expect(summary).toContain("+1 safety");
  });
});

// ============================================================
// clearedSafetyWarnings branch
// ============================================================

describe("summarizeJarvisDiff — clearedSafetyWarnings", () => {
  it("includes '-N safety' for cleared safety warnings", () => {
    const summary = summarizeJarvisDiff(baseDiff({
      hasChanges: true,
      clearedSafetyWarnings: ["Old Warning"],
    }));
    expect(summary).toContain("-1 safety");
  });
});

// ============================================================
// newExternalConfig branch
// ============================================================

describe("summarizeJarvisDiff — newExternalConfig", () => {
  it("includes '+N config' for new external config keys", () => {
    const summary = summarizeJarvisDiff(baseDiff({
      hasChanges: true,
      newExternalConfig: ["STRIPE_KEY", "THE_ODDS_API_KEY"],
    }));
    expect(summary).toContain("+2 config");
  });
});

// ============================================================
// clearedExternalConfig branch
// ============================================================

describe("summarizeJarvisDiff — clearedExternalConfig", () => {
  it("includes '-N config' for cleared external config keys", () => {
    const summary = summarizeJarvisDiff(baseDiff({
      hasChanges: true,
      clearedExternalConfig: ["OLD_KEY"],
    }));
    expect(summary).toContain("-1 config");
  });
});

// ============================================================
// Combined summary format
// ============================================================

describe("summarizeJarvisDiff — combined parts joined with ' · '", () => {
  it("joins all active parts with ' · ' separator", () => {
    const summary = summarizeJarvisDiff(baseDiff({
      hasChanges: true,
      launchStatusChanged: true,
      sectionalChanges: [{ key: "ingestion", previous: "HEALTHY", current: "DEGRADED" }],
      newSafetyWarnings: ["A new warning"],
    }));
    expect(summary).toContain(" · ");
    expect(summary).toContain("launchStatus changed");
    expect(summary).toContain("sectional change");
    expect(summary).toContain("+1 safety");
  });
});
