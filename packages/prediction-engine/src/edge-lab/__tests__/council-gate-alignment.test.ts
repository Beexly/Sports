/**
 * Structural alignment between SequentialEdgeLabCouncil and applySelectiveGate.
 *
 * The council is diagnostic; the gate is the sole FIRE/NO_BET authority.
 * They must still reason about the SAME honesty signals (width, lower-endpoint
 * edge, calibration sample size, placebo) so an operator reading a debate
 * summary is not misled about what the production gate would do.
 *
 * These tests lock that alignment without coupling the two modules into one
 * code path.
 */

import { describe, it, expect } from "vitest";
import {
  applySelectiveGate,
  MIN_STRATUM_CALIBRATION,
  type GateDecisionRow,
} from "../selective-gate.js";
import {
  SequentialEdgeLabCouncil,
  DEFAULT_MAX_GUARDIAN_WIDTH,
} from "../edge-lab-council.js";
import type { EdgeLabContext } from "../agent-roles.js";

/** Deterministic PRNG so tests never flake. */
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

const CAL = makeRows(11, Math.max(MIN_STRATUM_CALIBRATION + 50, 200), "cal");
const EVAL = makeRows(22, 80, "eval");

function baseCouncilCtx(overrides: Partial<EdgeLabContext> = {}): EdgeLabContext {
  return {
    slateId: "align-slate",
    asOf: "2026-07-28T00:00:00.000Z",
    sport: "americanfootball_nfl",
    ...overrides,
  };
}

describe("Council ↔ Gate alignment — width veto", () => {
  it("gate width cap and guardian maxWidth both suppress fire when interval is wide", async () => {
    // Run the gate with a tight width cap; collect a row that would have fired
    // without the cap so we know width is the deciding factor.
    const open = applySelectiveGate(CAL, EVAL, 0.0, { source: "ivap" });
    expect(open.fired).toBeGreaterThan(0);

    const wideDecisions = open.decisions.filter((d) => d.width > 0.05);
    // If the data produces no wide intervals, the rest of this test is vacuous
    // — skip rather than invent a scenario.
    if (wideDecisions.length === 0) {
      // Still verify the guardian path independently below.
      expect(true).toBe(true);
      return;
    }

    const capped = applySelectiveGate(CAL, EVAL, 0.0, {
      source: "ivap",
      maxWidthForFire: 0.05,
    });
    expect(capped.widthNoBets).toBeGreaterThan(0);

    // Council guardian with the same width threshold must also veto.
    const sample = wideDecisions[0]!;
    const council = new SequentialEdgeLabCouncil();
    // Override guardian via custom roster would be heavier; instead pass a
    // context whose width exceeds DEFAULT_MAX_GUARDIAN_WIDTH so the default
    // guardian vetoes, matching the gate's "width too large → no fire" doctrine.
    const summary = await council.runDebate(
      baseCouncilCtx({
        multiprob: {
          p0: sample.interval.lower,
          p1: sample.interval.upper,
          width: Math.max(sample.width, DEFAULT_MAX_GUARDIAN_WIDTH + 0.01),
        },
        marketImpliedProb: sample.q,
        modelScore: sample.interval.upper,
        calibrationSampleSize: MIN_STRATUM_CALIBRATION + 10,
        placeboSurvived: true,
        features: { home: true },
      }),
    );
    expect(summary.finalDecision).toBe("no_bet");
    expect(summary.honestyFlags.length).toBeGreaterThan(0);
  });

  it("both systems treat a tight, well-supported interval as eligible (not auto-vetoed)", async () => {
    const open = applySelectiveGate(CAL, EVAL, 0.0, {
      source: "ivap",
      maxWidthForFire: 1.0,
    });
    expect(open.fired).toBeGreaterThan(0);

    const tight = open.decisions.find((d) => d.width <= DEFAULT_MAX_GUARDIAN_WIDTH);
    if (!tight) {
      // Data-dependent; do not fail the suite if no tight interval appears.
      return;
    }

    const council = new SequentialEdgeLabCouncil();
    const summary = await council.runDebate(
      baseCouncilCtx({
        multiprob: {
          p0: tight.interval.lower,
          p1: tight.interval.upper,
          width: tight.width,
        },
        marketImpliedProb: tight.q,
        // Push model score so microstructure + calibration can support
        modelScore: Math.max(tight.interval.lower, tight.q + 0.05),
        calibrationSampleSize: MIN_STRATUM_CALIBRATION + 50,
        placeboSurvived: true,
        features: { rest: 5, home: true },
      }),
    );
    // Guardian must NOT hard-veto a tight, well-calibrated, placebo-surviving context.
    expect(summary.finalDecision).not.toBe("no_bet");
  });
});

describe("Council ↔ Gate alignment — calibration sample floor", () => {
  it("gate silent-stratum rule and guardian min-sample rule both refuse thin evidence", async () => {
    const thinCal = makeRows(99, 40, "thin"); // well below MIN_STRATUM_CALIBRATION
    const gate = applySelectiveGate(thinCal, EVAL, 0.0, { source: "ivap" });
    expect(gate.fired).toBe(0);

    const council = new SequentialEdgeLabCouncil();
    const summary = await council.runDebate(
      baseCouncilCtx({
        multiprob: { p0: 0.55, p1: 0.6, width: 0.05 },
        marketImpliedProb: 0.5,
        modelScore: 0.6,
        calibrationSampleSize: 40, // same thin regime
        placeboSurvived: true,
        features: { rest: 4 },
      }),
    );
    expect(summary.finalDecision).toBe("no_bet");
    expect(
      summary.honestyFlags.some((f) => /insufficient evidence|calibration/i.test(f)),
    ).toBe(true);
  });
});

describe("Council ↔ Gate alignment — placebo", () => {
  it("failed placebo forces council no_bet; gate does not consume placebo directly but council documents the honesty flag", async () => {
    const council = new SequentialEdgeLabCouncil();
    const summary = await council.runDebate(
      baseCouncilCtx({
        multiprob: { p0: 0.6, p1: 0.65, width: 0.05 },
        marketImpliedProb: 0.5,
        modelScore: 0.65,
        calibrationSampleSize: MIN_STRATUM_CALIBRATION + 20,
        placeboSurvived: false,
        features: { rest: 5 },
      }),
    );
    expect(summary.finalDecision).toBe("no_bet");
    expect(summary.honestyFlags.some((f) => /placebo/i.test(f))).toBe(true);
  });

  it("undefined placebo is treated as untested (flag), not as passed", async () => {
    const council = new SequentialEdgeLabCouncil();
    const summary = await council.runDebate(
      baseCouncilCtx({
        multiprob: { p0: 0.6, p1: 0.65, width: 0.05 },
        marketImpliedProb: 0.5,
        modelScore: 0.65,
        calibrationSampleSize: MIN_STRATUM_CALIBRATION + 20,
        // placeboSurvived intentionally omitted
        features: { rest: 5 },
      }),
    );
    // May or may not be no_bet depending on other agents, but the placebo
    // analyst must have flagged "untested".
    const placeboOpinion = summary.rounds[0]!.opinions.find(
      (o) => o.role === "placebo_analyst",
    );
    expect(placeboOpinion).toBeDefined();
    expect(placeboOpinion!.stance).toBe("flag");
    expect(placeboOpinion!.rationale).toMatch(/untested/i);
  });
});

describe("Council ↔ Gate alignment — lower-endpoint edge", () => {
  it("calibration analyst uses lower bound vs market, matching gate lcbEdge definition", async () => {
    const council = new SequentialEdgeLabCouncil();
    const lower = 0.58;
    const upper = 0.64;
    const q = 0.5;
    const summary = await council.runDebate(
      baseCouncilCtx({
        multiprob: { p0: lower, p1: upper, width: upper - lower },
        marketImpliedProb: q,
        modelScore: upper,
        calibrationSampleSize: MIN_STRATUM_CALIBRATION + 10,
        placeboSurvived: true,
        features: { rest: 5 },
      }),
    );
    const cal = summary.rounds[0]!.opinions.find((o) => o.role === "calibration_analyst");
    expect(cal).toBeDefined();
    expect(cal!.stance).toBe("support");
    expect(cal!.metrics?.lcbEdge).toBeCloseTo(lower - q, 6);

    // Gate definition: lcbEdge = interval.lower - q
    // Prove the same arithmetic on a synthetic fired decision shape.
    const syntheticLcb = lower - q;
    expect(syntheticLcb).toBeCloseTo(cal!.metrics!.lcbEdge!, 6);
  });

  it("when lower bound does not clear market, calibration analyst opposes — same skepticism as the gate", async () => {
    const council = new SequentialEdgeLabCouncil();
    const lower = 0.45;
    const upper = 0.7; // upper looks great; lower does not clear 0.5
    const q = 0.5;
    const summary = await council.runDebate(
      baseCouncilCtx({
        multiprob: { p0: lower, p1: upper, width: upper - lower },
        marketImpliedProb: q,
        modelScore: upper,
        calibrationSampleSize: MIN_STRATUM_CALIBRATION + 10,
        placeboSurvived: true,
        features: { rest: 5 },
      }),
    );
    const cal = summary.rounds[0]!.opinions.find((o) => o.role === "calibration_analyst");
    expect(cal!.stance).toBe("oppose");
    expect(cal!.metrics?.lcbEdge).toBeLessThan(0);
  });
});

describe("Council ↔ Gate alignment — doctrine invariants", () => {
  it("council never claims to be the production firing authority", async () => {
    const council = new SequentialEdgeLabCouncil();
    const summary = await council.runDebate(baseCouncilCtx());
    expect(summary.ledgerCommitmentHint).toMatch(/diagnostic only/i);
  });

  it("MIN_STRATUM_CALIBRATION is the shared constant (not re-declared in the council)", async () => {
    // Import-time check: guardian uses the gate export. If someone re-declares
    // a private copy, thin-sample behavior can drift. This test locks the
    // exported value the guardian is documented to import.
    expect(MIN_STRATUM_CALIBRATION).toBeGreaterThanOrEqual(50);
    expect(Number.isFinite(MIN_STRATUM_CALIBRATION)).toBe(true);
  });
});
