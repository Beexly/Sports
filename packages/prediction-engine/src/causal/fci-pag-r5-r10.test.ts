/**
 * Zhang (2008) R5-R10 -- the tail-completion and selection-bias rules.
 *
 * THE SOURCE. J. Zhang, "On the completeness of orientation rules for causal discovery in the
 * presence of latent confounders and selection bias", Artificial Intelligence 172(16-17):
 * 1873-1896, 2008. doi:10.1016/j.artint.2008.08.001. The rules are on journal pages 1880
 * (R5-R7) and 1881 (R8-R10); the extracted text is quoted verbatim in ./fci-pag.ts above the
 * implementations, and the reference implementation is pcalg's udag2pag.R.
 *
 * EVERY RULE GETS A POSITIVE TEST AND AS MANY NEGATIVE TESTS AS IT HAS CLAUSES. A test that
 * only shows a rule firing cannot tell a correct rule from one that fires on everything, and
 * the negative tests are the ones that pin the antecedent.
 *
 * EACH TEST APPLIES EXACTLY ONE RULE. The `rules` argument to `orientPag` is the reason, and
 * it is not a stylistic choice. These rules compete: on a hand-built graph, `completeAncestral`
 * and R2 can fire on precisely the configuration R8 or R9 needs. When every rule runs, a test
 * asserting "the graph came out oriented" passes EVEN IF THE RULE IT NAMES IS DELETED -- it is
 * testing the fixpoint, not the rule. The mutation sweep
 * (packages/prediction-engine/reconciliation/_mutation_sweep_r5_r10.mjs) demonstrated exactly
 * that for R8 before this switch existed: disabling R8 left its test green.
 *
 * pcalg's `udag2pag` has the same per-rule switch (`rules = c(TRUE, TRUE, ...)`) for the same
 * reason.
 *
 * A NOTE ON REDUNDANCY, because it dictated the shape of several graphs below. Some of Zhang's
 * clauses are IMPLIED by others on small graphs, and a negative test on such a graph cannot
 * detect the loss of the implied clause -- it still fails for the other reason. Concretely:
 * on a 4-cycle, R5's "alpha, theta are not adjacent and beta, gamma are not adjacent" IS the
 * cycle's own unshielded-triple condition, so a 4-cycle test pins nothing about that clause
 * separately. The 5-node graphs below are where those clauses become independent, and they are
 * where the corresponding tests live.
 *
 * THE GRAPHS ARE HAND-BUILT. These are unit tests of the rules, not of the CI tests, so the
 * marks are set directly.
 *
 * THE MARK VOCABULARY. `E(u, v, markU, markV)` is the mark AT u and the mark AT v on the
 * edge {u,v}. Zhang's `o-o` is a circle at both ends; `o->` a circle at the near end and an
 * arrowhead at the far end; a bare `-` an undirected edge, which this module represents as a
 * TAIL AT BOTH ENDS (the same convention its own pagToAdmg already documents).
 */
import { describe, it, expect } from "vitest";
import { orientPag } from "./fci-pag.js";
import type { EdgeMark, FciEdge, OrientationRule } from "./fci-pag.js";

function markOf(edges: readonly FciEdge[], i: number, j: number): EdgeMark | undefined {
  for (const e of edges) {
    if (e.u === i && e.v === j) return e.markU;
    if (e.v === i && e.u === j) return e.markV;
  }
  return undefined;
}

function E(u: number, v: number, markU: EdgeMark, markV: EdgeMark): FciEdge {
  return { u, v, markU, markV };
}

/** Apply ONLY the named rule, so nothing else can produce the orientation being asserted. */
function only(rule: OrientationRule, d: number, edges: readonly FciEdge[]): FciEdge[] {
  return orientPag(d, edges, new Map(), [rule]);
}

// ---------------------------------------------------------------------------
// R5: Uncovered Circle Path -> undirected edges
// ---------------------------------------------------------------------------

describe("Zhang R5 -- the uncovered circle path rule", () => {
  /**
   * THE WITNESS. 0-1-2-3-0 is a 4-cycle of circle-circle edges with NO diagonals, so every
   * consecutive triple on it is unshielded: (0,1,2) needs 0 not adjacent to 2, (1,2,3) needs
   * 1 not adjacent to 3, and the two wrap-around triples need 3 not adjacent to 1 and 0 not
   * adjacent to 2 -- the same two conditions. The cycle is therefore an UNCOVERED CIRCLE
   * CYCLE, which is exactly R5's antecedent.
   *
   * R5's consequent turns the 0-3 edge AND every edge of the path undirected (tail at both
   * ends). All four edges of the cycle end up tail-tail.
   */
  it("turns an uncovered circle cycle into undirected edges", () => {
    const out = only("R5", 4, [
      E(0, 1, "circle", "circle"),
      E(1, 2, "circle", "circle"),
      E(2, 3, "circle", "circle"),
      E(0, 3, "circle", "circle"),
    ]);
    for (const [u, v] of [
      [0, 1],
      [1, 2],
      [2, 3],
      [0, 3],
    ] as const) {
      expect(markOf(out, u, v)).toBe("tail");
      expect(markOf(out, v, u)).toBe("tail");
    }
  });

  /**
   * THE NEGATIVE CASE: A SHIELDED CYCLE. Adding the diagonal 0-2 shields the triple (0,1,2),
   * so the cycle is not uncovered and R5 must not fire at all.
   *
   * Nothing else can rescue it: the only circle paths from 0 to 3 in this graph are 0-1-2-3
   * (shielded at the triple (0,1,2)) and the too-short 0-2-3, so there is no eligible path.
   */
  it("does NOT fire when the cycle is shielded", () => {
    const out = only("R5", 4, [
      E(0, 1, "circle", "circle"),
      E(1, 2, "circle", "circle"),
      E(2, 3, "circle", "circle"),
      E(0, 3, "circle", "circle"),
      E(0, 2, "circle", "circle"), // the shield
    ]);
    for (const [u, v] of [
      [0, 1],
      [1, 2],
      [2, 3],
      [0, 3],
    ] as const) {
      expect(markOf(out, u, v)).toBe("circle");
      expect(markOf(out, v, u)).toBe("circle");
    }
  });

  /**
   * THE NEGATIVE CASE FOR THE "UNCOVERED" CLAUSE, ON A 5-CYCLE.
   *
   * Here the 5-cycle 0-1-2-3-4-0 is all circle-circle, but the diagonal 0-2 is written
   * circle-ARROWHEAD rather than circle-circle. Two things follow, and the test needs both:
   * the diagonal still SHIELDS the triple (0,1,2) -- adjacency is adjacency whatever the marks
   * -- and it is not a circle edge, so the path cannot go 0-2-... either. The path 0-1-2-3-4 is
   * therefore not an uncovered CIRCLE path, and R5 must not fire.
   *
   * WHY 5 NODES AND NOT 4. On a 4-cycle, R5's explicit clauses ("alpha, theta are not adjacent
   * and beta, gamma are not adjacent") coincide with the cycle's own unshielded-triple
   * condition, so a 4-cycle test cannot tell which requirement stopped the rule. On a 5-cycle
   * the clauses are independent, which is what makes the tests below able to pin them.
   *
   * The other candidate paths are excluded too: 0-4-3-2-1 is shielded at (0,4,3) because
   * 0 and 3 are adjacent, and 1-0-4-3-2 is shielded at (2,1,0) for the same reason.
   */
  it("does NOT fire when a consecutive triple on the path is shielded", () => {
    const out = only("R5", 5, [
      E(0, 1, "circle", "circle"),
      E(1, 2, "circle", "circle"),
      E(2, 3, "circle", "circle"),
      E(3, 4, "circle", "circle"),
      E(0, 4, "circle", "circle"),
      E(0, 2, "circle", "arrowhead"), // shields (0,1,2); not a circle edge
    ]);
    expect(markOf(out, 0, 4)).toBe("circle");
    expect(markOf(out, 4, 0)).toBe("circle");
    expect(markOf(out, 0, 1)).toBe("circle");
    expect(markOf(out, 1, 2)).toBe("circle");
  });

  /**
   * THE NEGATIVE CASE FOR R5'S EXPLICIT CLAUSE "alpha, theta are not adjacent".
   *
   * The 5-cycle 0-1-2-3-4-0 is all circle-circle and the path 0-1-2-3-4 IS an uncovered
   * circle path: the triples (0,1,2), (1,2,3) and (2,3,4) are all unshielded. But the
   * diagonal 0-3 makes alpha=0 adjacent to theta=3, and R5 requires that they are not. So the
   * rule must not fire on the 0-4 edge.
   *
   * The diagonal is written circle-ARROWHEAD so that it is NOT itself a circle-circle edge:
   * otherwise R5 would legitimately fire on the 0-3 edge instead (the path 0-1-2-3 is an
   * uncovered circle path there), and this test would be measuring the wrong thing.
   *
   * The other paths are excluded: 0-4-3-2-1 and 1-0-4-3-2 and 2-1-0-4-3 are all shielded at
   * the triple (0,4,3), because 0 and 3 are adjacent.
   */
  it("does NOT fire when alpha and theta are adjacent", () => {
    const out = only("R5", 5, [
      E(0, 1, "circle", "circle"),
      E(1, 2, "circle", "circle"),
      E(2, 3, "circle", "circle"),
      E(3, 4, "circle", "circle"),
      E(0, 4, "circle", "circle"),
      E(0, 3, "circle", "arrowhead"), // alpha adjacent to theta
    ]);
    expect(markOf(out, 0, 4)).toBe("circle");
    expect(markOf(out, 4, 0)).toBe("circle");
    expect(markOf(out, 0, 1)).toBe("circle");
  });
});

// ---------------------------------------------------------------------------
// R6 and R7: the selection-bias rules
// ---------------------------------------------------------------------------

describe("Zhang R6 -- an undirected edge propagates a tail", () => {
  /**
   * R6: "If alpha - beta o-* gamma (alpha and gamma may or may not be adjacent), then orient
   * beta o-* gamma as beta -* gamma." So an UNDIRECTED edge at beta (tail at both ends) turns
   * beta's circle toward gamma into a tail.
   */
  it("turns the circle at beta into a tail when beta has an undirected edge", () => {
    const out = only("R6", 3, [
      E(0, 1, "tail", "tail"), // the undirected edge
      E(1, 2, "circle", "circle"), // beta o-* gamma
    ]);
    expect(markOf(out, 1, 2)).toBe("tail");
    expect(markOf(out, 2, 1)).toBe("circle");
  });

  /**
   * THE NEGATIVE CASE: BETA HAS NO CIRCLE. The 1-2 edge carries an arrowhead at beta rather
   * than a circle, so R6's antecedent "beta o-* gamma" does not hold, and the arrowhead at
   * beta must survive untouched.
   *
   * The mark asserted is the one R6 would write: R6 replaces the circle at BETA with a tail.
   * If the rule fired here it would overwrite the arrowhead, so this test actually detects a
   * rule that has lost the "circle at beta" requirement. A test that asserted the mark at
   * GAMMA instead would not: R6 never writes there, so it could not detect the change.
   */
  it("does NOT fire when beta has no circle", () => {
    const out = only("R6", 3, [
      E(0, 1, "tail", "tail"),
      E(1, 2, "arrowhead", "circle"), // no circle at beta
    ]);
    expect(markOf(out, 1, 2)).toBe("arrowhead");
    expect(markOf(out, 2, 1)).toBe("circle");
  });

  /**
   * THE NEGATIVE CASE: THE CIRCLE IS AT THE FAR END. The 1-2 edge reads `tail -o circle`
   * from beta, i.e. the circle is at gamma, so beta has no circle to turn into a tail.
   */
  it("does NOT fire when the circle is at the far end of the edge", () => {
    const out = only("R6", 3, [
      E(0, 1, "tail", "tail"),
      E(1, 2, "tail", "circle"), // circle at 2, not at 1
    ]);
    expect(markOf(out, 1, 2)).toBe("tail");
    expect(markOf(out, 2, 1)).toBe("circle");
  });
});

describe("Zhang R7 -- the uncovered non-collider tail rule", () => {
  /**
   * R7: "If alpha -o beta o-* gamma, and alpha, gamma are not adjacent, then orient beta o-*
   * gamma as beta -* gamma." So 0-1 is tail-at-0/circle-at-1, 1-2 is circle-at-1, and 0 and 2
   * are not adjacent.
   */
  it("turns the circle at beta into a tail when alpha and gamma are non-adjacent", () => {
    const out = only("R7", 3, [
      E(0, 1, "tail", "circle"), // alpha -o beta
      E(1, 2, "circle", "circle"), // beta o-* gamma
    ]);
    expect(markOf(out, 1, 2)).toBe("tail");
    expect(markOf(out, 2, 1)).toBe("circle");
    // The alpha-beta edge is untouched: R7 only writes on the beta-gamma edge.
    expect(markOf(out, 0, 1)).toBe("tail");
    expect(markOf(out, 1, 0)).toBe("circle");
  });

  /**
   * THE NEGATIVE CASE: ALPHA AND GAMMA ARE ADJACENT. Add the edge 0-2 and R7's "alpha, gamma
   * are not adjacent" condition fails, so the circle at beta must stay.
   */
  it("does NOT fire when alpha and gamma are adjacent", () => {
    const out = only("R7", 3, [
      E(0, 1, "tail", "circle"),
      E(1, 2, "circle", "circle"),
      E(0, 2, "circle", "circle"), // alpha and gamma adjacent
    ]);
    expect(markOf(out, 1, 2)).toBe("circle");
    expect(markOf(out, 2, 1)).toBe("circle");
  });
});

// ---------------------------------------------------------------------------
// R8, R9, R10: the tail-completion rules
// ---------------------------------------------------------------------------

describe("Zhang R8 -- the transitive tail rule", () => {
  /**
   * R8: "If alpha -> beta -> gamma or alpha -o beta -> gamma, and alpha o-> gamma, orient
   * alpha o-> gamma as alpha -> gamma." Here 0 -> 1 -> 2 and 0 o-> 2, so the circle at 0
   * becomes a tail: the edge becomes 0 -> 2.
   *
   * ONLY R8 RUNS. This is the whole point of the `rules` switch. With every rule enabled,
   * `completeAncestral` fires on this same graph -- it sees the circle at 0 and the directed
   * path 0 -> 1 -> 2 -- and writes the same tail, so the test would pass with R8 deleted.
   * The mutation sweep caught that.
   */
  it("turns alpha o-> gamma into alpha -> gamma given a directed path", () => {
    const out = only("R8", 3, [
      E(0, 1, "tail", "arrowhead"), // alpha -> beta
      E(1, 2, "tail", "arrowhead"), // beta -> gamma
      E(0, 2, "circle", "arrowhead"), // alpha o-> gamma
    ]);
    expect(markOf(out, 0, 2)).toBe("tail");
    expect(markOf(out, 2, 0)).toBe("arrowhead");
  });

  /**
   * THE NEGATIVE CASE: NO PATH. Same graph with 0-1 written `o->` (circle at 0, arrowhead at
   * 1) instead of `->`, so there is no alpha -> beta step and R8 has no antecedent.
   */
  it("does NOT fire without a directed path from alpha", () => {
    const out = only("R8", 3, [
      E(0, 1, "circle", "arrowhead"), // alpha o-> beta, not alpha -> beta
      E(1, 2, "tail", "arrowhead"), // beta -> gamma
      E(0, 2, "circle", "arrowhead"), // alpha o-> gamma
    ]);
    expect(markOf(out, 0, 2)).toBe("circle");
    expect(markOf(out, 2, 0)).toBe("arrowhead");
  });
});

describe("Zhang R9 -- the uncovered potentially directed path rule", () => {
  /**
   * R9: "If alpha o-> gamma, and p = <alpha, beta, theta, ..., gamma> is an uncovered p.d.
   * path from alpha to gamma such that gamma and beta are not adjacent, then orient alpha o->
   * gamma as alpha -> gamma."
   *
   * THE PATH 0-1-2-3. Each step is a p.d. step: 0-1 is circle-circle, 1-2 is circle-circle,
   * 2-3 is circle-ARROWHEAD (a step whose head carries an arrowhead is still p.d., because
   * "p.d." forbids an arrowhead INTO the step's tail and a tail OUT of its head). The path is
   * uncovered: the triples (0,1,2) and (1,2,3) are unshielded because 0 is not adjacent to 2
   * and 1 is not adjacent to 3. And gamma=3 is not adjacent to beta=1, which is R9's extra
   * condition.
   */
  it("turns alpha o-> gamma into alpha -> gamma given an uncovered p.d. path", () => {
    const out = only("R9", 4, [
      E(0, 1, "circle", "circle"),
      E(1, 2, "circle", "circle"),
      E(2, 3, "circle", "arrowhead"),
      E(0, 3, "circle", "arrowhead"), // alpha o-> gamma
    ]);
    expect(markOf(out, 0, 3)).toBe("tail");
    expect(markOf(out, 3, 0)).toBe("arrowhead");
  });

  /**
   * THE NEGATIVE CASE FOR R9'S EXPLICIT CLAUSE "gamma and beta are not adjacent", ON A 5-NODE
   * PATH.
   *
   * WHY NOT ON THE 4-NODE PATH. With beta the second node and gamma the last, a path of four
   * nodes has the triple (beta, ..., gamma) as a CONSECUTIVE triple, so the path's own
   * uncoveredness already forbids beta and gamma from being adjacent. On a 4-node path the
   * clause is implied, and a test there cannot detect its loss: the rule is stopped by the
   * uncoveredness check either way. On a 5-node path the clause stands alone, which is the
   * only way to pin it.
   *
   * THE GRAPH. The path 0-1-2-3-4 is all circle-circle, so every step is a p.d. step, and its
   * consecutive triples (0,1,2), (1,2,3) and (2,3,4) are all unshielded -- the path IS an
   * uncovered p.d. path. But the extra edge 1-4 makes beta=1 adjacent to gamma=4, and R9
   * requires that they are not. The 1-4 edge does not shield any consecutive triple of the
   * path, so the path stays uncovered and the adjacency is the ONLY thing that blocks the
   * rule.
   */
  it("does NOT fire when the second vertex is adjacent to gamma", () => {
    const out = only("R9", 5, [
      E(0, 1, "circle", "circle"),
      E(1, 2, "circle", "circle"),
      E(2, 3, "circle", "circle"),
      E(3, 4, "circle", "circle"),
      E(0, 4, "circle", "arrowhead"), // alpha o-> gamma
      E(1, 4, "circle", "circle"), // beta adjacent to gamma
    ]);
    expect(markOf(out, 0, 4)).toBe("circle");
    expect(markOf(out, 4, 0)).toBe("arrowhead");
  });
});

describe("Zhang R10 -- the two-path collider tail rule", () => {
  /**
   * R10: "Suppose alpha o-> gamma, beta -> gamma <- theta, p1 is an uncovered p.d. path from
   * alpha to beta, and p2 is an uncovered p.d. path from alpha to theta. Let mu be the vertex
   * adjacent to alpha on p1 (mu could be beta), and omega be the vertex adjacent to alpha on p2
   * (omega could be theta). If mu and omega are distinct, and are not adjacent, then orient
   * alpha o-> gamma as alpha -> gamma."
   *
   * THE PATHS ARE THE SINGLE EDGES 0-1 and 0-2, so mu = 1 = beta and omega = 2 = theta. Both
   * are p.d. steps (circle-circle edges) and a two-node path has no consecutive triple, so it
   * is uncovered. mu and omega are distinct and 1 is not adjacent to 2.
   */
  it("turns alpha o-> gamma into alpha -> gamma given two non-adjacent p.d. paths", () => {
    const out = only("R10", 4, [
      E(0, 1, "circle", "circle"), // alpha -> beta (p1, a single p.d. step)
      E(0, 2, "circle", "circle"), // alpha -> theta (p2)
      E(1, 3, "tail", "arrowhead"), // beta -> gamma
      E(2, 3, "tail", "arrowhead"), // theta -> gamma
      E(0, 3, "circle", "arrowhead"), // alpha o-> gamma
    ]);
    expect(markOf(out, 0, 3)).toBe("tail");
    expect(markOf(out, 3, 0)).toBe("arrowhead");
  });

  /**
   * THE NEGATIVE CASE: MU AND OMEGA ARE ADJACENT. Add the edge 1-2 and R10's "mu and omega are
   * distinct, and are not adjacent" condition fails, so the circle at alpha must stay.
   */
  it("does NOT fire when the two paths start at adjacent vertices", () => {
    const out = only("R10", 4, [
      E(0, 1, "circle", "circle"),
      E(0, 2, "circle", "circle"),
      E(1, 2, "circle", "circle"), // mu adjacent to omega
      E(1, 3, "tail", "arrowhead"),
      E(2, 3, "tail", "arrowhead"),
      E(0, 3, "circle", "arrowhead"),
    ]);
    expect(markOf(out, 0, 3)).toBe("circle");
    expect(markOf(out, 3, 0)).toBe("arrowhead");
  });
});
