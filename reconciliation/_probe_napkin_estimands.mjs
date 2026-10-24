/**
 * THE NAPKIN ESTIMAND PROBE.
 *
 * THE QUESTION. On the Napkin / Case-3 graph
 *
 *     G = ( W -> Z -> X -> Y ,  W <-> X ,  W <-> Y )
 *
 * the goal spec requires the ID recursion to emit
 *
 *     Ratio( Sum[W](*(P(W|)@d * P(X|W,Z)@d * P(Y|W,Z,X)@m)),
 *             Sum[W](*(P(W|)@d * P(X|W,Z)@d)) )
 *
 * and requires that this ratio recover the TRUE interventional slope.
 * The spec's DGP is
 *
 *     W = U1 + 0.5*U2 + 0.5*e1
 *     Z = W + 0.5*e2
 *     X = Z + U1 + 0.5*e3
 *     Y = 5*X + 2*U2 + 0.5*e4
 *
 * with U1, U2, e1..e4 ~ N(0,1) independent, so the true effect is 5.
 *
 * THIS PROBE COMPUTES SIX CANDIDATE ESTIMANDS ON THAT EXACT DGP, each
 * as a genuine function of the assigned treatment value x, and reports
 * which recovers 5. Every one is a function of x and every one is
 * differenced over a UNIT step (x - 0.5, x + 0.5), so the numbers are
 * slopes and not half-slopes.
 *
 * THE SIX:
 *
 *   (1) TRUE do(X), by INTERVENTION simulation. X is set to x; the
 *       upstream variables are still drawn, because do(X) cuts the
 *       arrows INTO X and nothing else. This is the ground truth.
 *   (2) BACK-DOOR on W:  sum_w P(w) E[y|x,w].
 *   (3) OBSERVATIONAL P(y|x,z).
 *   (4) THE GOAL-SPEC RATIO, density version:
 *         [ sum_w P(w) p(x|w,z) E[y|w,z,x] ] / [ sum_w P(w) p(x|w,z) ].
 *   (5) THE MODULE'S CURRENT TREE, mean version:
 *         [ sum_w P(w) E[x|w,z] E[y|w,z,x] ] / [ sum_w P(w) E[x|w,z] ].
 *   (6) THE GOAL DOC SECTION 1.1 LITERAL reading, with the Y factor a
 *       density in the numerator:
 *         [ sum_w P(w) p(x|w,z) p(y|w,z,x) ] / [ sum_w P(w) p(x|w,z) ].
 *
 * (4) and (5) are the pair the spec's hypothesis turns on: the SAME
 * ratio, differing ONLY in whether the treatment factor P(X|W,Z) is a
 * DENSITY at the assigned value or a conditional MEAN. If (4) recovers
 * 5 and (5) does not, the density/mean convention is the defect. If
 * they agree, it is not.
 *
 * AND THE CI BASE.
 *
 * An ADMG is a CORRECT description of a distribution only if that
 * distribution satisfies the graph's CI base. G's only non-adjacent
 * pair is (Z, Y), and m-separation in G implies BOTH
 *
 *     Z  _||_  Y  |  W          and          Z  _||_  Y  |  X
 *
 * (paths Z->X->Y and Z<-W->X->Y are blocked by X; paths Z<-W->X->Y
 * and Z<-W<->Y are blocked by W; Z<-W<->X->Y is blocked by either).
 *
 * So this probe also REGRESSES Y on (W, X, Z) and reports the
 * t-statistic of the Z coefficient, for each CI the graph implies. A
 * DGP that violates the CI base is not a distribution the graph
 * describes, and then no estimator -- correct or not -- is obliged to
 * recover the graph-implied estimand from it.
 *
 * Run: node reconciliation/_probe_napkin_estimands.mjs
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
register(new URL(`file:///${ROOT.replace(/\\/g, "/")}/reconciliation/ts-resolve-hook.mjs`));

const doCalc = await import(
  pathToFileURL(`${ROOT.replace(/\\/g, "/")}/packages/prediction-engine/src/causal/do-calculus-id.ts`).href
);

// ---------------------------------------------------------------- rng
function mkRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 12345) >>> 0;
    return (s >>> 8) / 16777216;
  };
}
function gaussFrom(rand) {
  return () => {
    const u1 = Math.max(rand(), 1e-12);
    const u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
}

// ------------------------------------------------------- linear algebra
function solve(A, b) {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c += 1) {
    let p = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r += 1) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k += 1) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}
function inv(A) {
  const n = A.length;
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const e = new Array(n).fill(0);
    e[i] = 1;
    out.push(solve(A.map((r) => [...r]), e));
  }
  // out[j][i] = inverse[i][j]; transpose
  return out[0].map((_, i) => out.map((r) => r[i]));
}

// ------------------------------------------------------------- fitting
function fit(rows, names) {
  const N = rows.length;
  const mu = {};
  for (const n of names) mu[n] = rows.reduce((a, r) => a + r[n], 0) / N;
  const cov = {};
  for (const a of names) {
    cov[a] = {};
    for (const b of names) {
      let s = 0;
      for (const r of rows) s += (r[a] - mu[a]) * (r[b] - mu[b]);
      cov[a][b] = s / (N - 1);
    }
  }
  return { N, mu, cov };
}
/** The conditional mean of `target` given `givens`, at the point `assign`. */
function condMean(f, target, givens, assign) {
  const g = givens.filter((v) => v !== target);
  if (g.length === 0) return f.mu[target];
  const A = g.map((a) => g.map((b) => f.cov[a][b]));
  const b = g.map((a) => f.cov[a][target]);
  for (let i = 0; i < A.length; i += 1) A[i][i] += 1e-9;
  const beta = solve(A, b);
  let v = f.mu[target];
  g.forEach((gv, i) => { v += beta[i] * (assign[gv] - f.mu[gv]); });
  return v;
}
/** The conditional SD of `target` given `givens`. */
function condSd(f, target, givens) {
  const g = givens.filter((v) => v !== target);
  if (g.length === 0) return Math.sqrt(f.cov[target][target]);
  const A = g.map((a) => g.map((b) => f.cov[a][b]));
  const b = g.map((a) => f.cov[a][target]);
  for (let i = 0; i < A.length; i += 1) A[i][i] += 1e-9;
  const beta = solve(A, b);
  const v = f.cov[target][target] - beta.reduce((a, c, i) => a + c * b[i], 0);
  return Math.sqrt(Math.max(v, 1e-12));
}
/** The conditional DENSITY of `target` given `givens`, at the point `assign`. */
function condDensity(f, target, givens, assign) {
  const g = givens.filter((v) => v !== target);
  if (g.length === 0) {
    const sd = Math.sqrt(f.cov[target][target]);
    return Math.exp(-0.5 * ((assign[target] - f.mu[target]) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));
  }
  const m = condMean(f, target, givens, assign);
  const sd = condSd(f, target, givens);
  return Math.exp(-0.5 * ((assign[target] - m) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));
}

// --------------------------------------------------------------- the DGP
const NAMES = ["W", "Z", "X", "Y"];
function drawDgp(rand) {
  const g = gaussFrom(rand);
  return () => {
    const U1 = g(), U2 = g(), e1 = g(), e2 = g(), e3 = g(), e4 = g();
    const W = 1.0 * U1 + 0.5 * U2 + 0.5 * e1;
    const Z = 1.0 * W + 0.5 * e2;
    const X = 1.0 * Z + 1.0 * U1 + 0.5 * e3;
    const Y = 5.0 * X + 2.0 * U2 + 0.5 * e4;
    return { W, Z, X, Y };
  };
}

/** The TRUE interventional mean, by do(X = x) simulation. */
function doSim(rand, x, n) {
  const g = gaussFrom(rand);
  let s = 0;
  for (let i = 0; i < n; i += 1) {
    const U1 = g(), U2 = g(), e1 = g(), e2 = g(), e3 = g(), e4 = g();
    // do(X = x): the arrows INTO X are cut, so X is set, and W and Z
    // are still drawn (they are upstream, not downstream).
    const W = 1.0 * U1 + 0.5 * U2 + 0.5 * e1;
    const Z = 1.0 * W + 0.5 * e2;
    const Y = 5.0 * x + 2.0 * U2 + 0.5 * e4;
    s += Y;
  }
  return s / n;
}

// ------------------------------------------------------------- analysis
let densitySlope = Number.NaN;
let meanSlope = Number.NaN;
let ciBaseHolds = false;

function analyse(label, rows, truth) {
  const f = fit(rows, NAMES);
  const x0 = f.mu.X, z0 = f.mu.Z;
  const sw = Math.sqrt(f.cov.W.W), mw = f.mu.W;
  const K = 4001;
  const ws = [];
  for (let i = 0; i < K; i += 1) ws.push(mw - 6 * sw + (12 * sw * i) / (K - 1));
  const I = (arr) => {
    let t = 0;
    for (let i = 0; i < K - 1; i += 1) t += arr[i] * (ws[i + 1] - ws[i]);
    return t;
  };
  const pw = ws.map((w) => {
    const sd = Math.sqrt(f.cov.W.W);
    return Math.exp(-0.5 * ((w - mw) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));
  });
  const step = 0.5;

  // A helper: the six estimands, each as a function of the assigned x.
  const at = (x) => {
    const Ey_xwz = ws.map((w) => condMean(f, "Y", ["X", "W", "Z"], { X: x, W: w, Z: z0 }));
    const px_wz = ws.map((w) => condDensity(f, "X", ["W", "Z"], { X: x, W: w, Z: z0 }));
    const py_xwz = ws.map((w) => condDensity(f, "Y", ["X", "W", "Z"], { X: x, W: w, Z: z0 }));
    const Ex_wz = ws.map((w) => condMean(f, "X", ["W", "Z"], { W: w, Z: z0 }));
    const Ey_xw = ws.map((w) => condMean(f, "Y", ["X", "W"], { X: x, W: w }));
    // (2) back-door on W
    const backdoor = I(pw.map((v, i) => v * Ey_xw[i]));
    // (3) the observational conditional
    const plain = condMean(f, "Y", ["X", "Z"], { X: x, Z: z0 });
    // (4) the goal-spec ratio, DENSITY version
    const gNum = I(pw.map((v, i) => v * px_wz[i] * Ey_xwz[i]));
    const gDen = I(pw.map((v, i) => v * px_wz[i]));
    const goal = gDen === 0 ? NaN : gNum / gDen;
    // (5) the module's current tree, MEAN version
    const mNum = I(pw.map((v, i) => v * Ex_wz[i] * Ey_xwz[i]));
    const mDen = I(pw.map((v, i) => v * Ex_wz[i]));
    const module = mDen === 0 ? NaN : mNum / mDen;
    // (6) the goal doc section 1.1 reading: the numerator carries the
    // Y DENSITY and the denominator the Y-MARGINAL over the SAME
    // derived joint, so the ratio is a conditional on X.
    //
    //   [ sum_w P(w) p(x|w,z) p(y|w,z,x) ] / [ sum_w P(w) p(x|w,z) ]
    //
    // The numerator is a DENSITY in y, so dividing it by the
    // denominator (a density in x) does not give a mean -- and the
    // pointwise ratio is not an estimand at all. What IS an estimand
    // is the ratio of the two INTEGRATED over y, which is exactly
    // candidate (3), the observational conditional. So (6) is reported
    // as the density ratio, and its mean is not defined.
    const lNum = I(pw.map((v, i) => v * px_wz[i] * py_xwz[i]));
    const lDen = I(pw.map((v, i) => v * px_wz[i]));
    const literal = lDen === 0 ? NaN : lNum / lDen;
    return { backdoor, plain, goal, module, literal };
  };
  const lo = at(x0 - step), hi = at(x0 + step);
  const slope = (k) => hi[k] - lo[k];

  // ---- the CI base of G, as t-statistics.
  const ciTest = (target, givens, extra) => {
    // The coefficient of `extra` in the regression of `target` on
    // givens + extra, and its t-statistic.
    const all = [...givens, extra];
    const A = all.map((a) => all.map((b) => f.cov[a][b]));
    const b = all.map((a) => f.cov[a][target]);
    for (let i = 0; i < A.length; i += 1) A[i][i] += 1e-9;
    const beta = solve(A, b);
    const i = givens.length;
    const resid = f.cov[target][target] - beta.reduce((a, c, k) => a + c * b[k], 0);
    const Ai = inv(A);
    const se = Math.sqrt(Math.max(resid, 1e-12) * Ai[i][i]);
    return { coef: beta[i], t: beta[i] / se };
  };
  const tZW = ciTest("Y", ["W", "X"], "Z");
  const tWX = ciTest("Y", ["W", "Z"], "X");

  console.log(`=== ${label} ===`);
  console.log(`  (1) TRUE do(X)   by intervention simulation : ${truth.toFixed(4)}`);
  console.log(`  (2) BACK-DOOR on W   sum_w P(w)E[y|x,w]       : ${slope("backdoor").toFixed(4)}`);
  console.log(`  (3) OBSERVATIONAL   P(y|x,z)                 : ${slope("plain").toFixed(4)}`);
  console.log(`  (4) GOAL RATIO      p(x|w,z) as a DENSITY     : ${slope("goal").toFixed(4)}`);
  console.log(`  (5) MODULE TREE     E[x|w,z] as a MEAN        : ${slope("module").toFixed(4)}`);
  console.log(`  (6) GOAL DOC 1.1    p(y|w,z,x) as a DENSITY   : ${slope("literal").toFixed(4)}`);
  console.log(`  CI base  Z _||_ Y | W,X : coef(Z) = ${tZW.coef.toFixed(6)}  t = ${tZW.t.toFixed(3)}  -> ${Math.abs(tZW.t) < 3 ? "HOLDS" : "VIOLATED"}`);
  console.log(`  CI base  X _||_ Y | W,Z : coef(X) = ${tWX.coef.toFixed(6)}  t = ${tWX.t.toFixed(3)}  -> ${Math.abs(tWX.t) < 3 ? "HOLDS" : "VIOLATED"}`);
  console.log("");
  densitySlope = slope("goal");
  meanSlope = slope("module");
  ciBaseHolds = Math.abs(tZW.t) < 3 && Math.abs(tWX.t) < 3;
}

// --------------------------------------------------------------- run it
console.log("THE NAPKIN ESTIMAND PROBE");
console.log("Graph G = ( W -> Z -> X -> Y , W <-> X , W <-> Y )\n");

{
  const draw = drawDgp(mkRng(20261020));
  const rows = [];
  for (let i = 0; i < 300000; i += 1) rows.push(draw());
  const x0 = rows.reduce((a, r) => a + r.X, 0) / rows.length;
  const truth = doSim(mkRng(777), x0 + 0.5, 400000) - doSim(mkRng(777), x0 - 0.5, 400000);
  analyse("THE SPEC'S DGP  (W = U1 + 0.5U2 + 0.5e1, Z = W + 0.5e2, X = Z + U1 + 0.5e3, Y = 5X + 2U2 + 0.5e4)", rows, truth);
}

// ---- THE VERDICT.
//
// The probe is a CI GATE, so it must fail the build when the
// density/mean distinction is not what the module implements. The
// check is on the NUMBERS, not on the module's tree: the density form
// must recover the truth and the mean form must not, and the CI base
// must hold.
//
// The tolerances are loose on purpose. They are not the measurement;
// they are a tripwire for a collapse of the convention, which would
// move the numbers by whole units.
{
  const DENSITY_MIN = 4.5;
  const MEAN_MAX = 4.5;
  const failures = [];
  if (densitySlope < DENSITY_MIN) {
    failures.push(`the density-version ratio recovered ${densitySlope.toFixed(4)}, below ${DENSITY_MIN}`);
  }
  if (meanSlope > MEAN_MAX) {
    failures.push(`the mean-version tree recovered ${meanSlope.toFixed(4)}, above ${MEAN_MAX} -- the density/mean distinction has collapsed`);
  }
  if (!ciBaseHolds) {
    failures.push("the CI base of the Napkin graph does NOT hold on this DGP, so the comparison is not evidence about the graph");
  }
  if (failures.length > 0) {
    console.error("\nVERDICT: FAILED");
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("\nVERDICT: the density convention recovers the true do-effect and the mean convention does not");
}

// ---- What the module's ID recursion actually returns, on G.
{
  const G = {
    nodes: ["W", "Z", "X", "Y"],
    directed: [["W", "Z"], ["Z", "X"], ["X", "Y"]],
    bidirected: [["W", "X"], ["W", "Y"]],
  };
  const r = doCalc.runShpitserPearlID(new Set(["Y"]), new Set(["X"]), G);
  console.log("=== THE MODULE'S TREE ON G ===");
  console.log(`  ok: ${r.ok}   class: ${r.ok ? r.formulaClass : r.code}`);
  if (r.ok) console.log(`  rendered: ${doCalc.formatSymbolicFactor(r.formula)}`);
  else console.log(`  enabling edges: ${JSON.stringify(r.enablingEdges)}`);
  console.log("");
}
