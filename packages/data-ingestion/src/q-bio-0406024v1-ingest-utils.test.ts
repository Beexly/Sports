/**
 * Tests for ./q-bio-0406024v1-ingest-utils (arXiv:q-bio/0406024v1, lane=mixed).
 *
 * ACCEPTANCE GATE: ADAPT bar: bottom-decile redundancy drops must associate with elevated subsequent injury incidence (OR > 1 with 95% CI excluding 1, workload-adjusted) on a hold-out season; if no signal, keep the metric as descriptive only and record the negative.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./q-bio-0406024v1-ingest-utils";

describe("q-bio-0406024v1 Projective geometry for human motion, with", () => {
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
