#!/usr/bin/env node
/**
 * TRACE THE NAPKIN GRAPH THROUGH ID.
 *
 * The spec's Case 3 graph is W -> Z -> X -> Y with bidirected arcs
 * W <-> X and Z <-> Y. The spec's published answer is a RATIO over
 * w; the module returns a marginal sum over Z.
 *
 * The question this answers is not "what does the module return" --
 * that is observable. It is: WHICH LINE of the recursion is
 * responsible, and therefore WHERE the ratio has to be built.
 *
 * So the recursion is instrumented: every line's decision is
 * recorded with the graph, the C-components, and the distribution it
 * is working on.
 *
 * Reproduce: node reconciliation/_trace_napkin.mjs
 */
import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const M = await import(
  pathToFileURL(
    resolve(root, "packages/prediction-engine/src/causal/do-calculus-id.ts"),
  ).href
);

const { runShpitserPearlID, formatSymbolicFactor, getMaximalCComponents, getAncestors, mutilateADMG } = M;

// THE SPEC'S CASE 3 GRAPH, EXACTLY AS THE GOAL DOCUMENT WRITES IT.
//
// The goal document's Case 3 heading is "W -> Z -> X -> Y with
// W <-> X and Z <-> Y", but the published equation
//
//     P(y|do(x)) = [SUM_w P(w) P(z|w) P(y|w,z,x)]
//                 / [SUM_w P(w) P(z|w) P(y'|w,z,x)]
//
// sums over w and holds z, and the STEP-BY-STEP trace in the
// document's section 4.3 describes C(G) = {S'_1 = {W,X}, S'_2 =
// {Z,Y}} -- which is the graph with BOTH W<->X and Z<->Y.
//
// So the equation and the trace describe the SAME graph, and the
// heading's phrasing is what caused the confusion. The graph below
// is the one both the trace and the equation describe.
const NAPKIN = {
  nodes: ["W", "Z", "X", "Y"],
  directed: [["W", "Z"], ["Z", "X"], ["X", "Y"]],
  bidirected: [["W", "X"], ["Z", "Y"]],
};

const Y = new Set(["Y"]);
const X = new Set(["X"]);

console.log("=== THE NAPKIN GRAPH ===");
console.log("  V      :", NAPKIN.nodes.join(", "));
console.log("  E_d    :", NAPKIN.directed.map(([a, b]) => `${a}->${b}`).join(", "));
console.log("  E_b    :", NAPKIN.bidirected.map(([a, b]) => `${a}<->${b}`).join(", "));
console.log("  query  : ID(y={Y}, x={X})");

// The C-components of the whole graph and of G[V \ X].
const cAll = getMaximalCComponents(NAPKIN);
console.log("\n=== C(G) (maximal C-components, bidirected connectivity) ===");
for (const c of cAll) console.log("  {", [...c].join(", "), "}");

const vMinusX = new Set(NAPKIN.nodes.filter((n) => n !== "X"));
const cMinusX = getMaximalCComponents({
  nodes: NAPKIN.nodes.filter((n) => vMinusX.has(n)),
  directed: NAPKIN.directed.filter(([a, b]) => vMinusX.has(a) && vMinusX.has(b)),
  bidirected: NAPKIN.bidirected.filter(([a, b]) => vMinusX.has(a) && vMinusX.has(b)),
});
console.log("\n=== C(G[V \\ X]) ===");
for (const c of cMinusX) console.log("  {", [...c].join(", "), "}");

// Line 2: ancestors of Y.
const anY = getAncestors(NAPKIN, Y);
console.log("\n=== LINE 2: An(Y)_G ===");
console.log("  {", [...anY].join(", "), "}");
console.log("  non-ancestors to marginalise out:", NAPKIN.nodes.filter((n) => !anY.has(n)).join(", ") || "(none)");

// Line 3.
const anYOverX = getAncestors(mutilateADMG(NAPKIN, X), Y);
console.log("\n=== LINE 3: An(Y)_{G_\\overline{X}} ===");
console.log("  {", [...anYOverX].join(", "), "}");
const w = NAPKIN.nodes.filter((n) => !X.has(n) && !anYOverX.has(n));
console.log("  W = (V \\ X) \\ An(Y)_{G_\\overline{X}}:", w.join(", ") || "(empty)");

// THE RECURSION AFTER LINE 3: the intervention set is {W, Z, X}.
const X3 = new Set(["W", "Z", "X"]);
console.log("\n=== AFTER LINE 3: x = {W, Z, X} ===");
const g3 = NAPKIN;
const vMinusX3 = new Set(g3.nodes.filter((n) => !X3.has(n)));
const cMinusX3 = getMaximalCComponents({
  nodes: g3.nodes.filter((n) => vMinusX3.has(n)),
  directed: g3.directed.filter(([a, b]) => vMinusX3.has(a) && vMinusX3.has(b)),
  bidirected: g3.bidirected.filter(([a, b]) => vMinusX3.has(a) && vMinusX3.has(b)),
});
console.log("  C(G[V \\ X]) =");
for (const c of cMinusX3) console.log("    {", [...c].join(", "), "}");

const anY3 = getAncestors(g3, Y);
console.log("  An(Y)_G = {", [...anY3].join(", "), "}");
console.log("  -> Line 2 prunes:", g3.nodes.filter((n) => !anY3.has(n)).join(", ") || "(none)");

// The C-components of the whole graph, restricted to S.
const cAll3 = getMaximalCComponents(g3);
console.log("  C(G) =");
for (const c of cAll3) console.log("    {", [...c].join(", "), "}");
const S = cMinusX3[0];
const superComp = cAll3.find((c) => c.size > S.size && [...S].every((n) => c.has(n)));
console.log("  S =", S ? "{" + [...S].join(", ") + "}" : "(none)");
console.log("  S' (a strict super-component) =", superComp ? "{" + [...superComp].join(", ") + "}" : "(NONE)");

// The result.
const r = runShpitserPearlID(Y, X, NAPKIN);
console.log("\n=== THE RESULT ===");
if (r.ok) {
  console.log("  class:", r.formulaClass);
  console.log("  tree :", formatSymbolicFactor(r.formula));
  console.log("  kind :", r.formula.kind);
} else {
  console.log("  FAILED:", r.code);
}

console.log("\n=== WHAT THE SPEC PUBLISHES ===");
console.log("  Ratio(Sum[W](*(P(W|)@d * P(X|W,Z)@d * P(Y|W,Z,X)@m)),");
console.log("        Sum[W](*(P(W|)@d * P(X|W,Z)@d)))");
console.log("\n=== WHAT THE MODULE RETURNS ===");
if (r.ok) console.log("  " + formatSymbolicFactor(r.formula));
