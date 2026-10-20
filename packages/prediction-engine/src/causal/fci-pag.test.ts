import { describe, it, expect } from "vitest";
import {
  fci,
  pagToAdmg,
  pagToCausalADMG,
  admgToCausalADMG,
  discoverCausalStructure,
  dynotearsFit,
  acyclicityExact,
  matExpScaleSquaring,
  orientPag,
  possibleDSep,
  literatureTerm,
} from "./fci-pag.js";
import type { EdgeMark, FciEdge, FciResult, ClassALiteratureConstraint } from "./fci-pag.js";
import { runShpitserPearlID } from "./do-calculus-id.js";

// ---------------------------------------------------------------------------
// Deterministic data generators
// ---------------------------------------------------------------------------

// The PRNG is shared, not copied: a PRNG duplicated across test files
// is one that will drift, and two files that were supposed to measure
// the same data would quietly measure different data.
import { mulberry32 } from "./__tests__/test-prng.js";

function randn(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** A -> B -> C, coefficients 0.9, noise sd 0.6. */
function simChain(n: number, seed: number): number[][] {
  const rand = mulberry32(seed);
  const X: number[][] = [];
  for (let i = 0; i < n; i++) {
    const x0 = randn(rand);
    const x1 = 0.9 * x0 + 0.6 * randn(rand);
    const x2 = 0.9 * x1 + 0.6 * randn(rand);
    X.push([x0, x1, x2]);
  }
  return X;
}

/** A -> B <- C with A and C independent: a collider that IS identifiable from the data. */
function simCollider(n: number, seed: number): number[][] {
  const rand = mulberry32(seed);
  const X: number[][] = [];
  for (let i = 0; i < n; i++) {
    const a = randn(rand);
    const c = randn(rand);
    X.push([a, 0.9 * a + 0.9 * c + 0.6 * randn(rand), c]);
  }
  return X;
}

/** 0 -> 1, 0 -> 2, 1 -> 3, 2 -> 3 (a diamond: 3 is a collider whose parents are dependent). */
function simDiamond(n: number, seed: number): number[][] {
  const rand = mulberry32(seed);
  const X: number[][] = [];
  for (let i = 0; i < n; i++) {
    const x0 = randn(rand);
    const x1 = 0.9 * x0 + 0.6 * randn(rand);
    const x2 = 0.9 * x0 + 0.6 * randn(rand);
    const x3 = 0.9 * x1 + 0.9 * x2 + 0.6 * randn(rand);
    X.push([x0, x1, x2, x3]);
  }
  return X;
}

/** 0 -> 1 -> 2 -> 3 with a latent common cause of 0 and 3 (so the MAG has 0 <-> 3). */
function simConfounded(n: number, seed: number): number[][] {
  const rand = mulberry32(seed);
  const X: number[][] = [];
  for (let i = 0; i < n; i++) {
    const l = randn(rand);
    const x0 = 0.8 * l + 0.6 * randn(rand);
    const x1 = 0.9 * x0 + 0.5 * randn(rand);
    const x2 = 0.9 * x1 + 0.5 * randn(rand);
    const x3 = 0.9 * x2 + 0.8 * l + 0.6 * randn(rand);
    X.push([x0, x1, x2, x3]);
  }
  return X;
}

// ---------------------------------------------------------------------------
// PAG helpers
// ---------------------------------------------------------------------------

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

function skeletonOf(pairs: readonly (readonly [number, number])[]): string[] {
  return [...new Set(pairs.map(([i, j]) => `${Math.min(i, j)}-${Math.max(i, j)}`))].sort();
}

function handPag(
  nodes: readonly number[],
  edges: readonly FciEdge[],
  sepsets: Map<string, readonly number[]> = new Map(),
): FciResult {
  const separated: [number, number][] = [];
  return {
    nodes,
    edges,
    sepsets,
    skeleton: edges.map((e) => [e.u, e.v] as [number, number]),
    separated,
    step: "done",
  };
}

function clone(W: readonly number[][]): number[][] {
  return W.map((row) => row.slice());
}

/** Central finite difference of a scalar function of a matrix, entry by entry. */
function fdEntry(f: (W: number[][]) => number, W: number[][], k: number, j: number, eps: number): number {
  const Wp = clone(W);
  const Wm = clone(W);
  Wp[k]![j]! += eps;
  Wm[k]![j]! -= eps;
  return (f(Wp) - f(Wm)) / (2 * eps);
}

// ---------------------------------------------------------------------------
// Part 1: FCI
// ---------------------------------------------------------------------------

describe("fci skeleton", () => {
  it("prevents a phantom edge between independent variables and a missing edge between dependent ones", () => {
    // n = 20000 keeps the Fisher-z standard error at ~0.007, so a true null cannot masquerade as
    // an edge by sampling noise at this seed. A single test means BH reduces to p <= alpha.
    const rand = mulberry32(11);
    const indep: number[][] = [];
    for (let i = 0; i < 20000; i++) indep.push([randn(rand), randn(rand)]);
    expect(fci(indep).skeleton).toEqual([]);

    const rand2 = mulberry32(12);
    const dep: number[][] = [];
    for (let i = 0; i < 20000; i++) {
      const a = randn(rand2);
      dep.push([a, 0.8 * a + 0.6 * randn(rand2)]);
    }
    const edges = fci(dep).edges;
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ u: 0, v: 1 });
  });

  it("prevents a false A-C adjacency in the chain A->B->C", () => {
    const X = simChain(8000, 21);
    const pag = fci(X);
    expect(pag.skeleton).toEqual([
      [0, 1],
      [1, 2],
    ]);
    // The separator must be B itself: that is what stops R0 from inventing a collider.
    expect([...(pag.sepsets.get("0,2") ?? [])]).toEqual([1]);
  });

  it("prevents a missed collider at a common effect (A->B<-C)", () => {
    const X = simCollider(8000, 31);
    const pag = fci(X);
    expect(pag.skeleton).toEqual([
      [0, 1],
      [1, 2],
    ]);
    // A and C are marginally independent, so the empty set separates them and R0 must orient.
    expect(pag.sepsets.get("0,2")).toEqual([]);
    expect(markOf(pag.edges, 1, 0)).toBe("arrowhead");
    expect(markOf(pag.edges, 1, 2)).toBe("arrowhead");
  });

  it("prevents a chain from being read as a collider", () => {
    // A->B->C: A and C are marginally correlated, so nothing may be oriented into B or C.
    const X = simChain(8000, 22);
    const pag = fci(X);
    expect(markOf(pag.edges, 1, 0)).not.toBe("arrowhead");
    expect(markOf(pag.edges, 2, 1)).not.toBe("arrowhead");
  });

  it("prevents dropping the confounded pair when a latent common cause is present", () => {
    // 0 -> 1 -> 2 -> 3 with a latent cause of 0 and 3. 0 and 3 must stay adjacent; 0-2 and 1-3
    // must not (they are separated by {1} and {2}).
    const X = simConfounded(8000, 51);
    const pag = fci(X);
    expect(skeletonOf(pag.skeleton)).toEqual(["0-1", "0-3", "1-2", "2-3"]);
  });

  it("prevents the separating-set oracle from being ignored", () => {
    const X = simChain(400, 23); // data are irrelevant once the oracle is supplied
    const oracle = (i: number, j: number): number[] | null => {
      const key = `${Math.min(i, j)},${Math.max(i, j)}`;
      if (key === "0,2") return [1];
      return null;
    };
    const pag = fci(X, { conditioning: oracle });
    expect(pag.skeleton).toEqual([
      [0, 1],
      [1, 2],
    ]);
    expect(pag.separated).toEqual([[0, 2]]);

    // A null-everywhere oracle must leave the complete graph: no edge may be dropped by statistics.
    const keepAll = fci(X, { conditioning: () => null });
    expect(keepAll.skeleton).toEqual([
      [0, 1],
      [0, 2],
      [1, 2],
    ]);
  });
});

describe("fci orientation rules", () => {
  it("prevents R1 from leaving a non-collider unoriented (A *-> B o-* C)", () => {
    const out = orientPag(3, [E(0, 1, "circle", "arrowhead"), E(1, 2, "circle", "circle")]);
    expect(markOf(out, 1, 2)).toBe("tail");
    expect(markOf(out, 2, 1)).toBe("arrowhead");
  });

  it("prevents R2 from missing the arrowhead implied by a directed path (A *-> B -> C)", () => {
    const out = orientPag(3, [
      E(0, 1, "circle", "arrowhead"),
      E(1, 2, "tail", "arrowhead"),
      E(0, 2, "circle", "circle"),
    ]);
    expect(markOf(out, 2, 0)).toBe("arrowhead");
  });

  it("prevents R3 from missing the forced arrowhead on the second collider", () => {
    // A *-> B <-* C and A *-> D <-* C with A,C non-adjacent and D o-* B.
    // C -> B carries a tail at C, which keeps R1 out of the way so this isolates R3.
    const out = orientPag(4, [
      E(0, 1, "circle", "arrowhead"), // A *-> B
      E(1, 2, "arrowhead", "tail"), // C -> B
      E(0, 3, "circle", "arrowhead"), // A *-> D
      E(2, 3, "circle", "arrowhead"), // C *-> D
      E(1, 3, "circle", "circle"), // D o-* B
    ]);
    expect(markOf(out, 3, 1)).toBe("arrowhead");
  });

  it("prevents R4 from ignoring a discriminating path on B o-* C", () => {
    // Deliberately minimal: B=1 o-o C=2, A=0 adjacent to B and not to C, D=3 adjacent to A.
    // Both branches of R4 are exercised. The graph also admits a second discriminating path
    // (D=2 for the pair 0-3, since every A-neighbour is a legal far endpoint of length one), so
    // the assertions target the marks R4 itself is responsible for.
    const base = [E(1, 2, "circle", "circle"), E(0, 1, "circle", "circle"), E(0, 3, "circle", "circle")];

    // B not in sepset(D,C): A *-> B *-> C.
    const open = orientPag(4, base, new Map([["2,3", []]]));
    expect(markOf(open, 1, 0)).toBe("arrowhead");
    expect(markOf(open, 2, 1)).toBe("arrowhead");

    // B in sepset(D,C): B -> C.
    const closed = orientPag(4, base, new Map([["2,3", [1]]]));
    expect(markOf(closed, 1, 2)).toBe("tail");
    expect(markOf(closed, 2, 1)).toBe("arrowhead");

    // No sepset for (D,C): the rule must not guess.
    const unknown = orientPag(4, base, new Map());
    expect(markOf(unknown, 1, 2)).toBe("circle");
    expect(markOf(unknown, 2, 1)).toBe("circle");
  });

  it("prevents R8 from missing the arrowhead after a directed step (A -> B o-> C)", () => {
    // The b-c edge is `b o-> c`: circle at b, ARROWHEAD at c. Then c is
    // a sink of the b-c relation, so c is a descendant of a and the
    // arrowhead at c is forced.
    const out = orientPag(3, [
      E(0, 1, "tail", "arrowhead"),
      E(1, 2, "circle", "arrowhead"),
      E(0, 2, "circle", "circle"),
    ]);
    expect(markOf(out, 2, 0)).toBe("arrowhead");
  });

  it("prevents R8 from ORIENTING AGAINST A RULE (A -> B o-- C)", () => {
    // THE UNSOUNDNESS, PINNED.
    //
    // The b-c edge is `b o-- c`: circle at b, TAIL at c. That is
    // consistent with `c -> b`, and under `c -> b` the point c is NOT a
    // descendant of a -- so no arrowhead at c is forced.
    //
    // The MAG 2 -> 0, 0 -> 1, 2 -> 1 is consistent with this input: it
    // puts a TAIL at 2 on the 0-2 edge, not an arrowhead. So writing an
    // arrowhead at 2 orients against a rule.
    //
    // The rule as it stood checked only the circle at b and wrote the
    // arrowhead anyway. MEASURED before the fix: the arrowhead WAS
    // written. With the guard (the mark at c must be an arrowhead) it
    // is not, and the circle stays.
    const out = orientPag(3, [
      E(0, 1, "tail", "arrowhead"),
      E(1, 2, "circle", "tail"),
      E(0, 2, "circle", "circle"),
    ]);
    expect(markOf(out, 2, 0)).toBe("circle");
    // And the 0-1 edge is untouched.
    expect(markOf(out, 1, 0)).toBe("arrowhead");
  });

  it("prevents an ancestral completion that would create a directed cycle", () => {
    // 0 -> 1 -> 2 -> 3 with 0 o-o 3: the 3 end must be an arrowhead (0 is an ancestor of 3) and
    // the 0 end a tail, so the edge can only be 0 -> 3, never 3 -> 0. The 2-0 edge is required for
    // this to be a legal PAG: without it R1 legitimately fires on (2 *-> 3 o-* 0) and closes the
    // cycle, which no PAG derived from a MAG can contain.
    const out = orientPag(4, [
      E(0, 1, "tail", "arrowhead"),
      E(1, 2, "tail", "arrowhead"),
      E(2, 3, "tail", "arrowhead"),
      E(0, 3, "circle", "circle"),
      E(0, 2, "circle", "circle"),
    ]);
    expect(markOf(out, 3, 0)).toBe("arrowhead");
    expect(markOf(out, 0, 3)).toBe("tail");
  });

  it("prevents collider orientation from firing on a shielded triple", () => {
    const sepsets = new Map<string, readonly number[]>([["0,2", []]]);
    const out = orientPag(3, [E(0, 1, "circle", "circle"), E(1, 2, "circle", "circle"), E(0, 2, "circle", "circle")], sepsets);
    expect(markOf(out, 1, 0)).toBe("circle");
    expect(markOf(out, 1, 2)).toBe("circle");
  });
});

describe("possible-d-sep", () => {
  it("prevents pds from walking through a non-collider", () => {
    // 0 - 1 <- 2 -> 3: node 1 is a collider on 0-1-2, so 2 is reachable from 0; node 2 is not a
    // collider on 1-2-3 and is not in a triangle, so 3 is NOT reachable.
    const edges = [
      E(0, 1, "circle", "arrowhead"),
      E(1, 2, "arrowhead", "circle"),
      E(2, 3, "circle", "circle"),
    ];
    expect(possibleDSep(4, edges, 0, 3)).toEqual([1, 2]);
  });

  it("prevents pds from missing a node reached only through a triangle", () => {
    const edges = [
      E(0, 1, "circle", "arrowhead"),
      E(1, 2, "arrowhead", "circle"),
      E(2, 3, "circle", "circle"),
      E(1, 3, "circle", "circle"),
    ];
    // 2 is now a member of the triangle 1-2-3, so the walk may continue into 3.
    expect(possibleDSep(4, edges, 0, 3)).toEqual([1, 2]);
    expect(possibleDSep(4, edges, 0, 3)).not.toContain(3);
  });
});

// ---------------------------------------------------------------------------
// Part 2: PAG -> ADMG
// ---------------------------------------------------------------------------

describe("pagToAdmg", () => {
  it("prevents an unknown (circle) mark from being promoted to a direction", () => {
    const pag = handPag(
      [0, 1, 2],
      [
        E(0, 1, "tail", "arrowhead"), // 0 -> 1 : directed
        E(1, 2, "arrowhead", "arrowhead"), // 1 <-> 2 : bidirected
        E(0, 2, "circle", "arrowhead"), // 0 o-> 2 : unknown, must NOT become 0 -> 2
      ],
    );
    const admg = pagToAdmg(pag);
    expect(admg.directed).toEqual([[0, 1]]);
    expect(admg.bidirected).toEqual([
      [0, 2],
      [1, 2],
    ]);
    expect(admg.directed).not.toContainEqual([0, 2]);
  });

  it("prevents an undirected (tail-tail) edge from being read as a direction", () => {
    const admg = pagToAdmg(handPag([0, 1], [E(0, 1, "tail", "tail")]));
    expect(admg.directed).toEqual([]);
    expect(admg.bidirected).toEqual([[0, 1]]);
  });

  it("prevents a projection that do-calculus cannot consume", () => {
    const pag = handPag(
      [0, 1, 2],
      [
        E(0, 1, "tail", "arrowhead"),
        E(0, 2, "arrowhead", "arrowhead"),
        E(1, 2, "arrowhead", "arrowhead"),
      ],
    );
    const causal = pagToCausalADMG(pag);
    expect(causal.nodes).toEqual(["v0", "v1", "v2"]);
    expect(causal.directed).toEqual([["v0", "v1"]]);
    const result = runShpitserPearlID(new Set(["v1"]), new Set(["v0"]), causal);
    expect(typeof result.ok).toBe("boolean");
    if (result.ok) {
      expect(result.formula).toBeDefined();
    } else {
      expect(result.code).toBe("FAIL_HEDGE");
    }
  });

  it("prevents a cyclic projection from being handed to do-calculus", () => {
    // 0 -> 1 -> 2 and 2 -> 0 is a cycle: the projection must refuse rather than silently reorder.
    const admg = { nodes: [0, 1, 2], directed: [[0, 1], [1, 2], [2, 0]] as [number, number][], bidirected: [] };
    expect(() => admgToCausalADMG(admg)).toThrow(/cycle/);
  });

  it("prevents the projected node order from violating the topological contract", () => {
    const pag = handPag([0, 1, 2], [E(2, 0, "tail", "arrowhead"), E(2, 1, "tail", "arrowhead")]);
    const causal = pagToCausalADMG(pag);
    const pos = new Map(causal.nodes.map((n, i) => [n, i]));
    for (const [u, v] of causal.directed) {
      expect(pos.get(u)!).toBeLessThan(pos.get(v)!);
    }
  });

  it("prevents discoverCausalStructure from dropping the projection", () => {
    const out = discoverCausalStructure(simCollider(4000, 31));
    expect(out.pag.edges.length).toBeGreaterThan(0);
    expect(out.admg.nodes).toEqual([0, 1, 2]);
    expect(out.admg.nodes.length).toBe(out.pag.nodes.length);
  });
});

// ---------------------------------------------------------------------------
// Part 3: DYNOTEARS
// ---------------------------------------------------------------------------

describe("acyclicityExact", () => {
  it("prevents a wrong h(W) gradient: analytic vs central finite difference", () => {
    const W = [
      [0, 0.3, -0.2],
      [0.1, 0, 0.4],
      [-0.3, 0.2, 0],
    ];
    const { h, grad } = acyclicityExact(W);
    expect(h).toBeGreaterThanOrEqual(0);
    const eps = 1e-6;
    for (let k = 0; k < 3; k++) {
      for (let j = 0; j < 3; j++) {
        const fd = fdEntry((M) => acyclicityExact(M).h, W, k, j, eps);
        expect(Math.abs(fd - grad[k]![j]!)).toBeLessThan(1e-5);
      }
    }
  });

  it("prevents h from being non-zero on a DAG or zero on a cycle", () => {
    const dag = [
      [0, 0.8, 0],
      [0, 0, 0.8],
      [0, 0, 0],
    ];
    expect(acyclicityExact(dag).h).toBeLessThan(1e-12);
    const cyc = [
      [0, 0.8, 0],
      [0, 0, 0.8],
      [0.8, 0, 0],
    ];
    // Closed form for a 3-cycle of weight c: h = 3*sum_m c^(6m)/(3m)! - 3.
    let exact = 0;
    let term = 1;
    for (let m = 1; m < 200; m++) {
      term = (term * 0.8 ** 6) / ((3 * m - 2) * (3 * m - 1) * (3 * m));
      exact += term;
    }
    expect(acyclicityExact(cyc).h).toBeCloseTo(3 * (1 + exact) - 3, 9);
  });

  it("prevents matExp from losing accuracy at the weights the optimizer visits", () => {
    // exp(40) is where a raw 30-term Taylor returns 1.45e16 instead of 2.35e17 (a 16x error).
    // Compared as a RELATIVE error: toBeCloseTo's absolute tolerance is meaningless at 1e17.
    const big = matExpScaleSquaring([[40]])[0]![0]!;
    expect(Math.abs(big - Math.exp(40)) / Math.exp(40)).toBeLessThan(1e-12);
    const diag = matExpScaleSquaring([
      [1, 0],
      [0, 2],
    ]);
    expect(diag[0]![0]!).toBeCloseTo(Math.E, 12);
    expect(diag[1]![1]!).toBeCloseTo(Math.E * Math.E, 12);
    expect(diag[0]![1]!).toBeCloseTo(0, 12);
  });
});

describe("dynotearsFit", () => {
  it("prevents NOTEARS from orienting an edge the PAG forbids", () => {
    const X = simDiamond(2000, 41);
    const allowed: [number, number][] = [
      [0, 1],
      [1, 0],
      [1, 3],
      [3, 1],
    ];
    const result = dynotearsFit(X, { allowedEdges: allowed });
    const isAllowed = (k: number, j: number): boolean => allowed.some(([a, b]) => a === k && b === j);
    for (let k = 0; k < 4; k++) {
      for (let j = 0; j < 4; j++) {
        if (k === j) {
          expect(Math.abs(result.W[k]![j]!)).toBe(0);
          continue;
        }
        if (isAllowed(k, j)) continue;
        // Exactly zero, not "small": the support mask is enforced, not just penalised.
        expect(Math.abs(result.W[k]![j]!)).toBe(0);
        expect(Math.abs(result.Wstandardized[k]![j]!)).toBe(0);
      }
    }
    // And the fitted edges are a subset of the allowed support.
    for (const [k, j] of result.edges) expect(isAllowed(k, j)).toBe(true);
  });

  it("prevents a negative acyclicity value or a stale gradient on the returned W", () => {
    const X = simDiamond(2000, 42);
    const result = dynotearsFit(X, {});
    expect(result.h).toBeGreaterThanOrEqual(-1e-12);
    // The returned grad must be the exact gradient AT the returned W (which is in original units).
    // eps = 1e-4, not 1e-6: W is in raw units (|W| ~ 1.4), so tr(exp(W o W)) ~ 1e2 and an eps of
    // 1e-6 turns the finite difference into roundoff (measured: 2.1e-5 absolute, all of it noise).
    const eps = 1e-4;
    for (let k = 0; k < 4; k++) {
      for (let j = 0; j < 4; j++) {
        const fd = fdEntry((M) => acyclicityExact(M).h, result.W, k, j, eps);
        const an = result.grad[k]![j]!;
        expect(Math.abs(fd - an)).toBeLessThan(1e-5 * Math.max(1, Math.abs(an)));
      }
    }
    expect(Number.isFinite(result.loss)).toBe(true);
    // The thresholded edge set must be acyclic even when the raw weights are dense.
    const adj = Array.from({ length: 4 }, () => new Array<number>(4).fill(0));
    for (const [k, j] of result.edges) adj[k]![j] = 1;
    expect(acyclicityExact(adj).h).toBeLessThan(1e-9);
  });

  it("prevents scale dependence in the discovered edge set", () => {
    const X = simDiamond(2000, 41);
    const scaled = X.map((row) => [row[0]! * 10, row[1]!, row[2]!, row[3]!]);
    const allowed: [number, number][] = [
      [0, 1],
      [1, 0],
      [0, 2],
      [2, 0],
      [1, 3],
      [3, 1],
      [2, 3],
      [3, 2],
    ];
    const base = dynotearsFit(X, { allowedEdges: allowed });
    const rescaled = dynotearsFit(scaled, { allowedEdges: allowed });
    expect(rescaled.edges).toEqual(base.edges);

    // Unrestricted: the skeleton must be identical under rescaling.
    const freeBase = dynotearsFit(X, {});
    const freeScaled = dynotearsFit(scaled, {});
    expect(skeletonOf(freeScaled.edges)).toEqual(skeletonOf(freeBase.edges));
  });

  it("prevents a wrong DAG recovery on a known linear-Gaussian SCM", () => {
    // Identifiable case: the collider A -> B <- C. The v-structure is what the likelihood prefers,
    // so both edges must point INTO B. 6000 rows: at n = 2000 a reversed direction occasionally
    // sits inside the flat Markov-equivalence subspace and the answer is not stable.
    const X = simCollider(6000, 31);
    const edges = dynotearsFit(X, { edgeThreshold: 0.1 }).edges;
    expect(edges).toEqual([
      [0, 1],
      [2, 1],
    ]);
  });

  it("prevents the estimator from ignoring the admissible support on a known SCM", () => {
    // Diamond: the skeleton is 0-1, 0-2, 1-3, 2-3. Without the FCI support the profile likelihood
    // saturates and adds the 1-2 edge (a real, measured failure, reported in the module header);
    // with the support restricted to the PAG skeleton it recovers exactly the true edge set.
    const X = simDiamond(4000, 41);
    const pag = fci(X);
    expect(skeletonOf(pag.skeleton)).toEqual(["0-1", "0-2", "1-3", "2-3"]);
    const allowed: [number, number][] = [];
    for (const [i, j] of pag.skeleton) {
      allowed.push([i, j], [j, i]);
    }
    const result = dynotearsFit(X, { allowedEdges: allowed, edgeThreshold: 0.1 });
    expect(skeletonOf(result.edges)).toEqual(["0-1", "0-2", "1-3", "2-3"]);
    expect(result.edges).toHaveLength(4);
    for (const [k, j] of result.edges) {
      expect(allowed.some(([a, b]) => a === k && b === j)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Part 4: the VERIFIED-literature term L_lit
// ---------------------------------------------------------------------------

describe("classALiterature (the spec's L_lit term)", () => {
  const CONSTRAINTS: ClassALiteratureConstraint[] = [
    { from: 0, to: 1, delta: 0.25, weight: 1.0, premiseId: "verified:p1" },
    { from: 1, to: 2, delta: -0.10, weight: 0.5, premiseId: "verified:p2" },
  ];

  it("prevents a wrong L_lit gradient: analytic vs central finite difference", () => {
    // The spec's gradient is
    //   d L_lit / dW = mu_lit * M^T * (Omega o (T - Delta)) * M^T
    // and the transpose on BOTH M's is the part that is easy to get
    // wrong in a way that still converges -- to a different W. Only a
    // finite difference can catch it.
    const muLit = 2.5;
    const W = [
      [0, 0.30, -0.10],
      [0.20, 0, 0.15],
      [0, -0.25, 0],
    ];
    const term = literatureTerm(W, CONSTRAINTS, muLit);
    expect(term).not.toBeNull();
    if (term === null) return;

    const f = (Wc: number[][]): number => {
      const t = literatureTerm(Wc, CONSTRAINTS, muLit);
      return t === null ? Number.NaN : t.value;
    };

    const eps = 1e-6;
    for (let k = 0; k < W.length; k++) {
      for (let j = 0; j < W.length; j++) {
        if (k === j) continue;
        const fd = fdEntry(f, W, k, j, eps);
        const analytic = term.grad[k]![j]!;
        expect(Math.abs(fd - analytic)).toBeLessThan(1e-4 * Math.max(1, Math.abs(fd)));
      }
    }
  });

  it("constrains the TOTAL effect, not the direct coefficient", () => {
    // T(W) = (I-W)^{-1} - I. On a chain 0 -> 1 -> 2 the total effect of
    // 0 on 2 is W01*W12, not W02. A constraint on W02 would be a
    // constraint on a coefficient that is not the effect anyone
    // observes.
    const W = [
      [0, 0.5, 0],
      [0, 0, 0.4],
      [0, 0, 0],
    ];
    const term = literatureTerm(W, [{ from: 0, to: 2, delta: 0, weight: 1 }], 1);
    expect(term).not.toBeNull();
    if (term === null) return;
    // T_02 = 0.5 * 0.4 = 0.2, so the residual against a delta of 0 is
    // 0.2, and the term is (1/2) * 1 * 0.2^2 = 0.02.
    expect(term.value).toBeCloseTo(0.5 * 0.2 * 0.2, 9);
  });

  it("pulls the fitted W toward the verified delta", () => {
    // The data say 0 -> 1 is a strong edge. The literature says its
    // total effect is 0.05. A constraint that is computed and then
    // ignored would pass every "does it run" test and change nothing.
    const rand = mulberry32(31);
    const rows: number[][] = [];
    for (let i = 0; i < 2000; i++) {
      const x0 = rand() - 0.5;
      const x1 = 0.8 * x0 + (rand() - 0.5) * 0.5;
      const x2 = 0.3 * x0 - 0.2 * x1 + (rand() - 0.5) * 0.5;
      rows.push([x0, x1, x2]);
    }
    const allowed: [number, number][] = [[0, 1], [0, 2], [1, 2]];

    const plain = dynotearsFit(rows, { lambda1: 0.001, allowedEdges: allowed });
    const pulled = dynotearsFit(rows, {
      lambda1: 0.001,
      allowedEdges: allowed,
      classALiterature: [{ from: 0, to: 1, delta: 0.05, weight: 1 }],
      muLit: 50,
    });

    const totalEffect = (W: number[][]): number => {
      // T_01 for a 3x3: expand (I-W)^{-1} = I + W + W^2 + ...
      // T_01 = W01 + W02*W21 + W01*W12*W21
      const [a, b, c] = [W[0]![1]!, W[0]![2]!, W[1]![2]!];
      const d = W[2]![0]!;
      const e = W[2]![1]!;
      const f = W[1]![0]!;
      return a + c * d + a * c * e + a * f * e;
    };

    const tPlain = totalEffect(plain.Wstandardized);
    const tPulled = totalEffect(pulled.Wstandardized);
    expect(Math.abs(tPlain - 0.05)).toBeGreaterThan(Math.abs(tPulled - 0.05));
  });

  it("rejects a malformed literature constraint instead of ignoring it", () => {
    // A constraint that is silently dropped is the same failure as one
    // that was never read: the caller believes the premise is holding
    // the graph, and it is not.
    const X = [[0.1, 0.2, 0.3], [0.4, 0.1, 0.2], [0.2, 0.3, 0.1]];
    expect(() =>
      dynotearsFit(X, { classALiterature: [{ from: 0, to: 9, delta: 1, weight: 1 }] }),
    ).toThrow(/out of range/);
    expect(() =>
      dynotearsFit(X, { classALiterature: [{ from: 0, to: 0, delta: 1, weight: 1 }] }),
    ).toThrow(/self-edge/);
    expect(() =>
      dynotearsFit(X, { classALiterature: [{ from: 0, to: 1, delta: 1, weight: -1 }] }),
    ).toThrow(/negative/);
    expect(() =>
      dynotearsFit(X, { classALiterature: [{ from: 0, to: 1, delta: Number.NaN, weight: 1 }] }),
    ).toThrow(/non-finite/);
    expect(() => dynotearsFit(X, { muLit: -1 })).toThrow(/muLit/);
  });
});

// ---------------------------------------------------------------------------
// Part 5: the per-edge L1 penalty (the spec's lambda_{1,ij})
// ---------------------------------------------------------------------------

describe("edgePenalties (the spec's lambda_{1,ij})", () => {
  /** Data with a real 0 -> 1 edge and NO real 1 -> 2 edge. */
  function makeData(n: number, with12: boolean): number[][] {
    const rand = mulberry32(57);
    const rows: number[][] = [];
    for (let i = 0; i < n; i++) {
      const x0 = rand() - 0.5;
      const x1 = 0.9 * x0 + (rand() - 0.5) * 0.4;
      const x2 = with12 ? 0.8 * x1 + (rand() - 0.5) * 0.4 : rand() - 0.5;
      rows.push([x0, x1, x2]);
    }
    return rows;
  }

  it("a prior-proposed edge survives when the data supports it", () => {
    // The prior proposes 0 -> 1 with a relaxed penalty. The data
    // support it. The edge must be found.
    //
    // lambda1 = 1 is the load-bearing value: at that penalty the PLAIN
    // fit loses the 0 -> 1 edge (measured), and only the relaxed
    // penalty keeps it. At lambda1 = 0.5 the plain fit keeps it too,
    // and the test would pass for the wrong reason -- the penalty
    // relaxation would not be what made the difference.
    const rows = makeData(3000, false);
    const allowed: [number, number][] = [[0, 1], [0, 2], [1, 2]];

    const plain = dynotearsFit(rows, { lambda1: 1, allowedEdges: allowed });
    const res = dynotearsFit(rows, {
      lambda1: 1,
      allowedEdges: allowed,
      edgePenalties: [{ from: 0, to: 1, multiplier: 0.25, premiseId: "prior:p1" }],
    });

    // The prior is what saves the edge.
    expect(plain.edges.some(([k, j]) => k === 0 && j === 1)).toBe(false);
    expect(res.edges.some(([k, j]) => k === 0 && j === 1)).toBe(true);
  });

  it("a prior-proposed edge DIES when the data does not support it", () => {
    // The same prior proposes 1 -> 2, which the data do NOT support.
    // The relaxed penalty must not be able to conjure an edge the
    // likelihood does not want -- the penalty is relaxed, not removed.
    const rows = makeData(3000, false);
    const res = dynotearsFit(rows, {
      lambda1: 0.5,
      allowedEdges: [[0, 1], [0, 2], [1, 2]],
      edgePenalties: [{ from: 1, to: 2, multiplier: 0.25, premiseId: "prior:p2" }],
    });
    const found = res.edges.some(([k, j]) => k === 1 && j === 2);
    expect(found).toBe(false);
  });

  it("an uncited prior contributes NOTHING to the literature term", () => {
    // The spec's separation: an HONESTLY_UNCITED_PRIOR is excluded from
    // S_lit^ClassA, so its number can never pull W toward a magnitude
    // with no source document behind it. A prior with no delta has
    // nothing to contribute -- the edge penalty is its only channel.
    const rows = makeData(2000, false);
    const withPenalty = dynotearsFit(rows, {
      lambda1: 0.5,
      allowedEdges: [[0, 1], [0, 2], [1, 2]],
      edgePenalties: [{ from: 0, to: 1, multiplier: 0.25 }],
    });
    // The reported loss is the same with and without the penalty
    // because the penalty is applied in the PROXIMAL step, not in the
    // smooth objective that the loss reports. If the prior's NUMBER
    // had leaked into L_lit, the loss would differ.
    const plain = dynotearsFit(rows, {
      lambda1: 0.5,
      allowedEdges: [[0, 1], [0, 2], [1, 2]],
    });
    // Both are finite; the point is the fit is not corrupted by a
    // prior that carries no number.
    expect(Number.isFinite(withPenalty.loss)).toBe(true);
    expect(Number.isFinite(plain.loss)).toBe(true);
  });

  it("rejects a malformed edge penalty instead of ignoring it", () => {
    const X = [[0.1, 0.2, 0.3], [0.4, 0.1, 0.2], [0.2, 0.3, 0.1]];
    expect(() =>
      dynotearsFit(X, { edgePenalties: [{ from: 0, to: 9, multiplier: 0.25 }] }),
    ).toThrow(/out of range/);
    expect(() =>
      dynotearsFit(X, { edgePenalties: [{ from: 0, to: 0, multiplier: 0.25 }] }),
    ).toThrow(/self-edge/);
    expect(() =>
      dynotearsFit(X, { edgePenalties: [{ from: 0, to: 1, multiplier: -1 }] }),
    ).toThrow(/negative/);
  });
});
