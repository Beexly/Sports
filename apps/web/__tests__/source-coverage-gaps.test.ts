/**
 * Targeted coverage for evaluateContentSourceCoverage branches not exercised
 * by the broader content-engine.test.ts suite.
 *
 * Gaps addressed:
 *   - NEEDS_SOURCE when ALL required source types are absent
 *   - STALE-all → BLOCKED (vs FRESH + STALE mix → not blocked)
 *   - performanceGateOn=true allows PERFORMANCE content
 *   - RESPONSIBLE_GAMING regulated trust rejection
 *   - CALIBRATION trust rejection (separate from INTERNAL_ONLY note)
 *   - `covered: false` on every non-COVERED status
 */

import { describe, it, expect } from "vitest";
import { evaluateContentSourceCoverage } from "@/lib/content-engine/source-coverage";
import type { ContentSourceRecord } from "@/lib/content-engine/types";

function src(
  type: ContentSourceRecord["sourceType"],
  overrides: Partial<ContentSourceRecord> = {}
): ContentSourceRecord {
  return {
    sourceType: type,
    sourceLabel: `${type}-label`,
    sourceStatus: "FRESH",
    trustLevel: "PLATFORM",
    sourceUrl: null,
    fetchedAt: null,
    notes: null,
    ...overrides,
  };
}

// ============================================================
// NEEDS_SOURCE vs PARTIAL
// ============================================================

describe("evaluateContentSourceCoverage — NEEDS_SOURCE vs PARTIAL", () => {
  it("returns NEEDS_SOURCE when every required source type is absent", () => {
    // LINE_MOVEMENT_WATCH requires only ["ODDS"] — supply nothing
    const v = evaluateContentSourceCoverage({
      contentType: "LINE_MOVEMENT_WATCH",
      sources: [],
      performanceGateOn: false,
    });
    expect(v.status).toBe("NEEDS_SOURCE");
    expect(v.missing).toContain("ODDS");
    expect(v.covered).toBe(false);
  });

  it("returns NEEDS_SOURCE when all required types are absent (multi-source type)", () => {
    // DAILY_BRIEF requires ["ODDS", "DAILY_BRIEF"]
    const v = evaluateContentSourceCoverage({
      contentType: "DAILY_BRIEF",
      sources: [],
      performanceGateOn: false,
    });
    expect(v.status).toBe("NEEDS_SOURCE");
    expect(v.missing).toContain("ODDS");
    expect(v.missing).toContain("DAILY_BRIEF");
  });

  it("returns PARTIAL when only some required types are present", () => {
    // DAILY_BRIEF requires ["ODDS", "DAILY_BRIEF"] — supply only ODDS
    const v = evaluateContentSourceCoverage({
      contentType: "DAILY_BRIEF",
      sources: [src("ODDS")],
      performanceGateOn: false,
    });
    expect(v.status).toBe("PARTIAL");
    expect(v.missing).toContain("DAILY_BRIEF");
    expect(v.missing).not.toContain("ODDS");
    expect(v.covered).toBe(false);
  });
});

// ============================================================
// STALE all-records → BLOCKED
// ============================================================

describe("evaluateContentSourceCoverage — stale sources", () => {
  it("returns BLOCKED when all records for a required source type are STALE", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "METHODOLOGY_EDUCATION",
      sources: [src("METHODOLOGY", { sourceStatus: "STALE" })],
      performanceGateOn: false,
    });
    expect(v.status).toBe("BLOCKED");
    expect(v.covered).toBe(false);
    expect(v.blockers.some((b) => b.includes("STALE"))).toBe(true);
  });

  it("does NOT block when at least one record for the type is not STALE", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "METHODOLOGY_EDUCATION",
      sources: [
        src("METHODOLOGY", { sourceStatus: "STALE" }),
        src("METHODOLOGY", { sourceStatus: "FRESH" }),
      ],
      performanceGateOn: false,
    });
    expect(v.status).toBe("COVERED");
    expect(v.covered).toBe(true);
  });

  it("uses the most recent record to escape STALE for regulated types", () => {
    // RESPONSIBLE_GAMING is regulated; one STALE + one FRESH AUTHORITATIVE → COVERED
    const v = evaluateContentSourceCoverage({
      contentType: "PROMOTION_ROUNDUP",
      sources: [
        src("PROMOTION_TERMS", {
          sourceUrl: "https://example.com/terms",
          trustLevel: "AUTHORITATIVE",
        }),
        src("RESPONSIBLE_GAMING", { sourceStatus: "STALE", trustLevel: "AUTHORITATIVE" }),
        src("RESPONSIBLE_GAMING", { sourceStatus: "FRESH", trustLevel: "AUTHORITATIVE" }),
      ],
      performanceGateOn: false,
    });
    // Not all RESPONSIBLE_GAMING records are stale, so stale blocker is absent
    expect(v.blockers.filter((b) => b.includes("STALE") && b.includes("RESPONSIBLE_GAMING"))).toHaveLength(0);
  });
});

// ============================================================
// performanceGateOn=true allows PERFORMANCE content
// ============================================================

describe("evaluateContentSourceCoverage — performance gate", () => {
  it("returns COVERED when performanceGateOn=true and PERFORMANCE source is present", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "PERFORMANCE_TRANSPARENCY",
      sources: [
        src("PERFORMANCE", { trustLevel: "AUTHORITATIVE" }),
        src("METHODOLOGY"),
      ],
      performanceGateOn: true,
    });
    expect(v.status).toBe("COVERED");
    expect(v.covered).toBe(true);
    expect(v.blockers).toHaveLength(0);
  });

  it("returns BLOCKED when performanceGateOn=false even with PERFORMANCE source present", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "PERFORMANCE_TRANSPARENCY",
      sources: [
        src("PERFORMANCE", { trustLevel: "AUTHORITATIVE" }),
        src("METHODOLOGY"),
      ],
      performanceGateOn: false,
    });
    expect(v.status).toBe("BLOCKED");
    expect(v.covered).toBe(false);
  });

  it("WEEKLY_RECAP with performanceGateOn=true and both required sources → COVERED", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "WEEKLY_RECAP",
      sources: [
        src("PERFORMANCE", { trustLevel: "AUTHORITATIVE" }),
        src("PICK"),
      ],
      performanceGateOn: true,
    });
    expect(v.status).toBe("COVERED");
  });
});

// ============================================================
// RESPONSIBLE_GAMING regulated trust
// ============================================================

describe("evaluateContentSourceCoverage — RESPONSIBLE_GAMING regulated trust", () => {
  it("blocks when RESPONSIBLE_GAMING trust is UNVERIFIED", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "RESPONSIBLE_BETTING_EDUCATION",
      sources: [
        src("RESPONSIBLE_GAMING", { trustLevel: "UNVERIFIED" }),
        src("METHODOLOGY"),
      ],
      performanceGateOn: false,
    });
    expect(v.status).toBe("BLOCKED");
    expect(v.blockers.some((b) => b.includes("UNVERIFIED") || b.includes("RESPONSIBLE_GAMING"))).toBe(true);
  });

  it("accepts REVIEWED trust for RESPONSIBLE_GAMING", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "RESPONSIBLE_BETTING_EDUCATION",
      sources: [
        src("RESPONSIBLE_GAMING", { trustLevel: "REVIEWED" }),
        src("METHODOLOGY"),
      ],
      performanceGateOn: false,
    });
    expect(v.status).toBe("COVERED");
    expect(v.covered).toBe(true);
  });
});

// ============================================================
// CALIBRATION regulated trust + INTERNAL_ONLY note
// ============================================================

describe("evaluateContentSourceCoverage — CALIBRATION", () => {
  it("blocks when CALIBRATION trust is UNVERIFIED", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "MODEL_ACCOUNTABILITY_NOTE",
      sources: [
        src("CALIBRATION", { trustLevel: "UNVERIFIED" }),
        src("METHODOLOGY"),
      ],
      performanceGateOn: false,
    });
    expect(v.status).toBe("BLOCKED");
    expect(v.covered).toBe(false);
  });

  it("adds INTERNAL_ONLY note but still reaches COVERED when trust is ok", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "MODEL_ACCOUNTABILITY_NOTE",
      sources: [
        src("CALIBRATION", { trustLevel: "PLATFORM" }),
        src("METHODOLOGY"),
      ],
      performanceGateOn: false,
    });
    expect(v.status).toBe("COVERED");
    expect(v.notes.some((n) => n.includes("INTERNAL_ONLY"))).toBe(true);
  });
});

// ============================================================
// covered flag consistency
// ============================================================

describe("evaluateContentSourceCoverage — covered flag", () => {
  it("covered is false when status is NEEDS_SOURCE", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "BLOG_POST",
      sources: [],
      performanceGateOn: false,
    });
    expect(v.status).toBe("NEEDS_SOURCE");
    expect(v.covered).toBe(false);
  });

  it("covered is false when status is PARTIAL", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "MATCHUP_PREVIEW",
      sources: [src("ODDS")],
      performanceGateOn: false,
    });
    expect(v.status).toBe("PARTIAL");
    expect(v.covered).toBe(false);
  });

  it("covered is false when status is BLOCKED", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "METHODOLOGY_EDUCATION",
      sources: [src("METHODOLOGY", { sourceStatus: "STALE" })],
      performanceGateOn: false,
    });
    expect(v.status).toBe("BLOCKED");
    expect(v.covered).toBe(false);
  });

  it("covered is true only when status is COVERED", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "BLOG_POST",
      sources: [src("METHODOLOGY")],
      performanceGateOn: false,
    });
    expect(v.status).toBe("COVERED");
    expect(v.covered).toBe(true);
  });
});
