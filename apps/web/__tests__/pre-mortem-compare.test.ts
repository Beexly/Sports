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

describe("comparePreMortem", () => {
  describe("CALLED — root cause maps to a bullet's factor", () => {
    it("marks lineMovement bullet as CALLED when root cause is STALE_LINE", () => {
      const input: CompareInput = {
        bullets: [bullet("lineMovement", 1), bullet("restAdvantage", 2)],
        rootCause: "STALE_LINE",
        lessonTags: [],
      };
      const result = comparePreMortem(input);

      expect(result.coverage).toBe("COMPLETE");
      expect(result.called).toContain("lineMovement");
      expect(result.didNotHappen).toContain("restAdvantage");
      expect(result.missed).toHaveLength(0);
    });

    it("marks dataQuality bullet as CALLED when root cause is DATA_GAP", () => {
      const input: CompareInput = {
        bullets: [bullet("dataQuality"), bullet("lineMovement")],
        rootCause: "DATA_GAP",
        lessonTags: [],
      };
      const result = comparePreMortem(input);

      expect(result.coverage).toBe("COMPLETE");
      expect(result.called).toContain("dataQuality");
    });

    it("marks consensus bullet as CALLED when root cause is STALE_LINE", () => {
      const input: CompareInput = {
        bullets: [bullet("consensus")],
        rootCause: "STALE_LINE",
        lessonTags: [],
      };
      const result = comparePreMortem(input);

      expect(result.coverage).toBe("COMPLETE");
      expect(result.called).toContain("consensus");
    });
  });

  describe("MISSED — root cause maps to no bullet", () => {
    it("marks VARIANCE as MISSED when no bullet covers it", () => {
      const input: CompareInput = {
        bullets: [bullet("lineMovement"), bullet("restAdvantage")],
        rootCause: "VARIANCE",
        lessonTags: [],
      };
      const result = comparePreMortem(input);

      expect(result.coverage).toBe("INCOMPLETE");
      expect(result.missed).toContain("VARIANCE");
      expect(result.called).toHaveLength(0);
      expect(result.didNotHappen).toHaveLength(2);
    });

    it("marks WEATHER as MISSED (no factor template for weather)", () => {
      const input: CompareInput = {
        bullets: [bullet("lineMovement")],
        rootCause: "WEATHER",
        lessonTags: [],
      };
      const result = comparePreMortem(input);

      expect(result.coverage).toBe("INCOMPLETE");
      expect(result.missed).toContain("WEATHER");
    });

    it("marks HUMAN_OVERRIDE as MISSED", () => {
      const input: CompareInput = {
        bullets: [bullet("dataQuality"), bullet("lineMovement")],
        rootCause: "HUMAN_OVERRIDE",
        lessonTags: [],
      };
      const result = comparePreMortem(input);

      expect(result.coverage).toBe("INCOMPLETE");
      expect(result.missed).toContain("HUMAN_OVERRIDE");
    });
  });

  describe("perBullet shape", () => {
    it("preserves factorKey and severityRank on each bullet", () => {
      const input: CompareInput = {
        bullets: [bullet("lineMovement", 3), bullet("dataQuality", 1)],
        rootCause: "DATA_GAP",
        lessonTags: [],
      };
      const result = comparePreMortem(input);

      const dq = result.perBullet.find((b) => b.factorKey === "dataQuality");
      expect(dq?.severityRank).toBe(1);
      expect(dq?.tag).toBe("CALLED");

      const lm = result.perBullet.find((b) => b.factorKey === "lineMovement");
      expect(lm?.severityRank).toBe(3);
      expect(lm?.tag).toBe("DID_NOT_HAPPEN");
    });
  });

  describe("empty bullets list", () => {
    it("returns INCOMPLETE with missed when no bullets exist", () => {
      const input: CompareInput = {
        bullets: [],
        rootCause: "DATA_GAP",
        lessonTags: [],
      };
      const result = comparePreMortem(input);

      expect(result.coverage).toBe("INCOMPLETE");
      expect(result.called).toHaveLength(0);
      expect(result.missed).toContain("DATA_GAP");
    });
  });
});

describe("summarizeComparison", () => {
  it("produces a CALLED narrative for a single matched factor", () => {
    const result = comparePreMortem({
      bullets: [bullet("lineMovement")],
      rootCause: "STALE_LINE",
      lessonTags: [],
    });
    const summary = summarizeComparison(result);
    expect(summary).toMatch(/Pre-mortem called it/);
    expect(summary).toMatch(/lineMovement/);
  });

  it("produces a multi-factor CALLED narrative", () => {
    const result = comparePreMortem({
      bullets: [bullet("lineMovement"), bullet("consensus")],
      rootCause: "STALE_LINE",
      lessonTags: [],
    });
    const summary = summarizeComparison(result);
    expect(summary).toMatch(/lineMovement.*consensus|consensus.*lineMovement/);
  });

  it("produces a MISSED narrative when coverage is INCOMPLETE", () => {
    const result = comparePreMortem({
      bullets: [bullet("lineMovement")],
      rootCause: "VARIANCE",
      lessonTags: [],
    });
    const summary = summarizeComparison(result);
    expect(summary).toMatch(/Pre-mortem missed/);
    expect(summary).toMatch(/VARIANCE/);
  });

  it("uses custom friendlyFactorName when provided", () => {
    const result = comparePreMortem({
      bullets: [bullet("lineMovement")],
      rootCause: "STALE_LINE",
      lessonTags: [],
    });
    const summary = summarizeComparison(result, () => "Line Movement");
    expect(summary).toContain("Line Movement");
    expect(summary).not.toContain("lineMovement");
  });
});
