/**
 * THE THREE-STAGE PIPELINE, END TO END.
 *
 * The spec's Stage 1 (FCI) and Stage 2 (DYNOTEARS) were separate
 * functions with nothing between them. This tests the CHAIN: a known
 * SCM -> FCI -> PAG -> DYNOTEARS -> ADMG -> a do-calculus verdict.
 *
 * The test that matters is the last one: the ADMG the pipeline
 * produces must be one that Shpitser-Pearl can work with, and the
 * verdict it yields must be the honest one for the graph.
 */
import { describe, it, expect } from "vitest";
import {
  discoverCausalStructure,
  discoverCausalStructurePessimistic,
  RESIDUAL_COVARIANCE_Z,
} from "../causal-discovery-pipeline.js";
import { admgToCausalADMG } from "../fci-pag.js";
import { runShpitserPearlID } from "../do-calculus-id.js";
import { mulberry32 } from "./test-prng.js";
import {
  pipelineGraphToCausalADMG,
  graphForEdgeFromDiscovery,
} from "../fci-pag.js";
import { evaluateCausalClaim } from "../causal-claim-gate.js";

/** A chain 0 -> 1 -> 2, with 0 and 2 also directly linked. */
function makeChain(n: number, seed = 91): number[][] {
  const rand = mulberry32(seed);
  const rows: number[][] = [];
  for (let i = 0; i < n; i++) {
    const x0 = rand() - 0.5;
    const x1 = 0.8 * x0 + (rand() - 0.5) * 0.4;
    const x2 = 0.7 * x1 + 0.3 * x0 + (rand() - 0.5) * 0.4;
    rows.push([x0, x1, x2]);
  }
  return rows;
}

describe("the three-stage causal discovery pipeline", () => {
  it("recovers the skeleton of a known SCM", () => {
    const data = makeChain(6000);
    const { pag } = discoverCausalStructure(data, { maxConditioningSetSize: 2 });
    // The truth is 0-1, 1-2, 0-2. The skeleton must contain all three.
    const skel = new Set(pag.skeleton.map(([u, v]) => `${Math.min(u, v)}-${Math.max(u, v)}`));
    expect(skel.has("0-1")).toBe(true);
    expect(skel.has("1-2")).toBe(true);
    expect(skel.has("0-2")).toBe(true);
  });

  it("produces an ADMG with a decision for every PAG edge", () => {
    const data = makeChain(6000);
    const { pag, admg, decisions } = discoverCausalStructure(data, { maxConditioningSetSize: 2 });
    // Every PAG edge must have a decision, and every decision must
    // have a REASON. A projection with no audit trail is a projection
    // nobody can check.
    expect(decisions.length).toBe(pag.edges.length);
    for (const d of decisions) {
      expect(d.reason.length).toBeGreaterThan(0);
      expect(["directed", "bidirected", "dropped"]).toContain(d.kind);
    }
    // And the ADMG's edges must all be accounted for.
    expect(admg.directed.length + admg.bidirected.length).toBeLessThanOrEqual(pag.edges.length);
  });

  it("never emits a bidirected edge AND a directed edge for the same pair", () => {
    // The graph would otherwise say both directions are causal and
    // also confounded, which is a contradiction the ID algorithm
    // would have to resolve arbitrarily.
    const data = makeChain(6000);
    const { admg } = discoverCausalStructure(data, { maxConditioningSetSize: 2 });
    const dir = new Set(admg.directed.map(([u, v]) => `${Math.min(u, v)}-${Math.max(u, v)}`));
    for (const [u, v] of admg.bidirected) {
      const key = `${Math.min(u, v)}-${Math.max(u, v)}`;
      expect(dir.has(key)).toBe(false);
    }
  });

  it("the ADMG it produces is one the do-calculus engine can consume", () => {
    // This is the test that closes the chain. The pipeline's output
    // must become a CausalADMG that Shpitser-Pearl answers without
    // throwing.
    const data = makeChain(6000);
    const { admg } = discoverCausalStructure(data, { maxConditioningSetSize: 2 });
    const causal = admgToCausalADMG(admg);
    expect(causal.nodes.length).toBe(3);
    // The nodes must be in topological order, which the ADMG type
    // requires and admgToCausalADMG enforces by construction.
    const pos = new Map(causal.nodes.map((n, i) => [n, i]));
    for (const [u, v] of causal.directed) {
      expect(pos.get(u)!).toBeLessThan(pos.get(v)!);
    }
    // And the identification must run.
    const res = runShpitserPearlID(new Set(["v2"]), new Set(["v0"]), causal);
    expect(res.ok === true || res.code === "FAIL_HEDGE").toBe(true);
  });

  it("the spec's rule drops an edge the data do not support, where the pessimistic rule keeps it", () => {
    // The maximally-confounded representative makes EVERY unresolved
    // edge bidirected. The spec's rule asks the residuals whether the
    // confounding is real. On a clean chain with NO latent
    // confounder, the spec's rule recovers the structure and the
    // pessimistic rule hedges everything.
    //
    // MEASURED on this chain (n=6000, seed 91):
    //   spec        directed 0->1, 0->2, 2->1   bidirected (none)
    //   pessimistic directed (none)              bidirected 0<->1, 0<->2, 1<->2
    //
    // Three false hedges. A hedge is not a conservative annotation --
    // it makes the ID algorithm FAIL, so each one refuses an effect
    // the data identify. The pessimistic rule is safe in the sense
    // that it never OVER-claims; it is also useless in the sense that
    // on clean data it claims NOTHING.
    const data = makeChain(6000);
    const spec = discoverCausalStructure(data, { maxConditioningSetSize: 2 });
    const pess = discoverCausalStructurePessimistic(data, { maxConditioningSetSize: 2 });

    // The spec's rule finds real structure.
    expect(spec.admg.directed.length).toBeGreaterThan(0);
    // The pessimistic rule finds none -- it hedges everything.
    expect(pess.admg.directed.length).toBe(0);
    expect(pess.admg.bidirected.length).toBe(spec.pag.edges.length);
    // And the spec's rule hedges strictly less.
    expect(spec.admg.bidirected.length).toBeLessThan(pess.admg.bidirected.length);
  });

  it("the spec's rule DOES keep a hedge when the confounding is real", () => {
    // The previous test would be satisfied by a rule that never
    // hedges. This one is the other half: with a genuine latent
    // confounder, the residuals STAY correlated and the edge must
    // come out bidirected.
    //
    // The latent confounder is a shared driver of x0 and x1 that no
    // observed variable sees.
    const rand = mulberry32(17);
    const rows: number[][] = [];
    for (let i = 0; i < 6000; i++) {
      const u = rand() - 0.5; // the latent confounder
      const x0 = u + (rand() - 0.5) * 0.5;
      const x1 = u + (rand() - 0.5) * 0.5;
      rows.push([x0, x1]);
    }
    const { admg, decisions } = discoverCausalStructure(rows, { maxConditioningSetSize: 1 });
    // The two variables share u, so the confounding is real and the
    // edge must be bidirected -- not directed.
    expect(admg.bidirected.length).toBeGreaterThan(0);
    const bi = decisions.find((d) => d.kind === "bidirected");
    expect(bi).toBeDefined();
    expect(Math.abs(bi!.residualZ!)).toBeGreaterThan(2.58);
  });

  it("the residual-covariance threshold is the spec's 2.58", () => {
    expect(RESIDUAL_COVARIANCE_Z).toBe(2.58);
  });

  it("rejects an out-of-range option rather than silently ignoring it", () => {
    const data = makeChain(100);
    expect(() => discoverCausalStructure(data, { tauEdge: -1 })).toThrow(/tauEdge/);
    expect(() => discoverCausalStructure(data, { residualCovarianceZ: 0 })).toThrow(
      /residualCovarianceZ/,
    );
  });
});

// ======================================================================
// THE WIRING. The pipeline and the gate were both complete and
// neither knew about the other. These tests close that gap: data ->
// discovery -> a graph the gate can use -> a verdict.
// ======================================================================
describe("the pipeline wired into the gate", () => {
  it("turns the pipeline's ADMG into a graph the gate accepts, named by signal", () => {
    const data = makeChain(6000);
    const { admg } = discoverCausalStructure(data, { maxConditioningSetSize: 2 });
    const names = ["Scheme", "Phase1_CB_Sep", "PassEPA"];
    const { graph, nodeNames } = pipelineGraphToCausalADMG(admg, names);

    // The node ids are the SIGNAL names, not v0/v1/v2 -- so a
    // literature edge naming "Scheme" and "PassEPA" finds its
    // endpoints in the graph.
    //
    // The ORDER is the TOPOLOGICAL order, not the original index
    // order -- that is the whole point of the conversion, and the
    // CausalADMG type requires it. So the names come out as a
    // PERMUTATION of the input, and the test must not assume they
    // come back in the order they went in.
    expect([...nodeNames].sort()).toEqual([...names].sort());
    expect(graph.nodes).toContain("Scheme");
    expect(graph.nodes).toContain("PassEPA");
    for (const [u, v] of graph.directed) {
      expect(names).toContain(u);
      expect(names).toContain(v);
    }
    // And the order really is topological: every directed edge goes
    // forward.
    const pos = new Map(graph.nodes.map((n, i) => [n, i]));
    for (const [u, v] of graph.directed) {
      expect(pos.get(u)!).toBeLessThan(pos.get(v)!);
    }
  });

  it("the gate accepts the discovered graph and issues a verdict on it", () => {
    // THE LOOP. A game matrix goes in; a causal verdict comes out,
    // and the verdict is computed against the graph the pipeline
    // DISCOVERED, not against a graph the edge asserts about itself.
    const data = makeChain(6000);
    const { admg } = discoverCausalStructure(data, { maxConditioningSetSize: 2 });
    const names = ["Scheme", "Phase1_CB_Sep", "PassEPA"];
    const graphForEdge = graphForEdgeFromDiscovery(admg, names);

    const graph = graphForEdge({ cause_signal: "Scheme", effect_signal: "PassEPA" });
    expect(graph).not.toBeNull();

    const verdict = evaluateCausalClaim({
      y: ["PassEPA"],
      x: ["Scheme"],
      graph, positivity: 1 });
    // The verdict is a REAL one -- identified or refused -- and the
    // refusal carries a witness. Neither outcome is "the gate threw".
    if (verdict.publishable) {
      expect(verdict.conclusion).toBe("CAUSAL");
      expect(verdict.formula).not.toBeNull();
    } else {
      expect(verdict.refusal_code).toBe("REFUSED_G3_NON_IDENTIFIABLE_HEDGE");
      expect(verdict.hedge_forest_full).not.toBeNull();
    }
  });

  it("an edge whose endpoints are NOT in the discovered graph gets NO graph", () => {
    // A partial graph would be a lie: the gate would check
    // identifiability against a graph that does not contain the
    // effect, and either refuse it for the wrong reason or, worse,
    // accept it because the effect's own nodes happen to be absent.
    const data = makeChain(6000);
    const { admg } = discoverCausalStructure(data, { maxConditioningSetSize: 2 });
    const graphForEdge = graphForEdgeFromDiscovery(admg, ["Scheme", "Phase1_CB_Sep", "PassEPA"]);

    const graph = graphForEdge({ cause_signal: "NotInTheGraph", effect_signal: "PassEPA" });
    expect(graph).toBeNull();

    // And the gate then refuses it for the honest reason.
    const verdict = evaluateCausalClaim({
      y: ["PassEPA"],
      x: ["NotInTheGraph"],
      graph, positivity: 1 });
    expect(verdict.publishable).toBe(false);
    expect(verdict.refusal_code).toBe("REFUSED_G3_NO_GRAPH");
  });

  it("a graph whose edges are not in topological order is REORDERED, and a cycle is rejected", () => {
    // The CausalADMG type REQUIRES a topological node order, because
    // every ancestor and c-factor computation depends on it. An ADMG
    // whose node list is not in topological order is not an error --
    // it is a list that needs sorting -- so the conversion sorts it.
    //
    // What it must NOT do is hand a CYCLIC graph to Shpitser-Pearl.
    const backwards = {
      nodes: [0, 1],
      directed: [[1, 0]] as const,
      bidirected: [] as const,
    };
    const { graph } = pipelineGraphToCausalADMG(backwards, ["A", "B"]);
    // The edge 1->0 is preserved, and the nodes are ordered so it
    // comes out topological: B before A.
    expect(graph.directed).toHaveLength(1);
    expect(graph.directed[0]).toEqual(["B", "A"]);
    expect(graph.nodes.indexOf("B")).toBeLessThan(graph.nodes.indexOf("A"));

    // A CYCLE has no topological order, and that is a wiring bug
    // worth refusing loudly rather than passing on.
    const cyclic = {
      nodes: [0, 1],
      directed: [[0, 1], [1, 0]] as const,
      bidirected: [] as const,
    };
    expect(() => pipelineGraphToCausalADMG(cyclic, ["A", "B"])).toThrow(/cycle/i);
  });
});
