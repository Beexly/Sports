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

describe("GATE G3: the causal claim gate", () => {
  it("refuses the confounded bow-arc (prevents publishing an unidentified effect as causal)", () => {
    const v = evaluateCausalClaim({ y: ["Y"], x: ["X"], graph: BOW_ARC });
    expect(v.publishable).toBe(false);
    expect(v.refusal_code).toBe(G3_REFUSAL.nonIdentifiableHedge);
    expect(v.conclusion).toBe("ASSOCIATION_ONLY");
    // The hedge witness must be the Y-rooted one, per the spec's Case 1.
    expect(v.hedge_forest_sub).toEqual(["Y"]);
  });

  it("identifies the front-door graph (prevents refusing a graph that IS identified)", () => {
    const v = evaluateCausalClaim({ y: ["Y"], x: ["X"], graph: FRONT_DOOR });
    expect(v.publishable).toBe(true);
    expect(v.conclusion).toBe("CAUSAL");
    expect(v.formula_class).toBeTruthy();
  });

  it("identifies the 4-node Tian-Pearl case (prevents refusing an identified effect)", () => {
    const v = evaluateCausalClaim({ y: ["Y"], x: ["X"], graph: FOUR_NODE });
    expect(v.publishable).toBe(true);
    expect(v.conclusion).toBe("CAUSAL");
  });

  it("identifies a plain DAG (prevents a false refusal on every acyclic graph)", () => {
    const v = evaluateCausalClaim({
      y: ["Y"],
      x: ["X"],
      graph: { nodes: ["X", "Y"], directed: [["X", "Y"]], bidirected: [] },
    });
    expect(v.publishable).toBe(true);
  });

  it("refuses when NO graph is supplied (prevents an assumed graph from making every claim identifiable)", () => {
    const v = evaluateCausalClaim({ y: ["Y"], x: ["X"], graph: null });
    expect(v.publishable).toBe(false);
    expect(v.refusal_code).toBe(G3_REFUSAL.noGraph);
    expect(v.conclusion).toBe("ASSOCIATION_ONLY");
  });

  it("refuses when the query names a node the graph does not contain (prevents answering a question the graph cannot answer)", () => {
    const v = evaluateCausalClaim({
      y: ["Z"],
      x: ["X"],
      graph: { nodes: ["X", "Y"], directed: [["X", "Y"]], bidirected: [] },
    });
    expect(v.publishable).toBe(false);
    expect(v.refusal_code).toBe(G3_REFUSAL.queryNotInGraph);
  });

  it("refuses a query that intervenes on its own outcome (prevents P(x|do(x)) posing as a causal question)", () => {
    const v = evaluateCausalClaim({ y: ["X"], x: ["X"], graph: BOW_ARC });
    expect(v.publishable).toBe(false);
    expect(v.refusal_code).toBe(G3_REFUSAL.invalidQuery);
  });

  it("reports the enabling edges when a hedge blocks the effect (prevents losing the measurement that would fix it)", () => {
    const v = evaluateCausalClaim({ y: ["Y"], x: ["X"], graph: BOW_ARC });
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
    const v = evaluateCausalClaim({ y: ["Y"], x: ["X"], z: ["M"], graph: FRONT_DOOR });
    expect(v.publishable).toBe(true);
    expect(v.formula_class).toContain("CONDITIONAL_");
  });

  it("refuses a conditional intervention on the bow-arc (prevents a RATIO built on an unidentified joint)", () => {
    const v = evaluateCausalClaim({ y: ["Y"], x: ["X"], z: ["M"], graph: BOW_ARC });
    expect(v.publishable).toBe(false);
    expect(v.conclusion).toBe("ASSOCIATION_ONLY");
  });
});

describe("GATE G3: the graph built from a causal edge", () => {
  it("produces a graph whose effect is identified (prevents a self-contradicting gate)", () => {
    const g = graphFromCausalEdge("Scheme", "Outcome");
    const v = evaluateCausalClaim({ y: ["Outcome"], x: ["Scheme"], graph: g });
    expect(v.publishable).toBe(true);
  });

  it("includes an explicitly supplied latent confounder (prevents the graph from hiding a known confounder)", () => {
    const g = graphFromCausalEdge("X", "Y", { bidirected: [["X", "Y"]] });
    const v = evaluateCausalClaim({ y: ["Y"], x: ["X"], graph: g });
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
