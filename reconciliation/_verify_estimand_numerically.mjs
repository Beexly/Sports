#!/usr/bin/env node
/**
 * IS THE MODULE'S ESTIMAND NUMERICALLY RIGHT?
 *
 * The structural check already proved the module returns EXACTLY the
 * equation the spec publishes. That is necessary but not sufficient: the
 * spec's equation could itself be wrong, and a module that faithfully
 * implements a wrong equation is still wrong.
 *
 * So this evaluates three things numerically on a linear-Gaussian SCM
 * fitted from OBSERVATIONAL data only, and compares them to the true
 * interventional effect:
 *
 *   A. THE MODULE'S ESTIMAND. Evaluated from the module's own factor
 *      tree, with the density/mean distinction handled explicitly.
 *   B. THE SPEC'S PUBLISHED EQUATION, written out by hand.
 *   C. THE TEXTBOOK FRONT-DOOR EQUATION, for comparison.
 *
 * If A differs from the truth while C matches it, the spec's published
 * equation is the defect -- and that is worth knowing, because the
 * module was asked to implement the spec.
 *
 * Reproduce: node reconciliation/_verify_estimand_numerically.mjs
 */
import { register } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
register(new URL("./ts-resolve-hook.mjs", import.meta.url));
const { runShpitserPearlID } = await import(
  pathToFileURL(resolve(root, "packages/prediction-engine/src/causal/do-calculus-id.ts")).href
);

let failures = 0;
function check(name, cond, detail = "") {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
  if (!cond) failures++;
}

// ------------------------------------------------------------------ fit
function mkRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525 >>> 0) + 12345) >>> 0;
    return (s >>> 8) / 16777216;
  };
}
const gaussFrom = (rng) => () => {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};

function fit(samples, nodes) {
  const n = samples.length;
  const mean = {};
  for (const v of nodes) mean[v] = samples.reduce((a, r) => a + r[v], 0) / n;
  const cov = {};
  for (const a of nodes) {
    cov[a] = {};
    for (const b of nodes) {
      let acc = 0;
      for (const r of samples) acc += (r[a] - mean[a]) * (r[b] - mean[b]);
      cov[a][b] = acc / (n - 1);
    }
  }
  return { mean, cov };
}

function solve(A, b) {
  // Gauss-Jordan: NORMALISE the pivot row first, then eliminate the column
  // from every other row. Skipping the normalisation leaves the matrix
  // upper-triangular and the back-substitution below divides the wrong
  // row -- a 1x1 system then returns 1 instead of the true coefficient.
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    const p = M[c][c];
    if (Math.abs(p) < 1e-13) continue;
    for (let k = c; k <= n; k++) M[c][k] /= p;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row) => row[n]);
}

/** The conditional distribution of `target` given `given`. */
function cond(f, target, given) {
  const g = given.filter((v) => v !== target);
  if (g.length === 0) return { mean: f.mean[target], slope: {}, sd: Math.sqrt(f.cov[target][target]) };
  const A = g.map((a) => g.map((b) => f.cov[a][b]));
  const b = g.map((a) => f.cov[a][target]);
  for (let i = 0; i < A.length; i++) A[i][i] += 1e-10;
  const beta = solve(A, b);
  const slope = {};
  let mu = f.mean[target];
  g.forEach((v, i) => {
    mu -= beta[i] * f.mean[v];
    slope[v] = beta[i];
  });
  let resid = f.cov[target][target];
  g.forEach((v, i) => {
    resid -= beta[i] * f.cov[v][target];
  });
  return { mean: mu, slope, sd: Math.sqrt(Math.max(resid, 1e-12)) };
}

/** The conditional MEAN of `target` given the values in `vals`. */
function condMean(f, target, given, vals) {
  const c = cond(f, target, given);
  let out = c.mean;
  for (const g of given) out += (c.slope[g] ?? 0) * (vals[g] ?? f.mean[g]);
  return out;
}

/** The density of `target` at `val`, given the values in `vals`. */
function condDensity(f, target, given, vals) {
  const c = cond(f, target, given);
  let mu = c.mean;
  for (const g of given) mu += (c.slope[g] ?? 0) * (vals[g] ?? f.mean[g]);
  const z = ((vals[target] ?? f.mean[target]) - mu) / c.sd;
  return Math.exp(-0.5 * z * z) / (c.sd * Math.sqrt(2 * Math.PI));
}

/**
 * Evaluate the module's factor tree as E[Y | do(X=x)].
 *
 * The tree is a DENSITY in y. Its MEAN is obtained by replacing the
 * conditional of the outcome with the conditional MEAN -- which is
 * exactly what integrating y * density does -- and integrating the rest
 * against the priors.
 *
 * The grid scopes are a STACK: a nested MARGINAL_SUM shadows only its
 * own variable, so the outer P(m|x) sees the INTERVENED x while the
 * inner P(y|x',m) sees the inner grid's x'.
 */
function evalMean(f, tree, f2, x, xVal) {
  const assign = { [x]: xVal };

  function walk(node, scope, sumCtx) {
    switch (node.kind) {
      case "OBSERVATIONAL_COND": {
        const target = node.target;
        if (sumCtx.has(target)) {
          // a density: it is the weight of the summand
          const val = scope.has(target) ? scope.get(target) : (assign[target] ?? f2.mean[target]);
          return condDensity(f2, target, node.given, { ...valsOf(scope, assign), [target]: val });
        }
        // a conditional mean
        return condMean(f2, target, node.given, valsOf(scope, assign));
      }
      case "MARGINAL_SUM": {
        const v = node.sumOut[0];
        const sd = Math.sqrt(f2.cov[v][v]);
        const K = 201;
        const lo = f2.mean[v] - 5 * sd;
        const hi = f2.mean[v] + 5 * sd;
        const step = (hi - lo) / (K - 1);
        let total = 0;
        for (let i = 0; i < K; i++) {
          const val = lo + i * step;
          const child = new Map(scope);
          child.set(v, val);
          const inner = new Set(sumCtx);
          inner.add(v);
          total += walk(node.body, child, inner) * step;
        }
        return total;
      }
      case "PRODUCT": {
        let p = 1;
        for (const sub of node.factors) p *= walk(sub, scope, sumCtx);
        return p;
      }
      case "RATIO": {
        const num = walk(node.numerator, scope, sumCtx);
        const den = walk(node.denominator, scope, sumCtx);
        return den === 0 ? NaN : num / den;
      }
      default:
        throw new Error(`unknown ${node.kind}`);
    }
  }

  function valsOf(scope, assign) {
    const v = { ...assign };
    for (const [k, val] of scope) v[k] = val;
    return v;
  }

  return walk(tree, new Map(), new Set());
}

/** d/dx of the estimand, by a central difference. */
function effect(f, tree, x) {
  const lo = evalMean(f, tree, f, x, f.mean[x] - 0.5);
  const hi = evalMean(f, tree, f, x, f.mean[x] + 0.5);
  return hi - lo;
}

// ================================================================ front door
console.log("=== THE FRONT-DOOR ESTIMAND, NUMERICALLY ===");
// SCM: U -> X, U -> Y, X -> M -> Y.
//   X = U + 0.5eX ; M = 2X + U + 0.5eM ; Y = 3M + 3U + 0.5eY
// => Y = 6X + 6U + noise, and U is unobserved.
// True E[Y|do(x)] = 6x  => the true total effect is 6.
{
  const rng = mkRng(12345);
  const gauss = gaussFrom(rng);
  const samples = [];
  for (let i = 0; i < 60000; i++) {
    const U = gauss();
    const X = 1.0 * U + 0.5 * gauss();
    const M = 2.0 * X + 0.5 * gauss();
    const Y = 3.0 * M + 3.0 * U + 0.5 * gauss();
    samples.push({ X, M, Y });
  }
  const f = fit(samples, ["X", "M", "Y"]);

  const FRONT = { nodes: ["X", "M", "Y"], directed: [["X", "M"], ["M", "Y"]], bidirected: [["X", "Y"]] };
  const r = runShpitserPearlID(new Set(["Y"]), new Set(["X"]), FRONT);
  const est = effect(f, r.formula, "X");
  console.log(`  the module's tree: ${JSON.stringify(r.formulaClass)}`);
  check("the module's front-door estimand recovers the true slope 6", Math.abs(est - 6) < 0.2,
    `got ${est.toFixed(4)}`);

  // VARIANT A: the inner weight is P(x' | m) -- the conditional.
  //   E[Y|do(x)] = SUM_m P(m|x) SUM_x' P(x'|m) E[Y|x',m]
  const cMX = cond(f, "M", ["X"]);
  const cYM = cond(f, "Y", ["X", "M"]);
  const cXM = cond(f, "X", ["M"]);
  const K = 401;
  const sdM = Math.sqrt(f.cov.M.M);
  const sdX = Math.sqrt(f.cov.X.X);
  const mLo = f.mean.M - 5 * sdM, mHi = f.mean.M + 5 * sdM, mStep = (mHi - mLo) / (K - 1);
  const xLo = f.mean.X - 5 * sdX, xHi = f.mean.X + 5 * sdX, xStep = (xHi - xLo) / (K - 1);

  const frontDoor = (xVal) => {
    let total = 0;
    for (let i = 0; i < K; i++) {
      const m = mLo + i * mStep;
      // P(m|x)
      const muM = cMX.mean + (cMX.slope.X ?? 0) * xVal;
      const pM = Math.exp(-0.5 * ((m - muM) / cMX.sd) ** 2) / (cMX.sd * Math.sqrt(2 * Math.PI));
      // SUM_x' P(x'|m) E[Y|x',m]
      let inner = 0;
      for (let j = 0; j < K; j++) {
        const xp = xLo + j * xStep;
        const muX = cXM.mean + (cXM.slope.M ?? 0) * m;
        const pX = Math.exp(-0.5 * ((xp - muX) / cXM.sd) ** 2) / (cXM.sd * Math.sqrt(2 * Math.PI));
        const eY = cYM.mean + (cYM.slope.X ?? 0) * xp + (cYM.slope.M ?? 0) * m;
        inner += pX * eY * xStep;
      }
      total += pM * inner * mStep;
    }
    return total;
  };
  const fdLo = frontDoor(f.mean.X - 0.5);
  const fdHi = frontDoor(f.mean.X + 0.5);
  const fdEst = fdHi - fdLo;
  check("variant A (P(x'|m)) does NOT recover the true slope 6 -- it is wrong here", Math.abs(fdEst - 6) > 1,
    `got ${fdEst.toFixed(4)}`);

  // VARIANT B: the inner weight is P(x') -- the MARGINAL. This is the
  // equation the SPEC publishes, and it is the one the module implements.
  const specEq = (xVal) => {
    let total = 0;
    for (let i = 0; i < K; i++) {
      const m = mLo + i * mStep;
      const muM = cMX.mean + (cMX.slope.X ?? 0) * xVal;
      const pM = Math.exp(-0.5 * ((m - muM) / cMX.sd) ** 2) / (cMX.sd * Math.sqrt(2 * Math.PI));
      let inner = 0;
      for (let j = 0; j < K; j++) {
        const xp = xLo + j * xStep;
        const pX = Math.exp(-0.5 * ((xp - f.mean.X) / sdX) ** 2) / (sdX * Math.sqrt(2 * Math.PI));
        const eY = cYM.mean + (cYM.slope.X ?? 0) * xp + (cYM.slope.M ?? 0) * m;
        inner += pX * eY * xStep;
      }
      total += pM * inner * mStep;
    }
    return total;
  };
  const spLo = specEq(f.mean.X - 0.5);
  const spHi = specEq(f.mean.X + 0.5);
  const spEst = spHi - spLo;
  check("variant B (the spec's published equation, marginal P(x')) recovers the true slope 6",
    Math.abs(spEst - 6) < 0.2, `got ${spEst.toFixed(4)}`);
  console.log(`  the spec's published equation (marginal P(x')) gives: ${spEst.toFixed(4)}`);
  console.log(`  variant A (P(x'|m)) gives:                           ${fdEst.toFixed(4)}`);
  console.log(`  the module's tree gives:                              ${est.toFixed(4)}`);
  console.log(`  the truth is:                                          6.0000`);
  check("the MODULE's tree agrees with the spec's published equation", Math.abs(est - spEst) < 0.05,
    `module ${est.toFixed(4)} vs spec ${spEst.toFixed(4)}`);
}

// ================================================================ four node
console.log("\n=== THE 4-NODE ESTIMAND, NUMERICALLY ===");
// SCM: W -> Z -> X -> Y, W <-> X, Z <-> Y.
//   W = eW ; Z = W + 0.5U2 + eZ ; X = Z + U1 + eX ; Y = 5X + 2U2 + eY
// Under do(X=x): Y = 5x + 2U2, and U2 is NOT affected by do(X) (U2 -> Z -> X
// is cut, but U2 -> Y remains). So E[Y|do(x)] = 5x => the true effect is 5.
{
  const rng = mkRng(987654);
  const gauss = gaussFrom(rng);
  const samples = [];
  for (let i = 0; i < 60000; i++) {
    const U1 = gauss();
    const U2 = gauss();
    const W = 1.0 * gauss();
    const Z = 1.0 * W + 0.5 * U2 + 0.5 * gauss();
    const X = 1.0 * Z + 1.0 * U1 + 0.5 * gauss();
    const Y = 5.0 * X + 2.0 * U2 + 0.5 * gauss();
    samples.push({ W, Z, X, Y });
  }
  const f = fit(samples, ["W", "Z", "X", "Y"]);
  const FOUR = {
    nodes: ["W", "Z", "X", "Y"],
    directed: [["W", "Z"], ["Z", "X"], ["X", "Y"]],
    bidirected: [["W", "X"], ["Z", "Y"]],
  };
  const r = runShpitserPearlID(new Set(["Y"]), new Set(["X"]), FOUR);
  const est = effect(f, r.formula, "X");
  console.log(`  the module's tree: ${JSON.stringify(r.formulaClass)}`);
  check("the module's 4-node estimand recovers the true slope 5", Math.abs(est - 5) < 0.3,
    `got ${est.toFixed(4)}`);
}

console.log(`\nVERDICT: ${failures === 0 ? "the module's estimands are numerically right" : `${failures} CHECKS FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
