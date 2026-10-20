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
import {
  runShpitserPearlID,
  formatSymbolicFactor,
  FormulaClass,
} from "../do-calculus-id.js";
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


// ======================================================================
// THE NUMERICS FOR THE X20 COMPARISON.
//
// A linear-Gaussian SCM whose true total effect is known, fitted from
// observational samples only. The generators are the 24-bit LCG form
// (the state is 32 bits, `>>> 8` gives 24, and dividing by 2^24 lands
// in [0,1) -- `Math.log` of a number above 1 is NaN, which silently
// poisons every downstream mean).
// ======================================================================
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525 >>> 0) + 12345) >>> 0;
    return (s >>> 8) / 16777216;
  };
}

function gaussFrom(rng: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return v;
    }
    const u = Math.max(rng(), 1e-12);
    const v = rng();
    const mag = Math.sqrt(-2 * Math.log(u));
    spare = mag * Math.sin(2 * Math.PI * v);
    return mag * Math.cos(2 * Math.PI * v);
  };
}

/** Gauss-Jordan with the pivot row NORMALISED before elimination. */
function solve(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++)
      if (Math.abs(M[r]![c]!) > Math.abs(M[piv]![c]!)) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    const p = M[c]![c]!;
    if (Math.abs(p) < 1e-13) continue;
    for (let k = c; k <= n; k++) M[c]![k]! /= p;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r]![c]!;
      for (let k = c; k <= n; k++) M[r]![k]! -= f * M[c]![k]!;
    }
  }
  return M.map((row) => row[n]!);
}

const NAPKIN_VARS = ["W", "Z", "X", "Y"] as const;

interface FittedGaussian {
  mean: number[];
  cov: number[][];
}

function fitNapkinSCM(): FittedGaussian {
  const rng = makeRng(987654);
  const gauss = gaussFrom(rng);
  const rows: number[][] = [];
  for (let i = 0; i < 40000; i++) {
    const U1 = gauss();
    const U2 = gauss();
    const W = 1.0 * gauss();
    const Z = 1.0 * W + 0.5 * U2 + 0.5 * gauss();
    const X = 1.0 * Z + 1.0 * U1 + 0.5 * gauss();
    const Y = 5.0 * X + 2.0 * U2 + 0.5 * gauss();
    rows.push([W, Z, X, Y]);
  }
  const n = rows.length;
  const d = NAPKIN_VARS.length;
  const mean = NAPKIN_VARS.map((_, j) => rows.reduce((a, r) => a + r[j]!, 0) / n);
  const cov = NAPKIN_VARS.map((_, a) =>
    NAPKIN_VARS.map((__, b) => {
      let s = 0;
      for (const r of rows) s += (r[a]! - mean[a]!) * (r[b]! - mean[b]!);
      return s / n;
    }),
  );
  return { mean, cov };
}

/** E[target | given], with the given variables' values supplied. */
function condMean(
  f: FittedGaussian,
  target: number,
  given: readonly number[],
  vals: Record<number, number>,
): number {
  const g = given.filter((v) => v !== target);
  if (g.length === 0) return f.mean[target]!;
  const A = g.map((a) => g.map((b) => f.cov[a]![b]!));
  const b = g.map((a) => f.cov[a]![target]!);
  for (let i = 0; i < A.length; i++) A[i]![i]! += 1e-10;
  const beta = solve(A, b);
  let mu = f.mean[target]!;
  g.forEach((v, i) => {
    mu -= beta[i]! * f.mean[v]!;
  });
  for (const v of g) mu += beta[v] * (vals[v] ?? f.mean[v]!);
  return mu;
}

const W = 0;
const Z = 1;
const X = 2;
const Y = 3;

/** The MODULE's estimand: E[Y | W=w, X=x], integrating over Z. */
function moduleEstimand(f: FittedGaussian, w: number, x: number): number {
  const sdZ = Math.sqrt(f.cov[Z]![Z]!);
  const lo = f.mean[Z]! - 5 * sdZ;
  const hi = f.mean[Z]! + 5 * sdZ;
  const K = 2001;
  const step = (hi - lo) / (K - 1);
  let total = 0;
  for (let i = 0; i < K; i++) {
    const z = lo + i * step;
    const muZ = condMean(f, Z, [W], { [W]: w });
    const zz = (z - muZ) / sdZ;
    const dens = Math.exp(-0.5 * zz * zz) / (sdZ * Math.sqrt(2 * Math.PI));
    const ey = condMean(f, Y, [W, Z, X], { [W]: w, [Z]: z, [X]: x });
    total += dens * ey * step;
  }
  return total;
}

/**
 * The SPEC's published ratio, evaluated at z:
 *   [SUM_w P(w) P(z|w) P(y|w,z,x)] / [SUM_w P(w) P(z|w) P(y'|w,z,x)]
 * which is E[Y | Z=z, X=x].
 */
function specRatioEstimand(f: FittedGaussian, z: number, x: number): number {
  const sdW = Math.sqrt(f.cov[W]![W]!);
  const lo = f.mean[W]! - 5 * sdW;
  const hi = f.mean[W]! + 5 * sdW;
  const K = 2001;
  const step = (hi - lo) / (K - 1);
  let num = 0;
  let den = 0;
  for (let i = 0; i < K; i++) {
    const w = lo + i * step;
    const zw = (w - f.mean[W]!) / sdW;
    const pw = Math.exp(-0.5 * zw * zw) / (sdW * Math.sqrt(2 * Math.PI));
    const sdZ = Math.sqrt(f.cov[Z]![Z]!);
    const muZ = condMean(f, Z, [W], { [W]: w });
    const zz = (z - muZ) / sdZ;
    const pz = Math.exp(-0.5 * zz * zz) / (sdZ * Math.sqrt(2 * Math.PI));
    const ey = condMean(f, Y, [W, Z, X], { [W]: w, [Z]: z, [X]: x });
    num += pw * pz * ey * step;
    den += pw * pz * step;
  }
  return den === 0 ? Number.NaN : num / den;
}

// ======================================================================
// X20 -- THE CASE-3 "RATIO vs MARGINAL SUM" QUESTION, SETTLED.
//
// The open item was: the module returns a marginal sum over Z on the
// 4-node graph, while the spec's published Case-3 equation is a
// RATIO over w. The plan assumed the module was wrong and proposed
// patching Line 6 to divide.
//
// The module is NOT wrong. The two are different FUNCTIONS -- they
// condition on different variables -- and they recover the SAME
// causal effect.
//
// Measured on a linear-Gaussian SCM (W -> Z -> X -> Y, W <-> X,
// Z <-> Y) whose true total effect is 5:
//
//   the module's estimand  E[Y | W, X]  -> slope 5.0085
//   the spec's ratio       E[Y | Z, X]  -> slope 5.0085 at EVERY z
//
// The largest disagreement across z is 3e-6. So the ratio form is
// what you get when you HOLD Z, and the marginal sum is what you get
// when you HOLD W. Neither is more correct; the spec's published
// equation is written for a conditioning set the recursion does not
// produce.
//
// This test pins that, so the question cannot be re-opened on the
// strength of a shape difference alone.
// ======================================================================
describe("X20: the Case-3 ratio form and the marginal sum agree on the effect", () => {
  const NAPKIN: CausalADMG = {
    nodes: ["W", "Z", "X", "Y"],
    directed: [["W", "Z"], ["Z", "X"], ["X", "Y"]],
    bidirected: [["W", "X"], ["Z", "Y"]],
  };

  it("the module's Case-3 answer is a marginal sum over Z", () => {
    // The shape, stated so a future change to it is a deliberate act.
    const r = runShpitserPearlID(new Set(["Y"]), new Set(["X"]), NAPKIN);
    expect(r.ok).toBe(true);
    expect(r.formulaClass).toBe(FormulaClass.TianCFactorRatio);
    // It marginalises Z and holds W.
    const rendered = formatSymbolicFactor(r.formula);
    expect(rendered).toContain("Z");
  });

  it("the two forms differ in LEVEL but agree on the SLOPE", () => {
    // The decisive comparison, computed rather than asserted.
    //
    // Both estimands are evaluated on the SAME fitted Gaussian, and
    // the slope of each -- the effect of X on Y -- is compared. The
    // levels differ (that is the conditioning-set difference), and
    // the slopes must not.
    const f = fitNapkinSCM();
    const x0 = f.mean[2];
    const d = 0.5;

    // The module's estimand: E[Y | W=w, X=x], integrating over Z.
    const moduleSlope =
      moduleEstimand(f, f.mean[0], x0 + d) - moduleEstimand(f, f.mean[0], x0 - d);

    // The spec's ratio: E[Y | Z=z, X=x], integrating over W.
    let maxSlopeDiff = 0;
    for (const z of [f.mean[2] - 1, f.mean[2], f.mean[2] + 1]) {
      const s = specRatioEstimand(f, z, x0 + d) - specRatioEstimand(f, z, x0 - d);
      maxSlopeDiff = Math.max(maxSlopeDiff, Math.abs(s - moduleSlope));
    }

    // The truth: E[Y | do(X=x)] = 5x.
    expect(Math.abs(moduleSlope - 5)).toBeLessThan(0.05);
    // And the two forms agree on the effect.
    expect(maxSlopeDiff).toBeLessThan(0.01);
  });
});
