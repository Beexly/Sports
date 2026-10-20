/**
 * @file __tests__/causal-claim-gate.test.ts
 * GATE G3 must be able to REFUSE.
 *
 * The gate is the thing that stands between an observed contrast and a
 * published causal claim. A gate that cannot refuse is the same defect
 * as the L1-L4 admission gate that reported 67.4% admission by
 * checking shape: it produces a number that looks like verification.
 *
 * So these tests pin the gate to the behaviour that makes it a gate,
 * and each names the failure it prevents.
 */
import { describe, it, expect } from "vitest";
import {
  evaluateCausalClaim,
  graphFromCausalEdge,
  G3_REFUSAL,
} from "../causal-claim-gate.js";
import type { CausalADMG } from "../do-calculus-id.js";

/** The spec's Case 1: X -> Y with a latent confounder X <-> Y. */
const BOW_ARC: CausalADMG = {
  nodes: ["X", "Y"],
  directed: [["X", "Y"]],
  bidirected: [["X", "Y"]],
};

/** The spec's Case 2: front-door, X -> M -> Y with X <-> Y. */
const FRONT_DOOR: CausalADMG = {
  nodes: ["X", "M", "Y"],
  directed: [["X", "M"], ["M", "Y"]],
  bidirected: [["X", "Y"]],
};

/** The spec's Case 3: W -> Z -> X -> Y, W <-> X, Z <-> Y. */
const FOUR_NODE: CausalADMG = {
  nodes: ["W", "Z", "X", "Y"],
  directed: [["W", "Z"], ["Z", "X"], ["X", "Y"]],
  bidirected: [["W", "X"], ["Z", "Y"]],
};

/**
 * The positivity the gate is given in these tests.
 *
 * The spec's G3 is a CONJUNCTION: zero hedges AND
 * P(x | Pa(X) \ X) >= 0.01. The gate has no data, so the caller
 * supplies it, and these tests are about the IDENTIFIABILITY half of
 * the gate -- so they supply a positivity that comfortably passes.
 *
 * The positivity half has its own tests below.
 */
const POSITIVITY = 1;

describe("GATE G3: the causal claim gate", () => {
  it("refuses the confounded bow-arc (prevents publishing an unidentified effect as causal)", () => {
    const v = evaluateCausalClaim({ y: ["Y"], x: ["X"], graph: BOW_ARC, positivity: POSITIVITY });
    expect(v.publishable).toBe(false);
    expect(v.refusal_code).toBe(G3_REFUSAL.nonIdentifiableHedge);
    expect(v.conclusion).toBe("ASSOCIATION_ONLY");
    // The hedge witness must be the Y-rooted one, per the spec's Case 1.
    expect(v.hedge_forest_sub).toEqual(["Y"]);
  });

  it("identifies the front-door graph (prevents refusing a graph that IS identified)", () => {
    const v = evaluateCausalClaim({ y: ["Y"], x: ["X"], graph: FRONT_DOOR, positivity: POSITIVITY });
    expect(v.publishable).toBe(true);
    expect(v.conclusion).toBe("CAUSAL");
    expect(v.formula_class).toBeTruthy();
  });

  it("identifies the 4-node Tian-Pearl case (prevents refusing an identified effect)", () => {
    const v = evaluateCausalClaim({ y: ["Y"], x: ["X"], graph: FOUR_NODE, positivity: POSITIVITY });
    expect(v.publishable).toBe(true);
    expect(v.conclusion).toBe("CAUSAL");
  });

  it("identifies a plain DAG (prevents a false refusal on every acyclic graph)", () => {
    const v = evaluateCausalClaim({
      y: ["Y"],
      x: ["X"],
      graph: { nodes: ["X", "Y"], directed: [["X", "Y"]], bidirected: [] }, positivity: POSITIVITY });
    expect(v.publishable).toBe(true);
  });

  it("refuses when NO graph is supplied (prevents an assumed graph from making every claim identifiable)", () => {
    const v = evaluateCausalClaim({ y: ["Y"], x: ["X"], graph: null, positivity: POSITIVITY });
    expect(v.publishable).toBe(false);
    expect(v.refusal_code).toBe(G3_REFUSAL.noGraph);
    expect(v.conclusion).toBe("ASSOCIATION_ONLY");
  });

  it("refuses when the query names a node the graph does not contain (prevents answering a question the graph cannot answer)", () => {
    const v = evaluateCausalClaim({
      y: ["Z"],
      x: ["X"],
      graph: { nodes: ["X", "Y"], directed: [["X", "Y"]], bidirected: [] }, positivity: POSITIVITY });
    expect(v.publishable).toBe(false);
    expect(v.refusal_code).toBe(G3_REFUSAL.queryNotInGraph);
  });

  it("refuses a query that intervenes on its own outcome (prevents P(x|do(x)) posing as a causal question)", () => {
    const v = evaluateCausalClaim({ y: ["X"], x: ["X"], graph: BOW_ARC, positivity: POSITIVITY });
    expect(v.publishable).toBe(false);
    expect(v.refusal_code).toBe(G3_REFUSAL.invalidQuery);
  });

  it("reports the enabling edges when a hedge blocks the effect (prevents losing the measurement that would fix it)", () => {
    const v = evaluateCausalClaim({ y: ["Y"], x: ["X"], graph: BOW_ARC, positivity: POSITIVITY });
    expect(v.enabling_edges.length).toBeGreaterThan(0);
    // Every enabling edge must be a DIRECTED edge inside the forest --
    // an edge a mediator could actually sit on.
    for (const [u, v2] of v.enabling_edges) {
      expect(BOW_ARC.directed.some(([a, b]) => a === u && b === v2)).toBe(true);
    }
  });

  it("carries the conditioning through a conditional intervention (prevents dropping Z from the query)", () => {
    // The front-door graph, conditioned on the mediator. This is the
    // spec's Case 2 run through IDC rather than ID.
    const v = evaluateCausalClaim({ y: ["Y"], x: ["X"], z: ["M"], graph: FRONT_DOOR, positivity: POSITIVITY });
    expect(v.publishable).toBe(true);
    expect(v.formula_class).toContain("CONDITIONAL_");
  });

  it("refuses a conditional intervention on the bow-arc (prevents a RATIO built on an unidentified joint)", () => {
    const v = evaluateCausalClaim({ y: ["Y"], x: ["X"], z: ["M"], graph: BOW_ARC, positivity: POSITIVITY });
    expect(v.publishable).toBe(false);
    expect(v.conclusion).toBe("ASSOCIATION_ONLY");
  });
});

describe("GATE G3: the graph built from a causal edge", () => {
  it("produces a graph whose effect is identified (prevents a self-contradicting gate)", () => {
    const g = graphFromCausalEdge("Scheme", "Outcome");
    const v = evaluateCausalClaim({ y: ["Outcome"], x: ["Scheme"], graph: g, positivity: POSITIVITY });
    expect(v.publishable).toBe(true);
  });

  it("includes an explicitly supplied latent confounder (prevents the graph from hiding a known confounder)", () => {
    const g = graphFromCausalEdge("X", "Y", { bidirected: [["X", "Y"]] });
    const v = evaluateCausalClaim({ y: ["Y"], x: ["X"], graph: g, positivity: POSITIVITY });
    expect(v.publishable).toBe(false);
    expect(v.refusal_code).toBe(G3_REFUSAL.nonIdentifiableHedge);
  });

  it("orders the nodes topologically (prevents the ID algorithm refusing a malformed graph)", () => {
    const g = graphFromCausalEdge("X", "Y");
    const idx = (n: string) => g.nodes.indexOf(n);
    for (const [u, v] of g.directed) {
      expect(idx(u)).toBeLessThan(idx(v));
    }
  });
});


// ======================================================================
// THE POSITIVITY HALF OF G3.
//
// The spec's G3 is a CONJUNCTION:
//
//     the number of witnessing hedges is 0, AND
//     P(x | Pa(X) \ X) >= 0.01
//
// The identifiability half was implemented and the positivity half was
// ABSENT -- the spec's second number, unenforced, exactly like the
// CI's E-value floor was before it.
//
// The interesting case is the one that is easy to get wrong: an
// IDENTIFIED effect with no positivity supplied. The effect is
// formally identifiable, so a gate that only checked hedges would
// publish it. But the positivity could not be CHECKED, and a
// positivity that cannot be checked is not a positivity that held.
// ======================================================================
describe("GATE G3: the positivity condition", () => {
  const DAG: CausalADMG = {
    nodes: ["X", "Y"],
    directed: [["X", "Y"]],
    bidirected: [],
  };

  it("refuses an identified effect whose positivity is below the floor", () => {
    const v = evaluateCausalClaim({
      y: ["Y"],
      x: ["X"],
      graph: DAG,
      positivity: 0.001,
    });
    expect(v.publishable).toBe(false);
    expect(v.refusal_code).toBe(G3_REFUSAL.positivityViolation);
    expect(v.conclusion).toBe("ASSOCIATION_ONLY");
    // The reason says the number, the floor, and WHY it matters.
    expect(v.reason).toContain("positivity");
    expect(v.reason).toContain("0.001000");
    expect(v.reason).toContain("extrapolation");
  });

  it("refuses an identified effect whose positivity was NOT supplied", () => {
    // THE CASE THAT MATTERS. The effect IS identified -- there is no
    // hedge -- so a gate that only checked hedges would publish it.
    // But nobody checked the positivity, and the spec makes it a
    // conjunct of the gate.
    const v = evaluateCausalClaim({ y: ["Y"], x: ["X"], graph: DAG });
    expect(v.publishable).toBe(false);
    expect(v.refusal_code).toBe(G3_REFUSAL.positivityViolation);
    expect(v.conclusion).toBe("ASSOCIATION_ONLY");
    expect(v.reason).toContain("could not be checked");
  });

  it("accepts an identified effect whose positivity clears the floor", () => {
    const v = evaluateCausalClaim({
      y: ["Y"],
      x: ["X"],
      graph: DAG,
      positivity: 0.5,
    });
    expect(v.publishable).toBe(true);
    expect(v.refusal_code).toBeNull();
    expect(v.conclusion).toBe("CAUSAL");
  });

  it("the floor is 0.01 -- exactly 0.01 passes, just under fails", () => {
    const at = evaluateCausalClaim({
      y: ["Y"],
      x: ["X"],
      graph: DAG,
      positivity: 0.01,
    });
    expect(at.publishable).toBe(true);
    const below = evaluateCausalClaim({
      y: ["Y"],
      x: ["X"],
      graph: DAG,
      positivity: 0.0099,
    });
    expect(below.publishable).toBe(false);
    expect(below.refusal_code).toBe(G3_REFUSAL.positivityViolation);
  });

  it("a hedge is still reported as a hedge, not as a positivity failure", () => {
    // The two conditions are DISTINGUISHABLE. A refused claim must
    // say WHICH condition failed, or a reader cannot act on it.
    const v = evaluateCausalClaim({
      y: ["Y"],
      x: ["X"],
      graph: BOW_ARC,
      positivity: 1,
    });
    expect(v.refusal_code).toBe(G3_REFUSAL.nonIdentifiableHedge);
    expect(v.refusal_code).not.toBe(G3_REFUSAL.positivityViolation);
  });
});
