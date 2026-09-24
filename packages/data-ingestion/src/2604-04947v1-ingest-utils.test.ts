/**
 * Tests for ./2604-04947v1-ingest-utils (arXiv:2604.04947v1, lane=mixed).
 *
 * ACCEPTANCE GATE: ADAPT bar: hallucination gate must catch ≥90% of planted false insights (adversarial eval) without dropping >15% of true ones, and SUMMIR-ranked posts must correlate positively with engagement vs chronological posting.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2604-04947v1-ingest-utils";

describe("2604-04947v1 SUMMIR: A Hallucination-Aware Framework for Ranking", () => {
  it("coerceRecord parses numeric strings and nulls junk", () => {
    const out = mod.coerceRecord({ line: "-3.5", team: "KC", meta: { a: 1 } }, ["line"]);
    expect(out).toEqual({ line: -3.5, team: "KC", meta: null });
    const bad = mod.coerceRecord({ line: "abc" }, ["line"]);
    expect(bad.line).toBeNull();
  });
  it("fieldCoverage reports per-field presence", () => {
    const cov = mod.fieldCoverage([{ a: 1, b: null }, { a: 2, b: 3 }])!;
    expect(cov.a).toBeCloseTo(1, 10);
    expect(cov.b).toBeCloseTo(0.5, 10);
    expect(mod.fieldCoverage([])).toBeNull();
  });
  it("z-score flags the extreme value only", () => {
    expect(mod.zScoreOutlierFlags([1, 1, 1, 1, 100], 1.5)).toEqual([false, false, false, false, true]);
    expect(mod.zScoreOutlierFlags([5, 5, 5])).toEqual([false, false, false]);
    expect(mod.zScoreOutlierFlags([1])).toBeNull();
  });
});
