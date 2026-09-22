/**
 * NED structural selection — tests (arXiv 2206.10540).
 *
 * ACCEPTANCE GATE: identical trees have NED 0; structurally similar
 * equations have lower NED than dissimilar ones; the selection rule
 * prefers the low-NED equation among near-best Brier candidates but
 * never reaches outside the 1% band; the dummy audit flags injected
 * variables; degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  b,
  c,
  dummyAudit,
  ned,
  selectByNed,
  treeEditDistance,
  treeSize,
  u,
  v,
  type Candidate,
} from "./ned-selection";

// Reference form: logistic in EPA margin.
const REFERENCE = u("logistic", b("*", c(0.15), v("epa_margin")));

describe("treeSize + treeEditDistance + ned", () => {
  it("measures structural distance", () => {
    const t = b("+", v("x"), c(1));
    expect(treeSize(t)).toBe(3);
    expect(treeEditDistance(t, t)).toBe(0);
    expect(ned(t, t)).toBe(0);
    // Same shape, different variable: small but nonzero NED.
    const t2 = b("+", v("y"), c(1));
    const dSame = ned(t, t2);
    expect(dSame).toBeGreaterThan(0);
    expect(dSame).toBeLessThan(0.5);
    // Different shape entirely: larger NED.
    const t3 = u("sin", b("*", v("x"), b("+", v("y"), v("z"))));
    expect(ned(t, t3)).toBeGreaterThan(dSame);
    // NED is bounded in [0, 1].
    expect(ned(t, t3)).toBeLessThanOrEqual(1);
  });

  it("constants match structurally regardless of value", () => {
    expect(ned(c(1), c(2))).toBe(0);
  });
});

describe("selectByNed", () => {
  it("applies the structural Occam's razor inside the 1% band", () => {
    const candidates: Candidate[] = [
      // Best Brier but structurally alien (uses a dummy).
      { name: "alien", expr: b("+", v("dummy_1"), u("sin", v("epa_margin"))), brier: 0.2 },
      // Within 1% of best, structurally close to the reference.
      { name: "close", expr: u("logistic", b("*", c(0.2), v("epa_margin"))), brier: 0.201 },
      // Outside the 1% band even though structurally identical.
      { name: "far", expr: u("logistic", b("*", c(0.15), v("epa_margin"))), brier: 0.25 },
    ];
    const sel = selectByNed(candidates, REFERENCE);
    expect(sel.name).toBe("close");
    expect(() => selectByNed([], REFERENCE)).toThrow();
  });
});

describe("dummyAudit", () => {
  it("flags equations that use injected dummies", () => {
    const dummies = new Set(["dummy_1", "dummy_2", "dummy_3"]);
    const selected = [
      u("logistic", b("*", c(0.15), v("epa_margin"))),
      b("+", v("dummy_1"), v("epa_margin")),
      b("*", v("dummy_2"), v("dummy_3")),
      v("epa_margin"),
    ];
    const r = dummyAudit(selected, dummies);
    expect(r.flagged).toBe(2);
    expect(r.fraction).toBeCloseTo(0.5, 12);
    // Correlated dummy (noisy copy of a real feature) is still flagged.
    const r2 = dummyAudit([b("+", v("epa_margin_noisy"), v("epa_margin"))], new Set(["epa_margin_noisy"]));
    expect(r2.fraction).toBe(1);
    expect(() => dummyAudit([], dummies)).toThrow();
  });
});
