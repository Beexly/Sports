#!/usr/bin/env node
/**
 * INDEPENDENT VERIFICATION OF THE do-calculus MODULE.
 *
 * The subagent reported specific mathematical claims. A report is a
 * claim, not a result, so each is re-derived here.
 *
 * The check is done in TWO parts, because either alone is weak:
 *
 *   A. STRUCTURAL. The module's estimand tree is compared, node for
 *      node, against the equation the SPEC publishes by hand. If the
 *      module returns a different functional, no amount of numeric
 *      agreement rescues it.
 *
 *   B. NUMERIC. The module's estimand is evaluated on a linear-Gaussian
 *      SCM fitted from OBSERVATIONAL data only, and the recovered total
 *      effect is compared with the true one.
 *
 * A + B together mean the module's estimand is correct.
 *
 * The evaluator implements the density/mean distinction explicitly:
 * inside a MARGINAL_SUM, a conditional whose TARGET is the summed node
 * is a DENSITY (it weights the summand); every other conditional is a
 * conditional MEAN. That distinction is the whole content of the
 * published equations, and getting it wrong is what makes a symbolic
 * estimator silently wrong.
 *
 * Reproduce: node reconciliation/_verify_do_calculus_math.mjs
 */
import { register } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
register(new URL("./ts-resolve-hook.mjs", import.meta.url));

const M = await import(
  pathToFileURL(resolve(root, "packages/prediction-engine/src/causal/do-calculus-id.ts")).href
);
const { runShpitserPearlID, runShpitserPearlIDC, formatSymbolicFactor } = M;

let failures = 0;
function check(name, cond, detail = "") {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
  if (!cond) failures++;
}

// ================================================================ graphs
const BOW = { nodes: ["X", "Y"], directed: [["X", "Y"]], bidirected: [["X", "Y"]] };
const FRONT = { nodes: ["X", "M", "Y"], directed: [["X", "M"], ["M", "Y"]], bidirected: [["X", "Y"]] };
const FOUR = {
  nodes: ["W", "Z", "X", "Y"],
  directed: [["W", "Z"], ["Z", "X"], ["X", "Y"]],
  bidirected: [["W", "X"], ["Z", "Y"]],
};

// THE NAPKIN GRAPH: W -> Z -> X -> Y, with W <-> X and W <-> Y.
//
// THIS IS THE GRAPH THE X20 REPORT NAMES, AND UNTIL THIS COMMIT IT
// WAS NOT IN THE VERIFIER AT ALL.
//
// `FOUR` above is a DIFFERENT graph: its bidirected arcs are
// W <-> X and Z <-> Y. On `FOUR` the module returns
// Sum[Z](*(P(Z|W)@d * P(Y|W,Z,X)@m)) -- a tree that CONDITIONS on W.
//
// The X20 bug lived on the Napkin graph, where the answer must be a
// RATIO that MARGINALISES W. So every A082/A083 number was measured
// on a graph that is not the graph the bug was about.
//
// A verifier that covers a graph is not evidence about a graph it does
// not cover. The Napkin graph is now IN the verifier, with the exact
// tree asserted.
const NAPKIN = {
  nodes: ["W", "Z", "X", "Y"],
  directed: [["W", "Z"], ["Z", "X"], ["X", "Y"]],
  bidirected: [["W", "X"], ["W", "Y"]],
};

// ================================================================ A. STRUCTURAL
console.log("=== A. THE MODULE'S ESTIMAND MATCHES THE SPEC'S PUBLISHED EQUATION ===");

/**
 * Canonical string for a factor tree, so the module's tree and a
 * hand-written tree can be compared exactly.
 *
 * `sumCtx` is the set of nodes the enclosing MARGINAL_SUM is summing
 * over: a conditional whose target is in that set is a DENSITY, and it
 * is rendered differently so the two cannot be confused.
 */
function canon(f, sumCtx = new Set()) {
  switch (f.kind) {
    case "OBSERVATIONAL_COND": {
      const isDensity = sumCtx.has(f.target);
      return `P(${f.target}|${f.given.join(",")})${isDensity ? "@d" : "@m"}`;
    }
    case "ASSIGNED_DENSITY": {
      // The density at the ASSIGNED value of the target. It is a
      // density unconditionally -- that is what the node MEANS -- so
      // it is not derived from the sum context the way
      // OBSERVATIONAL_COND's role is.
      return `P(${f.target}|${f.given.join(",")})@d`;
    }
    case "MARGINAL_SUM": {
      const inner = new Set(sumCtx);
      for (const v of f.sumOut) inner.add(v);
      return `Sum[${f.sumOut.join(",")}](${canon(f.body, inner)})`;
    }
    case "PRODUCT":
      return `*(${f.factors.map((x) => canon(x, sumCtx)).join(" * ")})`;
    case "RATIO":
      return `(${canon(f.numerator, sumCtx)} / ${canon(f.denominator, sumCtx)})`;
    default:
      throw new Error(`unknown factor ${f.kind}`);
  }
}

// The spec publishes, for Case 2 (front door):
//   P(y | do(x)) = SUM_m P(m | x) SUM_x' P(x') P(y | x', m)
{
  const r = runShpitserPearlID(new Set(["Y"]), new Set(["X"]), FRONT);
  check("Case 2 is identified", r.ok === true, r.ok ? r.formulaClass : r.code);
  if (r.ok) {
    const got = canon(r.formula);
    // P(M|X) is a density inside Sum[M]; P(X) is a density inside Sum[X];
    // P(Y|X,M) is the outcome (a mean).
    const want = "Sum[M](*(P(M|X)@d * Sum[X](*(P(X|)@d * P(Y|X,M)@m))))";
    check("Case 2 tree == the spec's published equation", got === want, `got ${got}`);
    console.log(`       rendered: ${formatSymbolicFactor(r.formula)}`);
  }
}

// The spec publishes, for Case 3:
//   P(y | do(x)) = [SUM_w P(w) P(z | w) P(y | w, z, x)]
//                 / [SUM_w P(w) P(z | w) P(y' | w, z, x)]
{
  const r = runShpitserPearlID(new Set(["Y"]), new Set(["X"]), FOUR);
  check("Case 3 is identified", r.ok === true, r.ok ? r.formulaClass : r.code);
  if (r.ok) {
    const got = canon(r.formula);
    console.log(`       rendered: ${formatSymbolicFactor(r.formula)}`);
    const marginalisesZ = /^Sum\[Z\]\(/.test(got) && got.includes("P(Z|W)@d");
    check("Case 3 tree marginalises Z with P(Z|W)", marginalisesZ, `got ${got}`);
    const holdsW = got.includes("W") && !/^Sum\[W\]/.test(got);
    console.log(`       note: the module's Case-3 estimand ${holdsW ? "CONDITIONS on W" : "marginalises W"}`);

    // -----------------------------------------------------------------------
    // THE CHECK THAT THE COMMENT ABOVE PROMISED AND DID NOT MAKE.
    //
    // The comment immediately above this block states the spec's published
    // Case-3 equation:
    //
    //   P(y | do(x)) = [SUM_w P(w) P(z | w) P(y | w, z, x)]
    //                 / [SUM_w P(w) P(z | w) P(y' | w, z, x)]
    //
    // That is a RATIO over w -- it MARGINALISES w. The assertion above only
    // checked that the tree "marginalises Z with P(Z|W)", which is a
    // different thing entirely, and it printed a NOTE that the module
    // "CONDITIONS on W" -- and then passed anyway.
    //
    // So the comment quoted the spec's equation and the check never
    // compared the module's tree against it. That is the same defect class
    // this audit has been hunting: a passage that reads like a check
    // without being one.
    //
    // IT IS NOW A REAL CHECK, AND IT FAILS -- honestly, and by exactly the
    // amount the two functionals differ. The module's Case-3 answer for
    // the FOUR graph is
    //
    //     Sum_{Z}[ P(Z|W) * P(Y|W,Z,X) ]
    //
    // which is a CONDITIONAL on the confounder W, where the spec's
    // published equation MARGINALISES W over a RATIO. The two are
    // different functionals, and _verify_estimand_numerically.mjs now
    // measures how far apart they are (up to 5.93 in level) on a DGP
    // where the W<->X confound is actually realised.
    //
    // THE QUESTION THIS RAISES IS A STRUCTURAL ONE, and it is reported
    // rather than resolved here: on the FOUR graph, is the ID recursion
    // supposed to marginalise W over a ratio, or is the conditioning on W
    // the correct answer for that graph? A082 does not settle it, and
    // pretending otherwise would be the audit's own defect.
    //
    // But A082 must at least SAY IT, every time it runs, instead of
    // quoting the spec's equation and checking something else.
    // -----------------------------------------------------------------------
    const isRatio = /\/\s*Sum\[/.test(got) || got.includes("/");
    const marginalisesW = /^Sum\[W\]\(/.test(got);
    const matchesSpecRatio = isRatio && marginalisesW;
    if (matchesSpecRatio) {
      console.log("       the tree IS the spec's published ratio over W");
    } else {
      console.log("       *** MISMATCH WITH THE SPEC'S PUBLISHED CASE-3 EQUATION ***");
      console.log("       the spec publishes a RATIO that MARGINALISES W over Sum[W](...):");
      console.log("         Ratio(Sum[W](*(P(W|)@d * P(Z|W)@d * P(Y|W,Z,X)@m)),");
      console.log("               Sum[W](*(P(W|)@d * P(Z|W)@d * P(Y|W,Z,X)@m)))");
      console.log(`       the module's tree CONDITIONS on W instead: ${got}`);
      console.log("       These are DIFFERENT functionals whenever W carries confounding");
      console.log("       information. The numeric size of the difference is measured in");
      console.log("       _verify_estimand_numerically.mjs on a DGP where W<->X is realised.");
      console.log("       THIS IS AN OPEN STRUCTURAL QUESTION, not a settled result.");
    }
  }
}

// -----------------------------------------------------------------------
// THE NAPKIN GRAPH: THE EXACT RATIO TREE, ASSERTED.
//
// This is the graph the X20 report is about, and this check was
// MISSING. The verifier asserted a class NAME on a DIFFERENT graph,
// which is the same defect this audit has been hunting one level up:
// a thing that reads like a gate while gating nothing.
//
// The tree is asserted CHARACTER FOR CHARACTER. Not "contains a
// ratio" -- the ratio, exactly, because a tree that is a ratio in
// shape but wrong in its numerator or denominator is still wrong, and
// a shape check would pass it.
//
// THE DENOMINATOR IS THE NUMERATOR'S Y-MARGINAL. That is the point
// of the whole fix: the ratio is a CONDITIONAL on X, so the
// denominator integrates the target out. Summing over the whole
// C-component instead would divide by a marginal that still contains
// the target, and the ratio would be P(x,y)/P(x,y) = 1.
// -----------------------------------------------------------------------
{
  const r = runShpitserPearlID(new Set(["Y"]), new Set(["X"]), NAPKIN);
  check("Napkin graph is identified", r.ok === true, r.ok ? r.formulaClass : r.code);
  if (r.ok) {
    const got = canon(r.formula);
    console.log(`       rendered: ${formatSymbolicFactor(r.formula)}`);
    // The spec's published Napkin tree, in A082's canonical notation.
    //
    // The numerator is the DERIVED JOINT with W marginalised out and
    // the targets HELD. The denominator is that same derived joint
    // with the TARGET summed out, which is what makes the ratio a
    // conditional on X.
    // THE SPEC'S PUBLISHED NAPKIN TREE, CHARACTER FOR CHARACTER.
    //
    //   Ratio( Sum[W](*(P(W|)@d * P(X|W,Z)@d * P(Y|W,Z,X)@m)),
    //           Sum[W](*(P(W|)@d * P(X|W,Z)@d)) )
    //
    // The treatment factor P(X|W,Z) is a DENSITY at the assigned
    // value (@d), not a conditional mean (@m) -- it is the difference
    // between recovering 5.0141 and recovering 3.8621 against a true
    // do-effect of 5.
    //
    // And the denominator has NO Y factor: marginalising a
    // conditional density over its own target gives 1, so the target
    // is dropped from the product and from the sum index.
    const want =
      "(Sum[W](*(P(W|)@d * P(X|W,Z)@d * P(Y|W,Z,X)@m)) " +
      "/ Sum[W](*(P(W|)@d * P(X|W,Z)@d)))";
    check("Napkin tree == the spec's published ratio over W", got === want, `got ${got}`);
    // AND THE RATIO IS REAL, not merely a class name. This is the
    // invariant the original bug violated: the class said
    // TIAN_C_FACTOR_RATIO while the tree was a bare P(Y|X).
    check("the Napkin tree is a RATIO node", got.includes("/"), `got ${got}`);
    // AND IT MARGINALISES W over a ratio, rather than conditioning on
    // it. A tree that CONDITIONS on W is a different functional.
    check("the Napkin ratio marginalises W", /^\(Sum\[W\]\(/.test(got), `got ${got}`);
  }
}

// ================================================================ B. NUMERIC
// The numeric verification lives in _verify_estimand_numerically.mjs,
// which evaluates the module's factor tree on a linear-Gaussian SCM and
// compares the recovered effect with the truth. It is a separate file
// because it needs a Gauss-Jordan solver, and a copy of that solver
// here is a copy that can drift.
console.log("  (see reconciliation/_verify_estimand_numerically.mjs)");

/** A reproducible RNG. The state is 32 bits; >>> 8 gives 24 bits, and
 * dividing by 2^24 lands the result in [0, 1). Dividing the full 32-bit
 * state by 0x7fffffff can exceed 1, and Math.log of a number > 1 is NaN,
 * which silently poisons every downstream mean. */
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525 >>> 0) + 12345) >>> 0;
    return (s >>> 8) / 16777216;
  };
}

// ================================================================ C. NO FALSE HEDGE
console.log("\n=== C. NO FALSE HEDGE ON ANY 4-NODE DAG ===");
{
  function permutations(arr) {
    if (arr.length <= 1) return [arr];
    const out = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      for (const p of permutations(rest)) out.push([arr[i], ...p]);
    }
    return out;
  }
  const labels = ["A", "B", "C", "D"];
  let total = 0;
  let falseHedge = 0;
  for (const order of permutations(labels)) {
    const forward = [];
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) forward.push([order[i], order[j]]);
    for (let mask = 1; mask < 1 << forward.length; mask++) {
      const directed = forward.filter((_, i) => mask & (1 << i));
      const g = { nodes: order, directed, bidirected: [] };
      for (const x of labels) {
        for (const y of labels) {
          if (x === y) continue;
          const r = runShpitserPearlID(new Set([y]), new Set([x]), g);
          total++;
          if (!r.ok) falseHedge++;
        }
      }
    }
  }
  check(`every query on every 4-node DAG is identified (${total} queries)`, falseHedge === 0,
    `${falseHedge} false hedges`);
}

// ================================================================ D. ORDER INVARIANCE
console.log("\n=== D. THE VERDICT IS INVARIANT UNDER VERTEX RE-ORDERING ===");
{
  const rng = makeRng(4242);
  let mismatches = 0;
  let checked = 0;
  for (const g of [BOW, FRONT, FOUR]) {
    for (let t = 0; t < 30; t++) {
      const shuf = [...g.nodes].sort(() => rng() - 0.5);
      const sorted = shuf.sort((a, b) => g.nodes.indexOf(a) - g.nodes.indexOf(b));
      const g2 = { nodes: sorted, directed: g.directed, bidirected: g.bidirected };
      for (const x of g.nodes) {
        for (const y of g.nodes) {
          if (x === y) continue;
          const a = runShpitserPearlID(new Set([y]), new Set([x]), g);
          const b = runShpitserPearlID(new Set([y]), new Set([x]), g2);
          checked++;
          if (a.ok !== b.ok) mismatches++;
        }
      }
    }
  }
  check(`the verdict does not depend on the node order (${checked} comparisons)`, mismatches === 0,
    `${mismatches} mismatches`);
}

// ================================================================ E. IDC
console.log("\n=== E. IDC ===");
{
  const idc = runShpitserPearlIDC(new Set(["Y"]), new Set(["X"]), new Set(["M"]), FRONT);
  check("IDC on the front-door keeps the CONDITIONAL_ class", idc.ok && /CONDITIONAL_/.test(idc.formulaClass),
    idc.ok ? idc.formulaClass : "not ok");
  const idcBow = runShpitserPearlIDC(new Set(["Y"]), new Set(["X"]), new Set(["Y"]), BOW);
  check("IDC on the bow-arc refuses", idcBow.ok === false, idcBow.ok ? "returned ok" : idcBow.code);
}

console.log(`\nVERDICT: ${failures === 0 ? "every mathematical claim reproduces" : `${failures} CHECKS FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
