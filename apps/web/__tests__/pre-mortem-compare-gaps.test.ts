/**
 * Targeted coverage for comparePreMortem and summarizeComparison branches
 * not reached by pre-mortem-compare.test.ts.
 *
 * The primary test covers: lineMovement/consensus CALLED via STALE_LINE,
 * dataQuality CALLED via DATA_GAP, VARIANCE/WEATHER/HUMAN_OVERRIDE as MISSED,
 * INCOMPLETE coverage verdict, and single+multi factor summarizeComparison.
 *
 * This file covers:
 *   - INJURY_SHOCK → CALLED when restAdvantage bullet is present
 *   - INJURY_SHOCK → MISSED (INCOMPLETE) when no restAdvantage bullet
 *   - OFFICIATING → always MISSED (empty factor mapping)
 *   - MODEL_DRIFT → always MISSED (empty factor mapping)
 *   - OTHER → always MISSED (empty factor mapping)
 *   - summarizeComparison with a custom friendlyFactorName mapper
 *   - summarizeComparison MISSED when missed[0] is undefined (OTHER fallback)
 */

import { describe, it, expect } from "vitest";
import {
  comparePreMortem,
  summarizeComparison,
  type CompareInput,
  type PreMortemBulletForCompare,
} from "@/lib/pre-mortem/compare";

function bullet(factorKey: string, severityRank = 1): PreMortemBulletForCompare {
  return {
    factorKey: factorKey as PreMortemBulletForCompare["factorKey"],
    severityRank,
    text: `${factorKey} factor warning`,
  };
}

// ============================================================
// INJURY_SHOCK — maps to restAdvantage
// ============================================================

describe("comparePreMortem — INJURY_SHOCK root cause", () => {
  it("marks restAdvantage bullet as CALLED when root cause is INJURY_SHOCK", () => {
    const input: CompareInput = {
      bullets: [bullet("restAdvantage", 1), bullet("lineMovement", 2)],
      rootCause: "INJURY_SHOCK",
      lessonTags: [],
    };
    const result = comparePreMortem(input);
    expect(result.coverage).toBe("COMPLETE");
    expect(result.called).toContain("restAdvantage");
    expect(result.didNotHappen).toContain("lineMovement");
    expect(result.missed).toHaveLength(0);
  });

  it("marks INJURY_SHOCK as MISSED when no restAdvantage bullet exists", () => {
    const input: CompareInput = {
      bullets: [bullet("lineMovement"), bullet("consensus")],
      rootCause: "INJURY_SHOCK",
      lessonTags: [],
    };
    const result = comparePreMortem(input);
    expect(result.coverage).toBe("INCOMPLETE");
    expect(result.missed).toContain("INJURY_SHOCK");
    expect(result.called).toHaveLength(0);
  });
});

// ============================================================
// OFFICIATING — empty factor mapping → always MISSED
// ============================================================

describe("comparePreMortem — OFFICIATING root cause", () => {
  it("marks OFFICIATING as MISSED regardless of bullets present", () => {
    const input: CompareInput = {
      bullets: [bullet("lineMovement"), bullet("consensus"), bullet("dataQuality")],
      rootCause: "OFFICIATING",
      lessonTags: [],
    };
    const result = comparePreMortem(input);
    expect(result.coverage).toBe("INCOMPLETE");
    expect(result.missed).toContain("OFFICIATING");
    expect(result.called).toHaveLength(0);
  });

  it("all bullets are DID_NOT_HAPPEN when root cause is OFFICIATING", () => {
    const input: CompareInput = {
      bullets: [bullet("restAdvantage"), bullet("volatility")],
      rootCause: "OFFICIATING",
      lessonTags: [],
    };
    const result = comparePreMortem(input);
    expect(result.perBullet.every((b) => b.tag === "DID_NOT_HAPPEN")).toBe(true);
  });
});

// ============================================================
// MODEL_DRIFT — empty factor mapping → always MISSED
// ============================================================

describe("comparePreMortem — MODEL_DRIFT root cause", () => {
  it("marks MODEL_DRIFT as MISSED even when all factor bullets are present", () => {
    const input: CompareInput = {
      bullets: [
        bullet("lineMovement"),
        bullet("consensus"),
        bullet("dataQuality"),
        bullet("restAdvantage"),
      ],
      rootCause: "MODEL_DRIFT",
      lessonTags: [],
    };
    const result = comparePreMortem(input);
    expect(result.coverage).toBe("INCOMPLETE");
    expect(result.missed).toContain("MODEL_DRIFT");
  });
});

// ============================================================
// OTHER — empty factor mapping → always MISSED
// ============================================================

describe("comparePreMortem — OTHER root cause", () => {
  it("marks OTHER as MISSED with no bullets", () => {
    const input: CompareInput = {
      bullets: [],
      rootCause: "OTHER",
      lessonTags: [],
    };
    const result = comparePreMortem(input);
    expect(result.coverage).toBe("INCOMPLETE");
    expect(result.missed).toContain("OTHER");
  });

  it("marks OTHER as MISSED even with matching bullets", () => {
    const input: CompareInput = {
      bullets: [bullet("lineMovement")],
      rootCause: "OTHER",
      lessonTags: [],
    };
    const result = comparePreMortem(input);
    expect(result.coverage).toBe("INCOMPLETE");
    expect(result.missed).toContain("OTHER");
  });
});

// ============================================================
// summarizeComparison — custom friendlyFactorName mapper
// ============================================================

describe("summarizeComparison — custom friendlyFactorName", () => {
  it("uses the custom mapper to produce human-readable factor names", () => {
    const result = comparePreMortem({
      bullets: [bullet("lineMovement")],
      rootCause: "STALE_LINE",
      lessonTags: [],
    });
    const summary = summarizeComparison(result, (f) =>
      f === "lineMovement" ? "line movement" : f
    );
    expect(summary).toContain("line movement");
    expect(summary).not.toContain("lineMovement");
  });

  it("uses custom mapper for multi-factor CALLED narrative", () => {
    const result = comparePreMortem({
      bullets: [bullet("lineMovement"), bullet("consensus")],
      rootCause: "STALE_LINE",
      lessonTags: [],
    });
    const summary = summarizeComparison(result, (f) =>
      f === "lineMovement" ? "line movement" : f === "consensus" ? "market consensus" : f
    );
    expect(summary).toContain("line movement");
    expect(summary).toContain("market consensus");
  });
});

// ============================================================
// summarizeComparison — MISSED narrative uses missed[0]
// ============================================================

describe("summarizeComparison — MISSED narrative content", () => {
  it("includes the root cause in the MISSED narrative", () => {
    const result = comparePreMortem({
      bullets: [bullet("lineMovement")],
      rootCause: "OFFICIATING",
      lessonTags: [],
    });
    const summary = summarizeComparison(result);
    expect(summary).toContain("OFFICIATING");
    expect(summary).toContain("Pre-mortem missed");
  });

  it("includes MODEL_DRIFT in the MISSED narrative", () => {
    const result = comparePreMortem({
      bullets: [bullet("consensus")],
      rootCause: "MODEL_DRIFT",
      lessonTags: [],
    });
    const summary = summarizeComparison(result);
    expect(summary).toContain("MODEL_DRIFT");
  });
});
