import { describe, expect, it } from "vitest";
import {
  cFactorForComponent,
  formatSymbolicFactor,
  FormulaClass,
  getAncestors,
  getMaximalCComponents,
  induceSubgraph,
  isDSeparated,
  isIdentifiable,
  mutilateADMG,
  runShpitserPearlID,
  runShpitserPearlIDC,
  type CausalADMG,
  type HedgeWitness,
  type IDResult,
  type NodeId,
  type SymbolicFactor,
} from "./do-calculus-id";

// ---------------------------------------------------------------------------
// helpers
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

function expectIdentified(result: IDResult): { formula: SymbolicFactor; formulaClass: string } {
  if (!result.ok) {
    throw new Error(
      `expected an identified estimand, got FAIL_HEDGE on ${JSON.stringify(result.hedge)}`,
    );
  }
  return { formula: result.formula, formulaClass: result.formulaClass };
}

function expectHedge(result: IDResult): {
  code: "FAIL_HEDGE";
  hedge: HedgeWitness;
  enablingEdges: ReadonlyArray<readonly [NodeId, NodeId]>;
} {
  if (result.ok) {
    throw new Error(
      `expected FAIL_HEDGE, got ${result.formulaClass}: ${formatSymbolicFactor(result.formula)}`,
    );
  }
  return { code: result.code, hedge: result.hedge, enablingEdges: result.enablingEdges };
}

function asMarginalSum(factor: SymbolicFactor): Extract<SymbolicFactor, { kind: "MARGINAL_SUM" }> {
  if (factor.kind !== "MARGINAL_SUM") {
    throw new Error(`expected MARGINAL_SUM, got ${formatSymbolicFactor(factor)}`);
  }
  return factor;
}

// The three canonical shapes the whole graph layer rests on. If any of these is wrong,
// every IDC rule-2 answer downstream is wrong too.
describe("isDSeparated", () => {
  it("blocks a chain at its middle node (prevents an open-chain d-separation bug that would corrupt IDC rule 2)", () => {
    const chain = graph(["A", "B", "C"], [["A", "B"], ["B", "C"]]);
    expect(isDSeparated(chain, set("A"), set("C"), set("B"))).toBe(true);
    expect(isDSeparated(chain, set("A"), set("C"), set())).toBe(false);
  });

  it("closes a collider when nothing is conditioned and opens it when the collider is conditioned (prevents sign-flipped collider handling)", () => {
    const collider = graph(["A", "B", "C"], [["A", "B"], ["C", "B"]]);
    expect(isDSeparated(collider, set("A"), set("C"), set())).toBe(true);
    expect(isDSeparated(collider, set("A"), set("C"), set("B"))).toBe(false);
  });

  it("keeps a fork open until its common cause is conditioned (prevents treating a shared parent as a blocked path)", () => {
    const fork = graph(["Z", "X", "Y"], [["Z", "X"], ["Z", "Y"]]);
    expect(isDSeparated(fork, set("X"), set("Y"), set())).toBe(false);
    expect(isDSeparated(fork, set("X"), set("Y"), set("Z"))).toBe(true);
  });

  it("keeps a bidirected confounder open (prevents silently moralising away the latent)", () => {
    const confounded = graph(["X", "Y"], [["X", "Y"]], [["X", "Y"]]);
    expect(isDSeparated(confounded, set("X"), set("Y"), set())).toBe(false);
  });
});

describe("getAncestors", () => {
  it("walks directed edges only (prevents a bidirected arc from keeping a node that cannot cause Y, which would turn a null effect into a spurious hedge)", () => {
    const confoundedOnly = graph(["A", "Y"], [], [["A", "Y"]]);
    expect([...getAncestors(confoundedOnly, set("Y"))]).toEqual(["Y"]);
    // ... and the null effect is identified as the plain marginal: line 2 prunes A and
    // line 1 sums it back out, so the estimand is Sum_{A} P(A)P(Y|A) = P(Y), not a hedge.
    const res = expectIdentified(runShpitserPearlID(set("Y"), set("A"), confoundedOnly));
    expect(formatSymbolicFactor(res.formula)).toBe("Sum_{A}[(P(A) * P(Y|A))]");
    expect(res.formulaClass).toBe(FormulaClass.ObservationalMarginal);
    expect(isIdentifiable(set("Y"), set("A"), confoundedOnly)).toBe(true);

    const chain = graph(["A", "B", "C"], [["A", "B"], ["B", "C"]]);
    // membership is the contract; Set iteration order is unspecified
    expect([...getAncestors(chain, set("C"))].sort()).toEqual(["A", "B", "C"]);
  });
});

describe("getMaximalCComponents", () => {
  it("groups by bidirected edges only (prevents treating a DAG as one component, which would make every query a hedge)", () => {
    const directedOnly = graph(["A", "B"], [["A", "B"]]);
    expect(getMaximalCComponents(directedOnly).map((c) => [...c])).toEqual([["A"], ["B"]]);

    const confounded = graph(["A", "B"], [], [["A", "B"]]);
    expect(getMaximalCComponents(confounded).map((c) => [...c])).toEqual([["A", "B"]]);

    const mixed = graph(["A", "B", "C"], [["B", "C"]], [["A", "B"]]);
    expect(getMaximalCComponents(mixed).map((c) => [...c])).toEqual([["A", "B"], ["C"]]);
  });

  it("merges transitively along bidirected paths (prevents a one-hop-only union that would split a real C-component)", () => {
    const chain = graph(["A", "B", "C", "D"], [], [["A", "B"], ["B", "C"]]);
    expect(getMaximalCComponents(chain).map((c) => [...c])).toEqual([["A", "B", "C"], ["D"]]);
  });
});

describe("induceSubgraph / mutilateADMG", () => {
  it("keeps only edges with both endpoints inside the induced set (prevents leaking an edge to a pruned node)", () => {
    const g = graph(["X", "M", "Y"], [["X", "M"], ["M", "Y"]], [["X", "Y"]]);
    const sub = induceSubgraph(g, set("X", "M"));
    expect(sub.nodes).toEqual(["X", "M"]);
    expect(sub.directed).toEqual([["X", "M"]]);
    expect(sub.bidirected).toEqual([]);
  });

  it("cuts arrows into the intervention and arrows out of the conditioning node (prevents leaving back-door edges in place, which makes IDC rule 2 unsound)", () => {
    const g = graph(["X", "M", "Y"], [["X", "M"], ["M", "Y"]], [["X", "Y"]]);

    const intoX = mutilateADMG(g, set("X"));
    expect(intoX.nodes).toEqual(["X", "M", "Y"]);
    expect(intoX.directed).toEqual([["X", "M"], ["M", "Y"]]);
    expect(intoX.bidirected).toEqual([]); // X <-> Y touches the intervention

    const outOfM = mutilateADMG(g, set(), set("M"));
    expect(outOfM.directed).toEqual([["X", "M"]]);
    expect(outOfM.bidirected).toEqual([["X", "Y"]]); // no X in the intervention set

    const both = mutilateADMG(g, set("X"), set("M"));
    expect(both.directed).toEqual([["X", "M"]]);
    expect(both.bidirected).toEqual([]);
  });
});

describe("cFactorForComponent", () => {
  it("conditions each factor on ALL predecessors, not just component members (prevents dropping the kernel conditioning that makes line 7 sound)", () => {
    const g = graph(
      ["W", "Z", "X", "Y"],
      [["W", "Z"], ["Z", "X"], ["X", "Y"]],
      [["W", "X"], ["Z", "Y"]],
    );
    expect(formatSymbolicFactor(cFactorForComponent(g, set("Z", "Y")))).toBe(
      "(P(Z|W) * P(Y|W,Z,X))",
    );
  });

  it("rejects a set that is not a maximal C-component (prevents emitting a factor that is not a c-factor)", () => {
    const g = graph(["X", "M", "Y"], [["X", "M"], ["M", "Y"]], [["X", "Y"]]);
    expect(() => cFactorForComponent(g, set("X"))).toThrow(/not a maximal C-component/);
  });
});

describe("runShpitserPearlID", () => {
  it("line 1 marginalises V\\Y instead of returning the joint (prevents the joint being passed off as P(y))", () => {
    const g = graph(["A", "Y"], [["A", "Y"]]);
    const res = expectIdentified(runShpitserPearlID(set("Y"), set(), g));
    expect(res.formulaClass).toBe(FormulaClass.ObservationalMarginal);
    const marginal = asMarginalSum(res.formula);
    expect(marginal.sumOut).toEqual(["A"]);
    expect(formatSymbolicFactor(res.formula)).toBe("Sum_{A}[(P(A) * P(Y|A))]");

    // A single-node graph has nothing to sum out: the marginal is just P(y).
    const solo = graph(["Y"]);
    const soloRes = expectIdentified(runShpitserPearlID(set("Y"), set(), solo));
    expect(soloRes.formula).toEqual({ kind: "OBSERVATIONAL_COND", target: "Y", given: [] });
    expect(soloRes.formulaClass).toBe(FormulaClass.ObservationalMarginal);
  });

  it("returns a back-door c-factor, not a hedge, on a plain DAG (prevents a false hedge that would disable every adjustment query)", () => {
    const g = graph(["X", "Y"], [["X", "Y"]]);
    const res = expectIdentified(runShpitserPearlID(set("Y"), set("X"), g));
    expect(res.formulaClass).toBe(FormulaClass.BackDoorOrDirectCFactor);
    expect(formatSymbolicFactor(res.formula)).toBe("P(Y|X)");
    expect(isIdentifiable(set("Y"), set("X"), g)).toBe(true);
  });

  it("fails the confounded bow-arc with a hedge whose sub-forest is {Y} (prevents reporting an unidentifiable effect as a formula)", () => {
    const g = graph(["X", "Y"], [["X", "Y"]], [["X", "Y"]]);
    const res = expectHedge(runShpitserPearlID(set("Y"), set("X"), g));
    expect(res.code).toBe("FAIL_HEDGE");
    expect([...res.hedge.forestFull]).toEqual(["X", "Y"]);
    expect([...res.hedge.forestSub]).toEqual(["Y"]);
    expect(isIdentifiable(set("Y"), set("X"), g)).toBe(false);
  });

  it("identifies the front-door graph by C-component factorisation (prevents calling a valid front-door analysis a hedge)", () => {
    const g = graph(["X", "M", "Y"], [["X", "M"], ["M", "Y"]], [["X", "Y"]]);
    const res = expectIdentified(runShpitserPearlID(set("Y"), set("X"), g));
    expect(res.formulaClass).toBe(FormulaClass.CComponentFactorization);
    const text = formatSymbolicFactor(res.formula);
    // sum_m P(m|x) * sum_x' P(x') P(y|x',m)
    expect(text).toBe("Sum_{M}[(P(M|X) * Sum_{X}[(P(X) * P(Y|X,M))])]");
  });

  it("identifies the Tian-Pearl 4-node case through the line-7 c-factor reduction (prevents collapsing it to a bare observational marginal)", () => {
    const g = graph(
      ["W", "Z", "X", "Y"],
      [["W", "Z"], ["Z", "X"], ["X", "Y"]],
      [["W", "X"], ["Z", "Y"]],
    );
    const res = expectIdentified(runShpitserPearlID(set("Y"), set("X"), g));
    expect(res.formulaClass).toBe(FormulaClass.TianCFactorRatio);
    expect(formatSymbolicFactor(res.formula)).toBe("Sum_{Z}[(P(Z|W) * P(Y|W,Z,X))]");
  });

  it("fails the published Example 4.4 graph from inside a pruned sub-model (prevents a hedge witness being lost when the unidentifiability lives below the top-level call)", () => {
    // causaleffect paper, Example 4.4: X -> Z -> W -> Y with X confounded with Z and W.
    // ID(Y,{X}) factorises over {Z},{W},{Y}; the Z factor is the bow-arc X -> Z with
    // X <-> Z in G[X,Z], so (G[X,Z], G[Z]) is a hedge for a subset of the query. The paper
    // reaches the sibling W factor first because it walks the product in the order
    // Y, W, Z; we walk C-components in topological order, so we stop at Z. Either witness
    // proves the query unidentified — what matters is that the witness comes from the
    // sub-model where the offending C-component actually lives.
    const g = graph(
      ["X", "Z", "W", "Y"],
      [["X", "Z"], ["Z", "W"], ["W", "Y"]],
      [["X", "Z"], ["X", "W"]],
    );
    const res = expectHedge(runShpitserPearlID(set("Y"), set("X"), g));
    expect([...res.hedge.forestFull]).toEqual(["X", "Z"]);
    expect([...res.hedge.forestSub]).toEqual(["Z"]);
    expect(res.enablingEdges).toEqual([["X", "Z"]]);
    expect(isIdentifiable(set("Y"), set("X"), g)).toBe(false);
  });

  it("rejects a graph whose node order is not topological (prevents ancestor walks on a malformed graph)", () => {
    const backwards = graph(["Y", "X"], [["X", "Y"]]);
    expect(() => runShpitserPearlID(set("Y"), set("X"), backwards)).toThrow(/topological order/);
  });

  it("rejects a query that intervenes on its own outcome (prevents a nonsensical P(x|do(x)) query)", () => {
    const g = graph(["X", "Y"], [["X", "Y"]]);
    expect(() => runShpitserPearlID(set("X", "Y"), set("X"), g)).toThrow(
      /both an outcome and an intervention/,
    );
  });
});

describe("findIDEnablingEdgesForHedge", () => {
  it("reports directed edges inside the forest, never edges a mediator could not break (prevents bogus HCID suggestions)", () => {
    const g = graph(["X", "Y"], [["X", "Y"]], [["X", "Y"]]);
    const res = expectHedge(runShpitserPearlID(set("Y"), set("X"), g));
    const full = new Set(res.hedge.forestFull);
    expect(res.enablingEdges.length).toBeGreaterThan(0);
    for (const [u, v] of res.enablingEdges) {
      expect(full.has(u)).toBe(true);
      expect(full.has(v)).toBe(true);
      expect(g.directed.some(([a, b]) => a === u && b === v)).toBe(true);
    }
    expect(res.enablingEdges).toEqual([["X", "Y"]]);
  });
});

describe("exhaustive small-graph invariant", () => {
  it("identifies every query on every 4-node DAG (prevents any false hedge on an acyclic graph, where the g-formula always exists)", () => {
    const nodes = ["A", "B", "C", "D"] as const;
    const candidates: Array<readonly [NodeId, NodeId]> = [];
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const u = nodes[i];
        const v = nodes[j];
        if (u !== undefined && v !== undefined) candidates.push([u, v]);
      }
    }

    let checked = 0;
    for (let edgeMask = 0; edgeMask < 1 << candidates.length; edgeMask += 1) {
      const directed = candidates.filter((_, bit) => (edgeMask & (1 << bit)) !== 0);
      const g = graph(nodes, directed);
      for (let yMask = 1; yMask < 1 << nodes.length; yMask += 1) {
        for (let xMask = 0; xMask < 1 << nodes.length; xMask += 1) {
          const y = new Set<NodeId>();
          const x = new Set<NodeId>();
          nodes.forEach((n, i) => {
            if ((yMask & (1 << i)) !== 0) y.add(n);
            if ((xMask & (1 << i)) !== 0) x.add(n);
          });
          let overlaps = false;
          for (const n of y) if (x.has(n)) overlaps = true;
          if (overlaps) continue;

          const res = runShpitserPearlID(y, x, g);
          if (!res.ok) {
            throw new Error(
              `false hedge for y=${[...y].join(",")} x=${[...x].join(",")} on ${JSON.stringify(directed)}`,
            );
          }
          expect(res.formula.kind.length).toBeGreaterThan(0);
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });
});

describe("vertex-order invariance", () => {
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

  it("returns the same verdict under every valid re-ordering of the vertex list (prevents node-index bugs in the chain-rule conditionals from changing identifiability)", () => {
    const cases: ReadonlyArray<{ readonly g: CausalADMG; readonly identified: boolean }> = [
      {
        // identifiable: A and X are incomparable, so either order is topological.
        // ID gives the back-door adjustment Sum_{A} P(A)P(Y|A,X).
        g: graph(["A", "X", "Y"], [["A", "Y"], ["X", "Y"]], [["A", "X"]]),
        identified: true,
      },
      {
        // unidentifiable: the bow-arc plus an isolated vertex, whose position in the
        // order (and so the pruning at line 2) must not change the verdict.
        g: graph(["W", "X", "Y"], [["X", "Y"]], [["X", "Y"]]),
        identified: false,
      },
    ];

    for (const { g, identified } of cases) {
      let validOrders = 0;
      for (const order of permutations(g.nodes)) {
        const reordered: CausalADMG = { ...g, nodes: order };
        if (!isTopological(reordered)) continue;
        validOrders += 1;
        const res = runShpitserPearlID(set("Y"), set("X"), reordered);
        expect(res.ok, `verdict changed for order ${order.join(",")}`).toBe(identified);
      }
      expect(validOrders).toBeGreaterThan(1);
    }
  });
});

describe("runShpitserPearlIDC", () => {
  it("identifies P(Y|do(X),M) on the front-door graph and keeps the CONDITIONAL_ class (prevents dropping the conditioning from the label)", () => {
    const g = graph(["X", "M", "Y"], [["X", "M"], ["M", "Y"]], [["X", "Y"]]);
    const res = expectIdentified(runShpitserPearlIDC(set("Y"), set("X"), set("M"), g));
    expect(res.formulaClass.startsWith("CONDITIONAL_")).toBe(true);
    // Rule 2 fires here (Y is d-separated from M given X once M's outgoing edges are cut),
    // so M moves into the action set and the answer is the interventional kernel in m.
    expect(formatSymbolicFactor(res.formula)).toBe("Sum_{X}[(P(X) * P(Y|X,M))]");
  });

  it("refuses the conditional intervention on the bow-arc (prevents a RATIO built on an unidentified joint)", () => {
    const g = graph(["X", "Y"], [["X", "Y"]], [["X", "Y"]]);
    const res = expectHedge(runShpitserPearlIDC(set("Y"), set("X"), set("Y"), g));
    expect(res.code).toBe("FAIL_HEDGE");
    expect([...res.hedge.forestSub]).toEqual(["Y"]);
  });

  it("normalises by the marginal of the SAME joint when rule 2 does not apply (prevents an unnormalised joint posing as a conditional)", () => {
    // X -> Y with Z <-> Y: Z is not a descendant of X, but the latent Z <-> Y keeps Y and Z
    // d-connected after mutilation, so rule 2 cannot exchange Z for do(Z). The joint
    // P(z,y|do(x)) is still identifiable as the c-factor of {Z,Y}, and only a ratio turns it
    // back into P(y|do(x),z).
    const g = graph(["X", "Z", "Y"], [["X", "Y"]], [["Z", "Y"]]);
    const res = expectIdentified(runShpitserPearlIDC(set("Y"), set("X"), set("Z"), g));
    expect(res.formulaClass.startsWith("CONDITIONAL_")).toBe(true);
    const ratio = res.formula;
    expect(ratio.kind).toBe("RATIO");
    if (ratio.kind !== "RATIO") return;
    const denominator = asMarginalSum(ratio.denominator);
    expect(denominator.sumOut).toEqual(["Y"]);
    expect(denominator.body).toEqual(ratio.numerator);
  });

  it("falls back to ID when there is nothing to condition on (prevents a spurious RATIO)", () => {
    const g = graph(["X", "M", "Y"], [["X", "M"], ["M", "Y"]], [["X", "Y"]]);
    expect(runShpitserPearlIDC(set("Y"), set("X"), set(), g)).toEqual(
      runShpitserPearlID(set("Y"), set("X"), g),
    );
  });
});
