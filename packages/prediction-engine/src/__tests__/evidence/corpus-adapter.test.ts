import { describe, expect, it } from "vitest";
import {
  applyCorpusShrink,
  CORPUS_SHRINK_FLOOR,
  DEFAULT_FAMILY_MAP,
  toGameGrounding,
} from "../../evidence/corpus-adapter.js";
import { computeFamilyDiagnostics } from "../../evidence/family-diagnostics.js";
import type { CorpusGroundingRecord } from "../../evidence/types.js";
import { freshBundle } from "./fixtures.js";

function record(family: string, support: number): CorpusGroundingRecord {
  return { family, facet: `${family} query`, support, citations: [] };
}

describe("toGameGrounding", () => {
  it("preserves the family on every facet", () => {
    const g = toGameGrounding([record("restFatigue", 0.9), record("weather", 0.4)], "g1");
    expect(g.facets.map((f) => f.family)).toEqual(["restFatigue", "weather"]);
    expect(g.gameId).toBe("g1");
  });

  it("reports the unweighted mean support and the covered share", () => {
    const g = toGameGrounding(
      [
        { family: "restFatigue", facet: "a", support: 0.8, citations: [{ uri: "u", title: "t", score: 0.5 }] },
        { family: "weather", facet: "b", support: 0.2, citations: [] },
      ],
      null,
    );
    expect(g.overallSupport).toBeCloseTo(0.5, 6);
    expect(g.coverage).toBeCloseTo(0.5, 6);
  });

  it("handles an empty record set without dividing by zero", () => {
    const g = toGameGrounding([], null);
    expect(g.facets).toEqual([]);
    expect(g.overallSupport).toBe(0);
    expect(g.coverage).toBe(0);
  });
});

describe("applyCorpusShrink", () => {
  it("leaves everything untouched when there is no grounding", () => {
    const diags = computeFamilyDiagnostics(freshBundle());
    const res = applyCorpusShrink(diags, null);
    expect(res.groundingPresent).toBe(false);
    expect(res.adjustments).toEqual([]);
    expect(res.diagnostics).toEqual(diags);
  });

  it("shrinks a mapped family by FLOOR + (1 - FLOOR) * support", () => {
    const diags = computeFamilyDiagnostics(freshBundle());
    const rest = diags.find((d) => d.family === "rest");
    expect(rest?.deviation).toBe(-1);

    const g = toGameGrounding([record("restFatigue", 0.9)], null);
    const res = applyCorpusShrink(diags, g);
    const shrunk = res.diagnostics.find((d) => d.family === "rest");

    // 0.5 + 0.5 * 0.9 = 0.95
    expect(shrunk?.corpusSupport).toBeCloseTo(0.9, 6);
    expect(shrunk?.corpusMultiplier).toBeCloseTo(0.95, 6);
    expect(shrunk?.shrunkDeviation).toBeCloseTo(-0.95, 6);
    expect(res.appliedFamilies).toContain("rest");
  });

  it("never grows a deviation, even at full support", () => {
    const diags = computeFamilyDiagnostics(freshBundle());
    const g = toGameGrounding([record("restFatigue", 1)], null);
    const res = applyCorpusShrink(diags, g);
    const shrunk = res.diagnostics.find((d) => d.family === "rest");
    expect(shrunk?.corpusMultiplier).toBeCloseTo(1, 6);
    expect(Math.abs(shrunk?.shrunkDeviation ?? 0)).toBeLessThanOrEqual(Math.abs(-1));
  });

  it("floors at the documented minimum when support is zero", () => {
    const diags = computeFamilyDiagnostics(freshBundle());
    const g = toGameGrounding([record("restFatigue", 0)], null);
    const res = applyCorpusShrink(diags, g);
    const shrunk = res.diagnostics.find((d) => d.family === "rest");
    expect(shrunk?.corpusMultiplier).toBeCloseTo(CORPUS_SHRINK_FLOOR, 6);
    expect(shrunk?.shrunkDeviation).toBeCloseTo(-0.5, 6);
  });

  it("leaves a family with no corpus counterpart untouched", () => {
    const diags = computeFamilyDiagnostics(freshBundle());
    const g = toGameGrounding([record("restFatigue", 0.9)], null);
    const res = applyCorpusShrink(diags, g);
    const form = res.diagnostics.find((d) => d.family === "formEpa");
    expect(form?.corpusMultiplier).toBe(1);
    expect(form?.corpusSupport).toBeNull();
    expect(form?.shrunkDeviation).toBe(form?.deviation);
    expect(res.unmappedFamilies).toContain("formEpa");
  });

  it("leaves a mapped family untouched when its deviation is null", () => {
    const bundle = freshBundle();
    const diags = computeFamilyDiagnostics({ ...bundle, rest: { status: "MISSING", reason: "no rest" } });
    const g = toGameGrounding([record("restFatigue", 0.9)], null);
    const res = applyCorpusShrink(diags, g);
    const rest = res.diagnostics.find((d) => d.family === "rest");
    expect(rest?.deviation).toBeNull();
    expect(rest?.corpusMultiplier).toBe(1);
  });

  it("keeps emission weight and delta at zero after the shrink", () => {
    const diags = computeFamilyDiagnostics(freshBundle());
    const g = toGameGrounding([record("restFatigue", 0.9), record("weather", 0.3)], null);
    for (const d of applyCorpusShrink(diags, g).diagnostics) {
      expect(d.emissionWeight).toBe(0);
      expect(d.delta).toBe(0);
    }
  });

  it("maps only the two unambiguous pairs by default", () => {
    expect(Object.keys(DEFAULT_FAMILY_MAP).sort()).toEqual(["rest", "weather"]);
  });

  it("honours a caller-supplied map", () => {
    const diags = computeFamilyDiagnostics(freshBundle());
    const g = toGameGrounding([record("qbSkillScript", 0.8)], null);
    const res = applyCorpusShrink(diags, g, { coaching: "qbSkillScript" });
    const coaching = res.diagnostics.find((d) => d.family === "coaching");
    expect(coaching?.corpusMultiplier).toBeCloseTo(0.9, 6);
    expect(res.appliedFamilies).toEqual(["coaching"]);
  });

  it("ignores prototype keys in familyMap and skips non-finite deviations or support", () => {
    const base = computeFamilyDiagnostics(freshBundle());
    const malicious = [
      ...base,
      { ...base[0], family: "constructor" as unknown as typeof base[0]["family"], deviation: 2 },
      { ...base[0], family: "coaching" as const, deviation: Number.NaN },
    ];
    const g = toGameGrounding(
      [record("restFatigue", 0), record("weather", Number.NaN)],
      null,
    );
    expect(g.facets.map((f) => f.family)).toEqual(["restFatigue"]);
    const res = applyCorpusShrink(malicious, g, { ...DEFAULT_FAMILY_MAP, coaching: "qbSkillScript" });
    expect(res.unmappedFamilies).toContain("constructor");
    expect(res.unmappedFamilies).toContain("coaching");
    const rest = res.diagnostics.find((d) => d.family === "rest");
    expect(rest?.corpusMultiplier).toBeCloseTo(CORPUS_SHRINK_FLOOR, 6);
    expect(rest?.shrunkDeviation).toBeCloseTo((rest?.deviation ?? 0) * CORPUS_SHRINK_FLOOR, 6);
  });

  it("retains 'other' family facets in toGameGrounding and ignores non-finite adjustment multipliers", () => {
    const g = toGameGrounding([record("other", 0.7), record("restFatigue", 0.6)], "g-other");
    expect(g.facets.map((f) => f.family)).toEqual(["other", "restFatigue"]);

    const diags = computeFamilyDiagnostics(freshBundle());
    const corruptedGrounding = {
      ...g,
      facets: [
        {
          family: "restFatigue" as const,
          query: "nan check",
          facetWeight: 1,
          support: Number.NaN,
          evidence: [],
          chunkMode: "none" as const,
          layerErrors: [],
        },
      ],
    };
    const res = applyCorpusShrink(diags, corruptedGrounding);
    const rest = res.diagnostics.find((d) => d.family === "rest");
    expect(rest?.corpusMultiplier).toBe(1);
    expect(rest?.shrunkDeviation).toBe(rest?.deviation);
    expect(Number.isFinite(rest?.corpusSupport ?? Number.NaN)).toBe(true);
  });

  it("clamps out-of-range support values in toGameGrounding to [0, 1]", () => {
    const g = toGameGrounding([record("restFatigue", 1.5), record("weather", -0.2)], "g-clamp");
    expect(g.facets.map((f) => f.support)).toEqual([1, 0]);
    expect(g.overallSupport).toBeCloseTo(0.5, 6);

    const diags = computeFamilyDiagnostics(freshBundle());
    const res = applyCorpusShrink(diags, g);
    const rest = res.diagnostics.find((d) => d.family === "rest");
    const weather = res.diagnostics.find((d) => d.family === "weather");
    expect(rest?.corpusMultiplier).toBeCloseTo(1, 6);
    expect(Math.abs(rest?.shrunkDeviation ?? 0)).toBeLessThanOrEqual(Math.abs(rest?.deviation ?? 0));
    expect(weather?.corpusMultiplier).toBe(1);

    const gLow = toGameGrounding([record("restFatigue", -0.2)], "g-clamp-low");
    const resLow = applyCorpusShrink(diags, gLow);
    const restLow = resLow.diagnostics.find((d) => d.family === "rest");
    expect(restLow?.corpusMultiplier).toBeCloseTo(CORPUS_SHRINK_FLOOR, 6);
  });
});
