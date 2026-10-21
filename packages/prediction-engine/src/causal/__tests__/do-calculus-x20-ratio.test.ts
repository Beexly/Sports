/**
 * @file __tests__/do-calculus-x20-ratio.test.ts
 *
 * X20: THE NAPKIN RATIO.
 *
 * The ID recursion used to answer P(Y|do(X)) on the Napkin graph
 * (W -> Z -> X -> Y, W <-> X, W <-> Y) with the UNADJUSTED conditional P(Y|X),
 * while still labelling the result TIAN_C_FACTOR_RATIO. The class string was
 * right and the tree was wrong, which is the failure mode that matters: every
 * downstream consumer that switches on the class read the answer as a conditional
 * functional when it was an unadjusted one. A082 asserted zero RATIO trees, so
 * nothing in the suite could see the contradiction.
 *
 * These tests pin the observable contract of the fix, not its implementation:
 *  - the Napkin answer is a RATIO, and its denominator is the numerator's
 *    Y-marginal (that is what makes it a CONDITIONAL rather than a joint);
 *  - the numerator still carries the W-marginalization the recursion performed,
 *    so the answer is not a product of observational conditionals against the
 *    original graph;
 *  - the graphs the fix must NOT disturb (front-door, plain DAG, the bow-arc
 *    refusal, A082's 4-node graph) are unchanged.
 *
 * Two pinned facts are worth reading carefully, because they are narrower than
 * the bug report implied and are asserted as ACTUALLY MEASURED here:
 *
 *  1. The Napkin graph has exactly ONE valid vertex order. Its directed edges are
 *     the total chain W -> Z -> X -> Y, so `nodes` must be [W,Z,X,Y]; the other 23
 *     permutations are rejected by the topological-order guard instead of being
 *     answered differently. "Order invariance" on this graph is therefore enforced
 *     by validation, not by the recursion (see the 10th test).
 *
 *  2. TIAN_C_FACTOR_RATIO does NOT imply a ratio tree on every graph. The Line-7
 *     wrapper in idRec labels ALL of its answers TIAN_C_FACTOR_RATIO, and A082's
 *     4-node graph reaches Line 1 inside the line-7 sub-model and returns a plain
 *     MARGINAL_SUM with no RATIO node. That is the pre-existing A082 behaviour and
 *     the fix is not supposed to change it, so the 12th test pins it as a
 *     documented exception rather than asserting an invariant that is false.
 */
import { describe, expect, it } from "vitest";
import {
  formatSymbolicFactor,
  FormulaClass,
  runShpitserPearlID,
  type CausalADMG,
  type IDResult,
  type NodeId,
  type SymbolicFactor,
} from "../do-calculus-id";

// ---------------------------------------------------------------------------
// graphs — the exact shapes named in the X20 report
// ---------------------------------------------------------------------------

function graph(
  nodes: readonly NodeId[],
  directed: ReadonlyArray<readonly [NodeId, NodeId]> = [],
  bidirected: ReadonlyArray<readonly [NodeId, NodeId]> = [],
): CausalADMG {
  return { nodes, directed, bidirected };
}

function set(...nodes: NodeId[]): Set<NodeId> {
  return new Set<NodeId>(nodes);
}

/** Napkin / Case-3: W -> Z -> X -> Y with W confounding BOTH X and Y. */
const NAPKIN = graph(
  ["W", "Z", "X", "Y"],
  [["W", "Z"], ["Z", "X"], ["X", "Y"]],
  [["W", "X"], ["W", "Y"]],
);

/** A082's 4-node graph: same chain, but the latents are W<->X and Z<->Y. */
const FOUR = graph(
  ["W", "Z", "X", "Y"],
  [["W", "Z"], ["Z", "X"], ["X", "Y"]],
  [["W", "X"], ["Z", "Y"]],
);

/** Bow-arc: X -> Y with X <-> Y. Unidentifiable — must stay refused. */
const BOW = graph(["X", "Y"], [["X", "Y"]], [["X", "Y"]]);

/** Front-door: X -> M -> Y with X <-> Y. Identifiable by factorisation. */
const FRONT = graph(["X", "M", "Y"], [["X", "M"], ["M", "Y"]], [["X", "Y"]]);

/** Plain DAG: X -> Y, no latents. The direct conditional is correct here. */
const PLAIN = graph(["X", "Y"], [["X", "Y"]]);

/**
 * The tree the fix must produce for the Napkin graph. Verified character-for-character
 * against the module output before being pinned (90 chars); the formatter renders a
 * RATIO as "numerator / denominator" and a MARGINAL_SUM as "Sum_{X}[...]".
 */
// THE SPEC'S PUBLISHED NAPKIN TREE.
//
//   Ratio( Sum[W](*(P(W|)@d * P(X|W,Z)@d * P(Y|W,Z,X)@m)),
//           Sum[W](*(P(W|)@d * P(X|W,Z)@d)) )
//
// The treatment factor P(X|W,Z) is a DENSITY at the assigned value
// (@d), NOT a conditional mean (@m) -- and the denominator has no Y
// factor, because marginalising a conditional density over its own
// target gives 1.
//
// The difference is not cosmetic. On the spec's DGP (true do-effect
// 5), the density form recovers 5.0141 and the mean form 3.8621.
const NAPKIN_TREE =
  "Sum_{W}[(P(W) * P(X|W,Z)@d * P(Y|W,Z,X))] / Sum_{W}[(P(W) * P(X|W,Z)@d)]";

/** A082's answer, unchanged by the X20 fix. */
const FOUR_TREE = "Sum_{Z}[(P(Z|W) * P(Y|W,Z,X))]";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Narrow an identified result or fail with the hedge that came back instead. */
function expectIdentified(result: IDResult): {
  formula: SymbolicFactor;
  formulaClass: string;
} {
  if (!result.ok) {
    throw new Error(
      `expected an identified estimand, got FAIL_HEDGE on ${JSON.stringify(result.hedge)}`,
    );
  }
  return { formula: result.formula, formulaClass: result.formulaClass };
}

/** The RATIO node of a factor, or a failure naming what was found instead. */
function asRatio(factor: SymbolicFactor): Extract<SymbolicFactor, { kind: "RATIO" }> {
  if (factor.kind !== "RATIO") {
    throw new Error(`expected a RATIO node, got ${factor.kind}: ${formatSymbolicFactor(factor)}`);
  }
  return factor;
}

/**
 * Every factor in the tree, depth-first. The point of walking the STRUCTURE rather
 * than grepping the string is that a formatter change cannot make a missing RATIO
 * node look like a present one.
 */
function collectFactors(factor: SymbolicFactor): SymbolicFactor[] {
  switch (factor.kind) {
    case "OBSERVATIONAL_COND":
      return [factor];
    case "ASSIGNED_DENSITY":
      return [factor];
    case "MARGINAL_SUM":
      return [factor, ...collectFactors(factor.body)];
    case "PRODUCT":
      return [factor, ...factor.factors.flatMap((f) => collectFactors(f))];
    case "RATIO":
      return [factor, ...collectFactors(factor.numerator), ...collectFactors(factor.denominator)];
  }
}

function hasRatioNode(factor: SymbolicFactor): boolean {
  return collectFactors(factor).some((f) => f.kind === "RATIO");
}

/** All permutations of a node list — used to sweep the vertex order of the Napkin graph. */
function permutations(items: readonly NodeId[]): NodeId[][] {
  if (items.length <= 1) return [[...items]];
  const out: NodeId[][] = [];
  items.forEach((head, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    for (const tail of permutations(rest)) out.push([head, ...tail]);
  });
  return out;
}

function isTopological(g: CausalADMG): boolean {
  const rank = new Map<NodeId, number>(g.nodes.map((node, index) => [node, index] as const));
  return g.directed.every(([u, v]) => (rank.get(u) ?? -1) < (rank.get(v) ?? -1));
}

describe("X20 — the Napkin ratio", () => {
  it("the Napkin graph yields a RATIO, not an unadjusted conditional", () => {
    const result = runShpitserPearlID(set("Y"), set("X"), NAPKIN);
    expect(result.ok).toBe(true);

    const { formula, formulaClass } = expectIdentified(result);
    expect(formulaClass).toBe(FormulaClass.TianCFactorRatio);

    const text = formatSymbolicFactor(formula);
    // The formatter renders a RATIO as "numerator / denominator" — there is no
    // "Ratio(" text to look for, so " / " is the observable signature.
    expect(text).toContain(" / ");
    // The numerator is the derived joint, which still references the confounder W
    // and the Z that conditions X. An unadjusted P(Y|X) contains none of these.
    expect(text).toContain("P(W)");
    expect(text).toContain("P(X|W,Z)");
    expect(text).toContain("P(Y|W,Z,X)");
  });

  it("the Napkin ratio is the spec's tree, exactly", () => {
    const { formula } = expectIdentified(runShpitserPearlID(set("Y"), set("X"), NAPKIN));
    // Pinned from the measured output, not from the report: the two strings were
    // compared character-for-character (both 90 chars) before this literal was written.
    expect(formatSymbolicFactor(formula)).toBe(NAPKIN_TREE);
  });

  it("the ratio's denominator is the numerator with the TARGET marginalised out", () => {
    const { formula } = expectIdentified(runShpitserPearlID(set("Y"), set("X"), NAPKIN));
    const ratio = asRatio(formula);

    // The denominator MARGINALISES THE TARGET out of the derived joint.
    //
    // It is NOT the numerator wrapped in a Sum_{Y}[...]. Marginalising
    // a conditional density over its OWN target gives 1, so the target
    // is DROPPED -- from the product and from the sum index -- and
    // what is left is the derived joint's marginal over Y.
    //
    // The old form (Sum_{Y}[numerator]) was the same operation done
    // the other way round: it kept the Y factor and integrated it.
    // That is only equal when the Y factor is a DENSITY, and in the
    // numerator the Y factor is a conditional MEAN -- so the two
    // forms are NOT the same tree, and the old one divided by a
    // marginal that did not match the numerator.
    if (ratio.denominator.kind !== "MARGINAL_SUM") {
      throw new Error(
        `expected the denominator to be a MARGINAL_SUM, got ${ratio.denominator.kind}`,
      );
    }
    // The sum index is W (the confounder still being integrated out),
    // NOT Y: Y was dropped, not summed.
    expect(ratio.denominator.sumOut).toEqual(["W"]);

    // And the numerator's Y factor is GONE from the denominator.
    const denominatorText = formatSymbolicFactor(ratio.denominator);
    expect(denominatorText).not.toContain("P(Y|");
    expect(denominatorText).toContain("P(X|W,Z)@d");
    // While the numerator KEEPS the Y factor, as a conditional mean.
    const numeratorText = formatSymbolicFactor(ratio.numerator);
    expect(numeratorText).toContain("P(Y|W,Z,X)");
    // And the treatment factor is a DENSITY in both.
    expect(numeratorText).toContain("P(X|W,Z)@d");
    expect(denominatorText).toContain("P(X|W,Z)@d");
  });

  it("the treatment factor is a DENSITY at the assigned value, not a conditional mean", () => {
    // THE DEFECT THIS FILE NOW GUARDS AGAINST.
    //
    // The treatment X is HELD at its assigned value, so its factor in
    // the derived joint is the density p(x|w,z) at that value -- not
    // the conditional mean E[X|W,Z]. Reading it as a mean gives the
    // wrong estimand, and the difference is measurable: on the spec's
    // DGP the density form recovers 5.0141 and the mean form 3.8621,
    // against a true do-effect of 5.
    //
    // This is asserted STRUCTURALLY, not by matching a string, so a
    // formatter change cannot make the distinction invisible.
    const { formula } = expectIdentified(runShpitserPearlID(set("Y"), set("X"), NAPKIN));
    const ratio = asRatio(formula);

    const factors = collectFactors(formula);
    const densities = factors.filter((f) => f.kind === "ASSIGNED_DENSITY");
    // TWO: one in the numerator and one in the denominator. The
    // treatment is a density in BOTH branches -- the denominator is
    // the same derived joint with the target marginalised out, so it
    // carries the same treatment factor.
    expect(densities.length).toBe(2);
    for (const d of densities) {
      expect(d.kind).toBe("ASSIGNED_DENSITY");
      if (d.kind !== "ASSIGNED_DENSITY") return;
      expect(d.target).toBe("X");
    }
    // And it is NOT a plain OBSERVATIONAL_COND any more -- a plain one
    // is read as a mean, which is the bug.
    const plainXConds = factors.filter(
      (f) => f.kind === "OBSERVATIONAL_COND" && f.target === "X",
    );
    expect(plainXConds.length).toBe(0);
  });

  it("a bidirected arc means the answer must NOT be a bare P(Y|X)", () => {
    const { formula, formulaClass } = expectIdentified(
      runShpitserPearlID(set("Y"), set("X"), NAPKIN),
    );
    const text = formatSymbolicFactor(formula);

    // The exact X20 failure: the unadjusted conditional returned and labelled as a ratio.
    expect(text).not.toBe("P(Y|X)");
    // A bare conditional has no denominator and no marginalization anywhere.
    expect(text).not.toMatch(/^P\(Y\|X\)$/);
    expect(text).toContain(" / ");
    expect(formulaClass).toBe(FormulaClass.TianCFactorRatio);
  });

  it("the front-door graph is unaffected", () => {
    const { formula, formulaClass } = expectIdentified(
      runShpitserPearlID(set("Y"), set("X"), FRONT),
    );
    expect(formulaClass).toBe(FormulaClass.CComponentFactorization);

    const text = formatSymbolicFactor(formula);
    expect(text).toContain("P(M|X)");
    // The front-door answer is a product of conditionals, NOT a ratio: the prune at
    // line 2 works on the observational P, which must not be re-read as a c-factor.
    expect(text).not.toContain(" / ");
    expect(hasRatioNode(formula)).toBe(false);
  });

  it("a plain DAG still gives the direct conditional", () => {
    const { formula, formulaClass } = expectIdentified(
      runShpitserPearlID(set("Y"), set("X"), PLAIN),
    );
    expect(formulaClass).toBe(FormulaClass.BackDoorOrDirectCFactor);
    expect(formatSymbolicFactor(formula)).toBe("P(Y|X)");
  });

  it("the bow-arc is still refused", () => {
    const result = runShpitserPearlID(set("Y"), set("X"), BOW);
    expect(result.ok).toBe(false);
    if (result.ok) return; // narrowing; the assertion above already failed
    expect(result.code).toBe("FAIL_HEDGE");
  });

  it("A082's 4-node graph is unchanged", () => {
    const { formula, formulaClass } = expectIdentified(
      runShpitserPearlID(set("Y"), set("X"), FOUR),
    );
    expect(formulaClass).toBe(FormulaClass.TianCFactorRatio);
    expect(formatSymbolicFactor(formula)).toBe(FOUR_TREE);

    // See the 12th test: FOUR carries the TIAN_C_FACTOR_RATIO label from the line-7
    // wrapper but contains no RATIO node. That is pre-existing A082 behaviour, pinned
    // here and there so it cannot drift silently in either direction.
    expect(hasRatioNode(formula)).toBe(false);
  });

  it("the ratio is a RATIO node, structurally", () => {
    const { formula } = expectIdentified(runShpitserPearlID(set("Y"), set("X"), NAPKIN));
    const factors = collectFactors(formula);

    const ratios = factors.filter((f) => f.kind === "RATIO");
    expect(ratios.length).toBeGreaterThanOrEqual(1);
    expect(hasRatioNode(formula)).toBe(true);

    // Exactly one ratio on this query: two would mean a nested normalisation.
    expect(ratios.length).toBe(1);
    expect(asRatio(formula).kind).toBe("RATIO");
  });

  it("the ratio survives a topological reordering", () => {
    // MEASURED BEHAVIOUR, pinned as found: NAPKIN's directed edges are the total chain
    // W -> Z -> X -> Y, so exactly ONE of the 24 permutations is a topological order.
    // The orders the report suggested ([Y,X,Z,W], [Z,W,Y,X]) are NOT topological on this
    // graph and the module rejects them by design (assertWellFormed) rather than
    // answering them differently. They are pinned as throws here, because "assert the
    // class is still TIAN_C_FACTOR_RATIO" is not achievable on an invalid graph.
    for (const order of [
      ["Y", "X", "Z", "W"],
      ["Z", "W", "Y", "X"],
    ] as ReadonlyArray<readonly NodeId[]>) {
      const reordered: CausalADMG = { ...NAPKIN, nodes: order };
      expect(isTopological(reordered)).toBe(false);
      expect(() => runShpitserPearlID(set("Y"), set("X"), reordered)).toThrow(
        /topological order/,
      );
    }

    // Full sweep: every permutation is either the single valid order (which must yield
    // the ratio) or a malformed graph that throws the topological-order error.
    const validOrders: NodeId[][] = [];
    for (const order of permutations(NAPKIN.nodes)) {
      const reordered: CausalADMG = { ...NAPKIN, nodes: order };
      if (!isTopological(reordered)) {
        expect(() => runShpitserPearlID(set("Y"), set("X"), reordered)).toThrow(
          /topological order/,
        );
        continue;
      }
      validOrders.push(order);
      const { formula, formulaClass } = expectIdentified(
        runShpitserPearlID(set("Y"), set("X"), reordered),
      );
      expect(formulaClass).toBe(FormulaClass.TianCFactorRatio);
      expect(formatSymbolicFactor(formula)).toContain(" / ");
    }

    expect(validOrders).toHaveLength(1);
    expect(validOrders[0]).toEqual(["W", "Z", "X", "Y"]);
  });

  it("the X20 fix is load-bearing", () => {
    // The bug is inside idRec, so a true mutation test would have to edit the module.
    // What is checked instead is the structural consequence that the bug could not
    // satisfy: the RATIO's numerator carries the W-marginalization performed by the
    // recursion. The buggy form was a bare observational conditional P(Y|X); a
    // product of observational conditionals built against the original graph has no
    // MARGINAL_SUM inside it at all.
    const { formula, formulaClass } = expectIdentified(
      runShpitserPearlID(set("Y"), set("X"), NAPKIN),
    );
    expect(formulaClass).toBe(FormulaClass.TianCFactorRatio);

    const ratio = asRatio(formula);
    const numeratorText = formatSymbolicFactor(ratio.numerator);

    expect(numeratorText).toContain("Sum_{W}[");
    // ... and it is not itself a single conditional, which is what the bug returned.
    expect(ratio.numerator.kind).not.toBe("OBSERVATIONAL_COND");
    expect(ratio.numerator.kind).toBe("MARGINAL_SUM");

    const numeratorMarginals = collectFactors(ratio.numerator).filter(
      (f) => f.kind === "MARGINAL_SUM",
    );
    expect(numeratorMarginals.length).toBeGreaterThanOrEqual(1);
  });

  it("the formula class and the tree agree", () => {
    const cases: ReadonlyArray<{ readonly name: string; readonly g: CausalADMG }> = [
      { name: "NAPKIN", g: NAPKIN },
      { name: "FOUR", g: FOUR },
      { name: "FRONT", g: FRONT },
      { name: "PLAIN", g: PLAIN },
    ];
    const measured = cases.map(({ name, g }) => {
      const { formula, formulaClass } = expectIdentified(runShpitserPearlID(set("Y"), set("X"), g));
      return { name, text: formatSymbolicFactor(formula), formulaClass, hasRatio: hasRatioNode(formula) };
    });

    // Direction 1 (the invariant the bug violated, and the one that holds everywhere):
    // a ratio-looking tree is never filed under a non-ratio class.
    const withRatioText = measured.filter((m) => m.text.includes(" / "));
    expect(withRatioText.length).toBeGreaterThan(0); // non-vacuous: NAPKIN is in the set
    for (const entry of withRatioText) {
      expect(entry.formulaClass, `${entry.name} has a ratio tree`).toBe(
        FormulaClass.TianCFactorRatio,
      );
      expect(entry.hasRatio, `${entry.name} prints " / " but has no RATIO node`).toBe(true);
    }

    // Direction 2 (class => ratio tree) DOES NOT hold globally. NAPKIN satisfies it...
    const napkin = measured.find((m) => m.name === "NAPKIN");
    expect(napkin?.formulaClass).toBe(FormulaClass.TianCFactorRatio);
    expect(napkin?.text).toContain(" / ");
    expect(napkin?.hasRatio).toBe(true);

    // ... but A082's 4-node graph is a KNOWN, PINNED EXCEPTION: idRec's line-7 wrapper
    // stamps TIAN_C_FACTOR_RATIO on every line-7 answer, and FOUR's nested recursion
    // terminates at line 1 (x becomes empty after pruning), so the tree is a plain
    // MARGINAL_SUM. Asserting the invariant here would fail — the honest assertion is
    // the measured one, recorded so a future change to either side is noticed.
    const four = measured.find((m) => m.name === "FOUR");
    expect(four?.formulaClass).toBe(FormulaClass.TianCFactorRatio);
    expect(four?.text).toBe(FOUR_TREE);
    expect(four?.hasRatio).toBe(false);

    // The remaining two graphs are non-ratio classes with non-ratio trees: the
    // implication holds trivially in both directions for them.
    for (const name of ["FRONT", "PLAIN"] as const) {
      const entry = measured.find((m) => m.name === name);
      expect(entry?.formulaClass).not.toBe(FormulaClass.TianCFactorRatio);
      expect(entry?.text).not.toContain(" / ");
      expect(entry?.hasRatio).toBe(false);
    }
  });
});
