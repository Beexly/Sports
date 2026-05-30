/**
 * Targeted coverage for computeQualityScore branches not reached by
 * source-intelligence.test.ts.
 *
 * The primary test only tests FRESH vs STALE comparison via
 * summarizeCategories. The internal categoryScore function is never
 * hit directly for CONTRADICTORY, AGING, or the null-bestEvidenceId
 * early-return path, and computeQualityScore with an empty array
 * is never tested.
 *
 * This file covers:
 *   - computeQualityScore([]) → 0 (early return for empty array)
 *   - categoryScore FRESH path: base=100
 *   - categoryScore AGING path: base=60
 *   - categoryScore STALE path: base=20
 *   - categoryScore CONTRADICTORY path: base=10
 *   - categoryScore MISSING path: base=0
 *   - categoryScore bestEvidenceId=null → early return 0 (even for FRESH)
 *   - categoryScore trust clamped to [0, 100]
 *   - computeQualityScore averages multiple categories correctly
 */

import { describe, it, expect } from "vitest";
import {
  computeQualityScore,
  summarizeCategories,
  FRESHNESS_BUDGETS,
  type CategoryStatus,
  type SourceEvidence,
} from "@/lib/source-intelligence";

const NOW = new Date("2026-05-22T18:00:00.000Z");

function ev(
  cat: SourceEvidence["category"],
  ageMs: number,
  opts: Partial<SourceEvidence> = {}
): SourceEvidence {
  return {
    category: cat,
    sourceId: `${cat}-${ageMs}`,
    fetchedAt: new Date(NOW.getTime() - ageMs),
    trustScore: 90,
    ...opts,
  };
}

// Build a minimal CategoryStatus for direct testing
function catStatus(
  status: CategoryStatus["status"],
  bestEvidenceId: string | null,
  bestTrustScore: number
): CategoryStatus {
  return {
    category: "ODDS",
    status,
    bestEvidenceId,
    bestTrustScore,
    ageMs: status === "MISSING" ? null : 60_000,
  };
}

// ============================================================
// computeQualityScore — empty array
// ============================================================

describe("computeQualityScore — empty categories", () => {
  it("returns 0 for an empty array", () => {
    expect(computeQualityScore([])).toBe(0);
  });
});

// ============================================================
// categoryScore — all status branches via computeQualityScore
// ============================================================

describe("computeQualityScore — FRESH status branch", () => {
  it("FRESH with high trust produces a high quality score", () => {
    // base=100, trust=90 → Math.round(70 + 27) = 97
    const cats: readonly CategoryStatus[] = [catStatus("FRESH", "ev-1", 90)];
    expect(computeQualityScore(cats)).toBe(97);
  });

  it("FRESH with perfect trust produces max score (100)", () => {
    // base=100, trust=100 → Math.round(70 + 30) = 100
    const cats: readonly CategoryStatus[] = [catStatus("FRESH", "ev-1", 100)];
    expect(computeQualityScore(cats)).toBe(100);
  });
});

describe("computeQualityScore — AGING status branch", () => {
  it("AGING with high trust produces a mid-range score", () => {
    // base=60, trust=90 → Math.round(42 + 27) = 69
    const cats: readonly CategoryStatus[] = [catStatus("AGING", "ev-1", 90)];
    expect(computeQualityScore(cats)).toBe(69);
  });

  it("AGING score is below FRESH score at same trust level", () => {
    const fresh: readonly CategoryStatus[] = [catStatus("FRESH", "ev-1", 80)];
    const aging: readonly CategoryStatus[] = [catStatus("AGING", "ev-1", 80)];
    expect(computeQualityScore(fresh)).toBeGreaterThan(computeQualityScore(aging));
  });
});

describe("computeQualityScore — STALE status branch", () => {
  it("STALE with high trust produces a low-mid score", () => {
    // base=20, trust=90 → Math.round(14 + 27) = 41
    const cats: readonly CategoryStatus[] = [catStatus("STALE", "ev-1", 90)];
    expect(computeQualityScore(cats)).toBe(41);
  });

  it("STALE score is below AGING score at same trust level", () => {
    const aging: readonly CategoryStatus[] = [catStatus("AGING", "ev-1", 80)];
    const stale: readonly CategoryStatus[] = [catStatus("STALE", "ev-1", 80)];
    expect(computeQualityScore(aging)).toBeGreaterThan(computeQualityScore(stale));
  });
});

describe("computeQualityScore — CONTRADICTORY status branch", () => {
  it("CONTRADICTORY produces the second-lowest quality score (base=10)", () => {
    // base=10, trust=90 → Math.round(7 + 27) = 34
    const cats: readonly CategoryStatus[] = [catStatus("CONTRADICTORY", "ev-1", 90)];
    expect(computeQualityScore(cats)).toBe(34);
  });

  it("CONTRADICTORY score is below STALE at same trust level", () => {
    const stale: readonly CategoryStatus[] = [catStatus("STALE", "ev-1", 80)];
    const contradictory: readonly CategoryStatus[] = [catStatus("CONTRADICTORY", "ev-1", 80)];
    expect(computeQualityScore(stale)).toBeGreaterThan(computeQualityScore(contradictory));
  });
});

describe("computeQualityScore — MISSING status branch", () => {
  it("MISSING returns 0 (base=0, short-circuited by null evidence id)", () => {
    // MISSING typically has null bestEvidenceId — early return → 0
    const cats: readonly CategoryStatus[] = [catStatus("MISSING", null, 90)];
    expect(computeQualityScore(cats)).toBe(0);
  });
});

// ============================================================
// categoryScore — bestEvidenceId = null early return (any status)
// ============================================================

describe("computeQualityScore — bestEvidenceId null early return", () => {
  it("returns 0 even for FRESH when bestEvidenceId is null", () => {
    const cats: readonly CategoryStatus[] = [catStatus("FRESH", null, 90)];
    expect(computeQualityScore(cats)).toBe(0);
  });

  it("returns 0 even for AGING when bestEvidenceId is null", () => {
    const cats: readonly CategoryStatus[] = [catStatus("AGING", null, 80)];
    expect(computeQualityScore(cats)).toBe(0);
  });
});

// ============================================================
// categoryScore — trust clamping to [0, 100]
// ============================================================

describe("computeQualityScore — trust score clamping", () => {
  it("clamps trust > 100 to 100 (no extra points for out-of-range trust)", () => {
    const clamped: readonly CategoryStatus[] = [catStatus("FRESH", "ev-1", 200)];
    const normal: readonly CategoryStatus[] = [catStatus("FRESH", "ev-1", 100)];
    expect(computeQualityScore(clamped)).toBe(computeQualityScore(normal));
  });

  it("clamps trust < 0 to 0 (negative trust becomes 0)", () => {
    // base=100, trust=0 → Math.round(70 + 0) = 70
    const cats: readonly CategoryStatus[] = [catStatus("FRESH", "ev-1", -50)];
    expect(computeQualityScore(cats)).toBe(70);
  });
});

// ============================================================
// computeQualityScore — averaging multiple categories
// ============================================================

describe("computeQualityScore — multiple category averaging", () => {
  it("averages two categories (FRESH + CONTRADICTORY)", () => {
    // FRESH trust=100 → 100, CONTRADICTORY trust=90 → 34, avg=Math.round(134/2)=67
    const cats: readonly CategoryStatus[] = [
      catStatus("FRESH", "ev-a", 100),
      catStatus("CONTRADICTORY", "ev-b", 90),
    ];
    expect(computeQualityScore(cats)).toBe(67);
  });

  it("averages three categories", () => {
    // FRESH/100 → 100, AGING/90 → 69, STALE/90 → 41, avg=Math.round(210/3)=70
    const cats: readonly CategoryStatus[] = [
      catStatus("FRESH", "ev-a", 100),
      catStatus("AGING", "ev-b", 90),
      catStatus("STALE", "ev-c", 90),
    ];
    expect(computeQualityScore(cats)).toBe(70);
  });
});

// ============================================================
// Integration: computeQualityScore via real summarizeCategories
// (CONTRADICTORY freshness path — via real evidence contradictions)
// ============================================================

describe("computeQualityScore — integration via summarizeCategories CONTRADICTORY", () => {
  it("returns a score below FRESH for a category with contradicting evidence", () => {
    const oddsA = ev("ODDS", 5 * 60_000, { sourceId: "odds-a" });
    const oddsB = ev("ODDS", 6 * 60_000, {
      sourceId: "odds-b",
      contradicts: ["odds-a"],
    });
    const contradictoryCats = summarizeCategories(
      "PICK",
      [oddsA, oddsB, ev("TEAM_SCHEDULE", 60_000), ev("MODEL_SNAPSHOT", 60_000)],
      NOW
    );
    const freshCats = summarizeCategories(
      "PICK",
      [ev("ODDS", 60_000), ev("TEAM_SCHEDULE", 60_000), ev("MODEL_SNAPSHOT", 60_000)],
      NOW
    );
    expect(computeQualityScore(contradictoryCats)).toBeLessThan(
      computeQualityScore(freshCats)
    );
  });
});
