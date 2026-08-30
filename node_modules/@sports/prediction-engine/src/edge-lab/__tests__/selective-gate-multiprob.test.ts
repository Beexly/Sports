import { describe, expect, it } from "vitest";
import {
  applySelectiveGate,
  type GateDecisionRow,
  type MultiprobGateOptions,
} from "../selective-gate.js";

/**
 * The additive multiprobability adapter on the selective gate.
 *
 * The load-bearing claim under test is that the honesty story is now visible
 * in the DECISION path, not just in research modules: every fired decision
 * carries the width of its calibrated interval, and an interval too wide to
 * trust is a first-class No-Bet even when the edge looks good.
 *
 * The other load-bearing claim is that none of this changed the default. The
 * first block pins that explicitly — bit-for-bit identical decisions with and
 * without an empty options object.
 */

/** Deterministic pseudo-random so these tests never flake. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Rows whose score genuinely predicts the outcome, so the gate has real signal
 * to fire on rather than firing by construction.
 */
function makeRows(seed: number, n: number, prefix: string): GateDecisionRow[] {
  const rand = mulberry32(seed);
  const rows: GateDecisionRow[] = [];
  for (let i = 0; i < n; i++) {
    const score = rand();
    const y: 0 | 1 = rand() < score ? 1 : 0;
    rows.push({
      rowId: `${prefix}-${i}`,
      stratum: "s1",
      score,
      q: 0.5,
      y,
    });
  }
  return rows;
}

const CAL = makeRows(1, 400, "cal");
const EVAL = makeRows(2, 200, "eval");

describe("selective gate — default path is unchanged", () => {
  it("omitting options and passing an empty object produce identical decisions", () => {
    const implicit = applySelectiveGate(CAL, EVAL, 0.0);
    const explicit = applySelectiveGate(CAL, EVAL, 0.0, {});

    expect(explicit.fired).toBe(implicit.fired);
    expect(explicit.decisions.map((d) => d.rowId)).toEqual(
      implicit.decisions.map((d) => d.rowId),
    );
    expect(explicit.decisions.map((d) => d.lcbEdge)).toEqual(
      implicit.decisions.map((d) => d.lcbEdge),
    );
  });

  it("defaults to legacy-isotonic and reports that source", () => {
    const report = applySelectiveGate(CAL, EVAL, 0.0);
    expect(report.multiprobSource).toBe("legacy-isotonic");
    for (const d of report.decisions) {
      expect(d.multiprobSource).toBe("legacy-isotonic");
    }
  });

  it("fires nothing extra: widthNoBets is 0 when no width cap is set", () => {
    const report = applySelectiveGate(CAL, EVAL, 0.0);
    expect(report.widthNoBets).toBe(0);
  });
});

describe("selective gate — every fired decision carries its interval width", () => {
  const sources: MultiprobGateOptions["source"][] = ["legacy-isotonic", "ivap", "cvap"];

  for (const source of sources) {
    it(`source "${source}": width is finite, non-negative, and equals upper - lower`, () => {
      const report = applySelectiveGate(CAL, EVAL, 0.0, { source });
      expect(report.multiprobSource).toBe(source);
      // The gate must actually fire here, otherwise the assertions below are vacuous.
      expect(report.fired).toBeGreaterThan(0);

      for (const d of report.decisions) {
        expect(Number.isFinite(d.width)).toBe(true);
        expect(d.width).toBeGreaterThanOrEqual(0);
        expect(d.width).toBeCloseTo(d.interval.upper - d.interval.lower, 12);
        // The multiprobability invariant the whole honesty claim rests on.
        expect(d.interval.lower).toBeLessThanOrEqual(d.interval.upper);
      }
    });
  }
});

describe("selective gate — width is a first-class No-Bet", () => {
  it("a width cap of 0 suppresses every fire that a positive cap would allow", () => {
    const open = applySelectiveGate(CAL, EVAL, 0.0, { source: "ivap" });
    const capped = applySelectiveGate(CAL, EVAL, 0.0, {
      source: "ivap",
      maxWidthForFire: 0,
    });

    expect(open.fired).toBeGreaterThan(0);
    // Any decision with width > 0 must now be vetoed.
    const openWide = open.decisions.filter((d) => d.width > 0).length;
    expect(openWide).toBeGreaterThan(0);
    expect(capped.fired).toBe(open.fired - openWide);
    expect(capped.widthNoBets).toBe(openWide);
  });

  it("a generous cap vetoes nothing and matches the uncapped run exactly", () => {
    const open = applySelectiveGate(CAL, EVAL, 0.0, { source: "ivap" });
    const capped = applySelectiveGate(CAL, EVAL, 0.0, {
      source: "ivap",
      maxWidthForFire: 1.0, // wider than any possible probability interval
    });

    expect(capped.fired).toBe(open.fired);
    expect(capped.widthNoBets).toBe(0);
    expect(capped.decisions.map((d) => d.rowId)).toEqual(open.decisions.map((d) => d.rowId));
  });

  it("widthNoBets counts ONLY rows that would otherwise have fired, never all wide rows", () => {
    // A tau so high that nothing clears it. If the width veto were evaluated
    // before the tau test, wide-but-never-firing rows would still be counted
    // and this would be non-zero — the exact ordering bug this guards.
    const report = applySelectiveGate(CAL, EVAL, 0.99, {
      source: "ivap",
      maxWidthForFire: 0,
    });

    expect(report.fired).toBe(0);
    expect(report.widthNoBets).toBe(0);
  });
});

describe("selective gate — taxonomy category reaches the decision", () => {
  it("attaches a Mondrian category to every fired decision when context is supplied", () => {
    const report = applySelectiveGate(CAL, EVAL, 0.0, {
      taxonomyCtx: { isHome: true, isFavorite: true, restDays: 7, isPrimetime: true },
    });

    expect(report.fired).toBeGreaterThan(0);
    for (const d of report.decisions) {
      expect(typeof d.taxonomyCategory).toBe("string");
      expect((d.taxonomyCategory ?? "").length).toBeGreaterThan(0);
    }
  });

  it("leaves the category undefined when no context is supplied — never invents one", () => {
    const report = applySelectiveGate(CAL, EVAL, 0.0);
    for (const d of report.decisions) {
      expect(d.taxonomyCategory).toBeUndefined();
    }
  });

  it("is deterministic: the same context yields the same category across runs", () => {
    const ctx = { isHome: false, isFavorite: true, restDays: 2 };
    const a = applySelectiveGate(CAL, EVAL, 0.0, { taxonomyCtx: ctx });
    const b = applySelectiveGate(CAL, EVAL, 0.0, { taxonomyCtx: ctx });
    expect(a.decisions[0]?.taxonomyCategory).toBe(b.decisions[0]?.taxonomyCategory);
  });
});

describe("selective gate — existing invariants still hold under the adapter", () => {
  it("the silent-stratum rule still applies with an alternate source", () => {
    // Below MIN_STRATUM_CALIBRATION: must fire nothing regardless of source.
    const thin = makeRows(9, 40, "thin");
    const report = applySelectiveGate(thin, EVAL, 0.0, { source: "cvap" });
    expect(report.fired).toBe(0);
  });

  it("edge attribution still uses q, so lcbEdge equals interval.lower - q", () => {
    const report = applySelectiveGate(CAL, EVAL, 0.0, { source: "ivap" });
    expect(report.fired).toBeGreaterThan(0);
    for (const d of report.decisions) {
      expect(d.lcbEdge).toBeCloseTo(d.interval.lower - d.q, 12);
    }
  });
});
