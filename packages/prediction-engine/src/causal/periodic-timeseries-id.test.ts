/**
 * periodic-timeseries-id — tests.
 *
 * WHAT IS PINNED HERE
 *  1. the Proposition 1 bound, EXACTLY: C = L * 2^(L*w) * (L*w + 1)^(2*L*w + 2);
 *  2. that the bound is NOT the project spec's "2|V_slice|" (which does not
 *     appear in Jahn, Karnik & Schulman 2025 at all);
 *  3. the window edges: lower = max(t_min(X) - C, 0), upper = t_max(Y);
 *  4. the unroll: k time steps of width w give exactly k*w nodes;
 *  5. the identification verdict, from the repo's EXISTING Shpitser-Pearl
 *     engine, for an identifiable effect and for a bow-arc that survives into
 *     the window;
 *  6. the guard: a window over the caller's budget is REFUSED, and the module
 *     never silently truncates.
 *
 * The bound is the entire point of the module, so its expected values are
 * HAND-COMPUTED in the comments below and hard-coded in the assertions. They
 * were not copied out of the implementation.
 *
 * Source of the bound: Erik Jahn, Karthik Karnik, Leonard J. Schulman,
 * "Causal Identification in Time Series Models", PMLR v275 (AISTATS 2025),
 * Proposition 1 (the explicit C) and Theorem 1 (the general statement).
 */
import { describe, expect, it } from "vitest";
import {
  computePeriodicWindow,
  DEFAULT_MAX_NODES,
  horizonBoundC,
  horizonBoundCBigInt,
  identifyPeriodicEffect,
  nodeIdOf,
  PeriodicIDError,
  PeriodicWindowBudgetError,
  reportPeriodicWindowSize,
  unrollPeriodicWindow,
  type PeriodicADMG,
  type PeriodicNodeRef,
  type PeriodicQuery,
  type PeriodicTemplateEdge,
} from "./periodic-timeseries-id";
import { formatSymbolicFactor, runShpitserPearlID } from "./do-calculus-id";
import { mulberry32 } from "./__tests__/test-prng.js";

// ---------------------------------------------------------------------------
// GRAPHS
// ---------------------------------------------------------------------------

/** A single variable per time step, caused by itself one step earlier. */
const CHAIN: PeriodicADMG = {
  width: 1,
  latency: 1,
  template: [{ kind: "directed", from: 0, to: 0, lag: 1 }],
  labels: ["v"],
};

/**
 * Two variables per time step: v0 at time t causes v1 at time t+1.
 * No latents, so the effect of v0 on v1 is identifiable.
 */
const CAUSE: PeriodicADMG = {
  width: 2,
  latency: 1,
  template: [{ kind: "directed", from: 0, to: 1, lag: 1 }],
  labels: ["u", "v"],
};

/**
 * The SAME template plus a latent common cause between v0 at time t and v1 at
 * time t+1. That makes the pair a BOW ARC: v0 -> v1 and v0 <-> v1 at the same
 * pair of time steps, which is the textbook unidentifiable effect.
 */
const BOW: PeriodicADMG = {
  width: 2,
  latency: 1,
  template: [
    { kind: "directed", from: 0, to: 1, lag: 1 },
    { kind: "bidirected", from: 0, to: 1, lag: 1 },
  ],
  labels: ["u", "v"],
};

/** Contemporaneous (lag 0) and lagged (lag 1) directed edges, no latents. */
const CONTEMPORANEOUS: PeriodicADMG = {
  width: 2,
  latency: 1,
  template: [
    { kind: "directed", from: 0, to: 1, lag: 0 },
    { kind: "directed", from: 0, to: 1, lag: 1 },
  ],
  labels: ["u", "v"],
};

function ref(timeIndex: number, withinSliceIndex = 0): PeriodicNodeRef {
  return { timeIndex, withinSliceIndex };
}

function query(x: readonly PeriodicNodeRef[], y: readonly PeriodicNodeRef[]): PeriodicQuery {
  return { x, y };
}

// ---------------------------------------------------------------------------
// 1. THE BOUND
// ---------------------------------------------------------------------------

describe("the Proposition 1 bound", () => {
  it("is C = L * 2^(L*w) * (L*w + 1)^(2*L*w + 2), exactly", () => {
    // w = 1, L = 1:  L*w = 1; 2^1 = 2; (L*w+1) = 2; 2*L*w+2 = 4; 2^4 = 16.
    //           C = 1 * 2 * 16 = 32.
    expect(horizonBoundC(1, 1)).toBe(32);

    // w = 2, L = 1:  L*w = 2; 2^2 = 4; (L*w+1) = 3; 2*L*w+2 = 6; 3^6 = 729.
    //           C = 1 * 4 * 729 = 2916.
    expect(horizonBoundC(2, 1)).toBe(2916);

    // w = 3, L = 1:  L*w = 3; 2^3 = 8; (L*w+1) = 4; 2*L*w+2 = 8; 4^8 = 65536.
    //           C = 1 * 8 * 65536 = 524288.
    expect(horizonBoundC(3, 1)).toBe(524288);

    // w = 1, L = 2:  L*w = 2; 2^(L*w) = 2^2 = 4; (L*w+1) = 3; 2*L*w+2 = 6;
    //                3^6 = 729.  C = 2 * 4 * 729 = 5832.
    expect(horizonBoundC(1, 2)).toBe(5832);
  });

  it("agrees with the exact BigInt form", () => {
    for (const [w, l] of [
      [1, 1],
      [2, 1],
      [3, 1],
      [1, 2],
      [2, 2],
    ] as const) {
      expect(horizonBoundC(w, l)).toBe(Number(horizonBoundCBigInt(w, l)));
    }
    // The BigInt form is the literal formula, written out.
    const lw = 2n * 1n; // L*w for w = 2, L = 1
    expect(horizonBoundCBigInt(2, 1)).toBe(1n * 2n ** lw * (lw + 1n) ** (2n * lw + 2n));
  });

  it("is NOT the goal spec's 2|V_slice|, which does not appear in the paper", () => {
    // The project spec says the bound is "2|V_slice|" with "latency 1". That
    // figure is NOT in Jahn, Karnik & Schulman (2025) — Theorem 1 or
    // Proposition 1 — and it is not even a conservative substitute, because
    // the paper's C is exponential in the width while 2|V_slice| = 2w is
    // linear. A bound that is too small hides the hedge that proves
    // unidentifiability, so it reports "identifiable" for an effect that is
    // not. These assertions pin the difference so the spec's figure cannot
    // creep back in.
    expect(horizonBoundC(1, 1)).not.toBe(2 * 1); // 32, not 2
    expect(horizonBoundC(2, 1)).not.toBe(2 * 2); // 2916, not 4
    expect(horizonBoundC(3, 1)).not.toBe(2 * 3); // 524288, not 6
  });

  it("grows exponentially in the width", () => {
    // L = 1: C(w, 1) = 2^w * (w+1)^(2w+2). Each extra width variable multiplies
    // the bound by more than an order of magnitude.
    const c1 = horizonBoundC(1, 1);
    const c2 = horizonBoundC(2, 1);
    const c3 = horizonBoundC(3, 1);
    expect(c2).toBeGreaterThan(c1);
    expect(c3).toBeGreaterThan(c2);
    expect(c3 / c2).toBeGreaterThan(100);
  });

  it("refuses absurd inputs", () => {
    expect(() => horizonBoundC(0, 1)).toThrow(PeriodicIDError);
    expect(() => horizonBoundC(1, 0)).toThrow(PeriodicIDError);
    expect(() => horizonBoundC(-1, 1)).toThrow(PeriodicIDError);
    expect(() => horizonBoundC(1.5, 1)).toThrow(PeriodicIDError);
    expect(() => horizonBoundC(1, Number.NaN)).toThrow(PeriodicIDError);
    expect(() => horizonBoundC(1, 1.5)).toThrow(PeriodicIDError);
    expect(() => horizonBoundCBigInt(0, 0)).toThrow(PeriodicIDError);
  });

  it("refuses a bound that is too large to be exact, rather than rounding it", () => {
    // w = 7, L = 1: C = 2^7 * 8^16 = 128 * 281,474,976,710,656 = 3.6e16, which
    // is past Number.MAX_SAFE_INTEGER. The BigInt form still answers exactly;
    // the number form refuses, because a rounded bound is a WRONG bound (too
    // small a window hides the hedge that proves unidentifiability).
    expect(horizonBoundCBigInt(7, 1)).toBe(128n * 8n ** 16n);
    expect(horizonBoundCBigInt(7, 1) > BigInt(Number.MAX_SAFE_INTEGER)).toBe(true);
    expect(() => horizonBoundC(7, 1)).toThrow(PeriodicWindowBudgetError);
    expect(() => horizonBoundC(7, 1)).toThrow(/MAX_SAFE_INTEGER/);
  });
});

// ---------------------------------------------------------------------------
// 2. THE WINDOW
// ---------------------------------------------------------------------------

describe("the window [max(t_min(X) - C, 0), t_max(Y)]", () => {
  it("is not clamped when t_min(X) is greater than C", () => {
    // C = 32 for w = 1, L = 1.  t_min(X) = 100 -> lower edge 100 - 32 = 68.
    const w = computePeriodicWindow(CHAIN, query([ref(100)], [ref(101)]));
    expect(w.bound).toBe(32);
    expect(w.tMinX).toBe(100);
    expect(w.tMaxY).toBe(101);
    expect(w.tLo).toBe(68);
    expect(w.tHi).toBe(101);
    expect(w.timeSteps).toBe(34);
    expect(w.nodeCount).toBe(34);
    expect(w.clampedAtZero).toBe(false);
  });

  it("is clamped at 0 when t_min(X) is at or below C", () => {
    // t_min(X) = 10, C = 32 -> raw lower edge -22 -> clamped to 0.
    const clamped = computePeriodicWindow(CHAIN, query([ref(10)], [ref(12)]));
    expect(clamped.tLo).toBe(0);
    expect(clamped.tHi).toBe(12);
    expect(clamped.timeSteps).toBe(13);
    expect(clamped.clampedAtZero).toBe(true);

    // t_min(X) = C exactly -> the raw lower edge is 0, so the window still
    // starts at 0 (no clamping was needed).
    const exact = computePeriodicWindow(CHAIN, query([ref(32)], [ref(34)]));
    expect(exact.tLo).toBe(0);
    expect(exact.clampedAtZero).toBe(false);

    // t_min(X) = C - 1 -> raw lower edge -1 -> clamped to 0.
    const justUnder = computePeriodicWindow(CHAIN, query([ref(31)], [ref(34)]));
    expect(justUnder.tLo).toBe(0);
    expect(justUnder.clampedAtZero).toBe(true);
  });

  it("reports its size without unrolling anything", () => {
    // The size report is what a caller uses to refuse an intractable request
    // BEFORE paying for it. It is exact, not an estimate.
    const q = query([ref(100)], [ref(101)]);
    const reported = reportPeriodicWindowSize(CHAIN, q);
    expect(reported.timeSteps).toBe(34);
    expect(reported.nodeCount).toBe(34);
    expect(reported).toEqual(computePeriodicWindow(CHAIN, q));
  });

  it("scales with the width, so the size report catches the exponential blow-up", () => {
    // w = 3, L = 1 -> C = 524288. A query far from the origin needs the whole
    // bound of history: 524290 time steps, 1,572,870 nodes.
    const wide: PeriodicADMG = {
      width: 3,
      latency: 1,
      template: [{ kind: "directed", from: 0, to: 2, lag: 1 }],
    };
    const w = reportPeriodicWindowSize(wide, query([ref(600000, 0)], [ref(600001, 2)]));
    expect(w.bound).toBe(524288);
    expect(w.tLo).toBe(600000 - 524288);
    expect(w.tHi).toBe(600001);
    expect(w.timeSteps).toBe(524290);
    expect(w.nodeCount).toBe(524290 * 3);
  });
});

// ---------------------------------------------------------------------------
// 3. UNROLLING
// ---------------------------------------------------------------------------

describe("unrolling the periodic template", () => {
  it("produces k*w nodes for k time steps of width w", () => {
    const window = computePeriodicWindow(CAUSE, query([ref(100, 0)], [ref(101, 1)]));
    const unrolled = unrollPeriodicWindow(CAUSE, window);
    expect(unrolled.nodes.length).toBe(window.timeSteps * window.width);
    expect(unrolled.admg.nodes.length).toBe(window.nodeCount);
    // The node identity is the (timeIndex, withinSliceIndex) pair.
    expect(unrolled.nodes).toContain(nodeIdOf(ref(100, 0)));
    expect(unrolled.nodes).toContain(nodeIdOf(ref(101, 1)));
    expect(unrolled.refOf.get(nodeIdOf(ref(100, 0)))).toEqual(ref(100, 0));
    expect(unrolled.idOf.get("100#0")).toBe(nodeIdOf(ref(100, 0)));
  });

  it("lays the template over every time step of the window", () => {
    const window = computePeriodicWindow(CAUSE, query([ref(100, 0)], [ref(101, 1)]));
    const unrolled = unrollPeriodicWindow(CAUSE, window);
    // One directed edge per time step of the template, for every step that
    // fits inside the window: t -> t+1 for t in [tLo, tHi - 1].
    expect(unrolled.admg.directed.length).toBe(window.timeSteps - 1);
    expect(unrolled.admg.directed[0]).toEqual([nodeIdOf(ref(window.tLo, 0)), nodeIdOf(ref(window.tLo + 1, 1))]);
    expect(unrolled.admg.bidirected).toEqual([]);
  });

  it("hands the engine a topological order", () => {
    const window = computePeriodicWindow(CONTEMPORANEOUS, query([ref(1, 0)], [ref(1, 1)]));
    const unrolled = unrollPeriodicWindow(CONTEMPORANEOUS, window);
    const rank = new Map(unrolled.admg.nodes.map((n, i) => [n, i] as const));
    for (const [u, v] of unrolled.admg.directed) {
      expect(rank.get(u)).toBeLessThan(rank.get(v) as number);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. THE IDENTIFICATION QUERY
// ---------------------------------------------------------------------------

describe("the identification query", () => {
  it("reports an identifiable effect as identifiable", () => {
    const result = identifyPeriodicEffect(CAUSE, query([ref(100, 0)], [ref(101, 1)]));
    expect(result.identifiable).toBe(true);
    expect(result.formulaClass).toBe("BACK_DOOR_OR_DIRECT_C_FACTOR");
    expect(result.formula).not.toBeNull();
    expect(formatSymbolicFactor(result.formula as NonNullable<typeof result.formula>)).toBe(
      "P(t101_v1|t100_v0)",
    );
    expect(result.hedge).toBeNull();
    // The window actually used is the one Proposition 1 prescribes:
    // [max(t_min(X) - C, 0), t_max(Y)]. (Here t_min(X) = 100 is below
    // C = 2916 for width 2, so the lower edge is clamped at 0.)
    expect(result.window.tLo).toBe(Math.max(result.window.tMinX - result.window.bound, 0));
    expect(result.window.tHi).toBe(result.window.tMaxY);
  });

  it("reports a bow arc that survives into the window as UNIDENTIFIABLE", () => {
    const result = identifyPeriodicEffect(BOW, query([ref(100, 0)], [ref(101, 1)]));
    expect(result.identifiable).toBe(false);
    expect(result.formulaClass).toBeNull();
    expect(result.formula).toBeNull();
    // The hedge is the bow arc itself: the full C-forest over the two nodes
    // and the strict sub-forest holding the outcome.
    expect(result.hedge).not.toBeNull();
    expect(result.hedge?.forestFull).toEqual([nodeIdOf(ref(100, 0)), nodeIdOf(ref(101, 1))]);
    expect(result.hedge?.forestSub).toEqual([nodeIdOf(ref(101, 1))]);
    expect(result.enablingEdges).toContainEqual([nodeIdOf(ref(100, 0)), nodeIdOf(ref(101, 1))]);
  });

  it("is the same verdict the existing Shpitser-Pearl engine gives on the unrolled window", () => {
    // The module REUSES the repo's engine; it does not reimplement it. This
    // cross-check runs the engine directly on the unrolled ADMG and requires
    // the same verdict, so a future reimplementation cannot quietly diverge.
    for (const graph of [CAUSE, BOW, CONTEMPORANEOUS, CHAIN]) {
      const q = query([ref(100, 0)], [ref(101, graph.width - 1)]);
      const result = identifyPeriodicEffect(graph, q);
      const xSet = new Set(result.unrolled.admg.nodes.filter((n) => n === nodeIdOf(ref(100, 0))));
      const ySet = new Set(
        result.unrolled.admg.nodes.filter((n) => n === nodeIdOf(ref(101, graph.width - 1))),
      );
      const direct = runShpitserPearlID(ySet, xSet, result.unrolled.admg);
      expect(result.identifiable).toBe(direct.ok);
      expect(result.idResult.ok).toBe(direct.ok);
    }
  });

  it("handles a contemporaneous (lag 0) edge in the same slice", () => {
    const result = identifyPeriodicEffect(CONTEMPORANEOUS, query([ref(1, 0)], [ref(1, 1)]));
    expect(result.identifiable).toBe(true);
    expect(result.formulaClass).not.toBeNull();
    expect(result.window.timeSteps).toBe(2);
    expect(result.window.nodeCount).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// 5. THE GUARD
// ---------------------------------------------------------------------------

describe("the node budget guard", () => {
  it("REFUSES a window over the caller's node budget, with a clear error", () => {
    // The window for this query is 34 nodes; the budget is 10.
    let thrown: unknown;
    try {
      identifyPeriodicEffect(CHAIN, query([ref(100)], [ref(101)]), { maxNodes: 10 });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(PeriodicWindowBudgetError);
    const err = thrown as PeriodicWindowBudgetError;
    expect(err.requiredNodes).toBe(34);
    expect(err.requiredTimeSteps).toBe(34);
    expect(err.budgetNodes).toBe(10);
    // The message says what was refused, what it would have cost, and WHY it
    // is not truncated.
    expect(err.message).toMatch(/REFUSING/);
    expect(err.message).toMatch(/NOT truncated/);
    expect(err.message).toContain("34");
    expect(err.message).toContain("[68, 101]");
  });

  it("never silently truncates: the window used is the FULL window", () => {
    // The same query, with a budget that fits. The window that comes back is
    // the whole Proposition 1 window — the refusal above is a refusal, not a
    // truncation that quietly produces a smaller (and wrong) answer.
    const result = identifyPeriodicEffect(CHAIN, query([ref(100)], [ref(101)]), { maxNodes: 40 });
    expect(result.window.tLo).toBe(68);
    expect(result.window.tHi).toBe(101);
    expect(result.window.timeSteps).toBe(34);
    expect(result.window.nodeCount).toBe(34);
    expect(result.unrolled.nodes.length).toBe(34);
    expect(result.unrolled.admg.nodes.length).toBe(34);
  });

  it("refuses the exponential blow-up by default, and the size report shows it in advance", () => {
    const wide: PeriodicADMG = {
      width: 3,
      latency: 1,
      template: [{ kind: "directed", from: 0, to: 2, lag: 1 }],
    };
    const q = query([ref(600000, 0)], [ref(600001, 2)]);

    // The caller can SEE the cost before asking for the answer.
    const size = reportPeriodicWindowSize(wide, q);
    expect(size.nodeCount).toBe(1_572_870);
    expect(size.nodeCount).toBeGreaterThan(DEFAULT_MAX_NODES);

    // And the query itself is refused, not answered on a truncated window.
    expect(() => identifyPeriodicEffect(wide, q)).toThrow(PeriodicWindowBudgetError);
    expect(() => identifyPeriodicEffect(wide, q)).toThrow(/REFUSING/);
  });
});

// ---------------------------------------------------------------------------
// 6. THE REFUSALS THAT KEEP THE ANSWER HONEST
// ---------------------------------------------------------------------------

describe("the refusals that keep the answer honest", () => {
  it("requires the declared latency to match the template's maximum lag", () => {
    // A larger declared latency widens the window and can report
    // "unidentifiable" for an effect the theorem calls identifiable; a smaller
    // one narrows the window and can hide the hedge. Both are refused.
    const wrongLatency: PeriodicADMG = {
      width: 1,
      latency: 2,
      template: [{ kind: "directed", from: 0, to: 0, lag: 1 }],
    };
    expect(() => computePeriodicWindow(wrongLatency, query([ref(10)], [ref(11)]))).toThrow(
      PeriodicIDError,
    );
    expect(() => computePeriodicWindow(wrongLatency, query([ref(10)], [ref(11)]))).toThrow(
      /does not match the maximum lag/,
    );
  });

  it("refuses a query the paper's window does not cover", () => {
    // An intervention that post-dates the outcome: the window
    // [max(t_min(X) - C, 0), t_max(Y)] does not contain X, and the paper
    // states no bound for it.
    expect(() =>
      computePeriodicWindow(CHAIN, query([ref(50)], [ref(10)])),
    ).toThrow(/does not contain the intervention/);
  });

  it("refuses a malformed graph or query", () => {
    expect(() => computePeriodicWindow(CHAIN, query([ref(0)], []))).toThrow(/must be non-empty/);
    expect(() =>
      computePeriodicWindow(CHAIN, query([ref(0)], [ref(0)])),
    ).toThrow(/both an outcome and an intervention/);
    expect(() => computePeriodicWindow(CHAIN, query([ref(-1)], [ref(1)]))).toThrow(
      /non-negative integer/,
    );
    expect(() => computePeriodicWindow(CHAIN, query([ref(0, 5)], [ref(1)]))).toThrow(
      /not a valid within-slice index/,
    );
    expect(() =>
      computePeriodicWindow(
        { width: 1, latency: 1, template: [] },
        query([ref(0)], [ref(1)]),
      ),
    ).toThrow(/no edges/);
  });

  it("is deterministic on a randomly generated periodic template", () => {
    // A seeded template, so the case is reproducible. The point of the test
    // is not a statistical claim about the verdict: it is that the module
    // gives the SAME answer twice, and that the answer's window matches the
    // bound, on a graph nobody hand-wrote.
    const rand = mulberry32(20261020);
    const template: PeriodicTemplateEdge[] = [];
    for (let i = 0; i < 2; i += 1) {
      for (let j = 0; j < 2; j += 1) {
        if (rand() < 0.5) {
          template.push({ kind: "directed", from: i, to: j, lag: 1 });
        }
        if (rand() < 0.5) {
          template.push({ kind: "bidirected", from: i, to: j, lag: 1 });
        }
      }
    }
    if (template.length === 0) {
      template.push({ kind: "directed", from: 0, to: 1, lag: 1 });
    }
    const graph: PeriodicADMG = { width: 2, latency: 1, template };
    const q = query([ref(100, 0)], [ref(101, 1)]);

    const first = identifyPeriodicEffect(graph, q);
    const second = identifyPeriodicEffect(graph, q);
    expect(second.identifiable).toBe(first.identifiable);
    expect(second.formulaClass).toBe(first.formulaClass);
    expect(second.window).toEqual(first.window);
    expect(first.window.bound).toBe(horizonBoundC(2, 1));
    expect(first.window.nodeCount).toBe(first.window.timeSteps * 2);
  });
});
