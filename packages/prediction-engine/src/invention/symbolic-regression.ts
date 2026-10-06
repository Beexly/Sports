/**
 * Symbolic regression substrate — arXiv 2305.01582v3
 * ("Interpretable Machine Learning for Science with PySR and
 * SymbolicRegression.jl").
 *
 * ADDITIVE invention module (packages/prediction-engine/src/invention).
 * The GP search itself runs in PySR/SymbolicRegression.jl offline; this
 * module is the TypeScript substrate: expression-tree evaluation, node
 * counting (the interpretability budget), Pareto selection on
 * accuracy-vs-complexity, monotonicity-constraint hooks, and multi-view
 * fusion (two searches' hall-of-fame expressions composed as custom
 * operator inputs into a fusion expression).
 *
 * Paper mechanism: nflverse play-by-play 2015-2025 -> game/team-season
 * aggregates (net EPA/play, success rate, explosive-play rate, air
 * yards/attempt, pressure rate allowed, sack rate, turnover margin proxy,
 * 3rd-down conversion); operators +,-,x,div,pow,exp,log,sqrt,min/max plus
 * custom sigmoid and relu-like piecewise operators; GP-denoised inputs,
 * multi-population search with adaptive parsimony; final equation selected
 * by held-out-season accuracy AND complexity (<=15 tree nodes).
 *
 * ACCEPTANCE GATE (improvement-ledger): ADOPT if the discovered
 * closed-form equation beats the better of passer rating / QBR by >=0.05
 * Pearson r on held-out 2024-2025 seasons AND has <=15 tree nodes;
 * REJECT if it fails either, or if the top Pareto solutions are all
 * degenerate.
 */

export type Expr =
  | { readonly kind: "const"; readonly value: number }
  | { readonly kind: "var"; readonly name: string }
  | { readonly kind: "op"; readonly op: string; readonly args: ReadonlyArray<Expr> };

export const SR_OPERATORS = [
  "+",
  "-",
  "*",
  "div",
  "pow",
  "exp",
  "log",
  "sqrt",
  "min",
  "max",
  "sigmoid",
  "relu",
] as const;

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Evaluate an expression tree on a variable assignment. */
export function evaluate(expr: Expr, vars: Readonly<Record<string, number>>): number {
  switch (expr.kind) {
    case "const":
      return expr.value;
    case "var":
      return vars[expr.name] ?? Number.NaN;
    case "op": {
      const a = expr.args.map((e) => evaluate(e, vars));
      switch (expr.op) {
        case "+":
          return a.reduce((x, y) => x + y, 0);
        case "-":
          return a.length === 1 ? -a[0]! : a[0]! - a[1]!;
        case "*":
          return a.reduce((x, y) => x * y, 1);
        case "div":
          return a[1] === 0 ? Number.NaN : a[0]! / a[1]!;
        case "pow":
          return Math.pow(a[0]!, a[1]!);
        case "exp":
          return Math.exp(a[0]!);
        case "log":
          return a[0]! <= 0 ? Number.NaN : Math.log(a[0]!);
        case "sqrt":
          return a[0]! < 0 ? Number.NaN : Math.sqrt(a[0]!);
        case "min":
          return Math.min(...a);
        case "max":
          return Math.max(...a);
        case "sigmoid":
          return sigmoid(a[0]!);
        case "relu":
          return Math.max(0, a[0]!);
        default:
          return Number.NaN;
      }
    }
  }
}

/** Tree node count (the interpretability budget; gate: <= 15). */
export function countNodes(expr: Expr): number {
  if (expr.kind !== "op") return 1;
  return 1 + expr.args.reduce((n, e) => n + countNodes(e), 0);
}

export interface ParetoCandidate {
  readonly expr: Expr;
  /** Held-out error (lower is better). */
  readonly error: number;
}

/**
 * Pareto frontier on (error, node count): nondominated candidates.
 * Degenerate check: frontier entries with NaN error are dropped.
 */
export function paretoFrontier(candidates: ReadonlyArray<ParetoCandidate>): ParetoCandidate[] {
  const valid = candidates.filter((c) => Number.isFinite(c.error));
  return valid.filter(
    (c) =>
      !valid.some(
        (o) =>
          o !== c &&
          o.error <= c.error &&
          countNodes(o.expr) <= countNodes(c.expr) &&
          (o.error < c.error || countNodes(o.expr) < countNodes(c.expr)),
      ),
  );
}

/**
 * Monotonicity-constraint hook: sample the variable's range and check the
 * expression is nondecreasing in varName (for operators documented as
 * monotone, e.g. sigmoid blends). Used by the search to reject violations.
 */
export function isMonotoneNondecreasing(
  expr: Expr,
  varName: string,
  baseVars: Readonly<Record<string, number>>,
  lo: number,
  hi: number,
  samples = 21,
): boolean {
  let prev = -Infinity;
  for (let i = 0; i < samples; i++) {
    const v = lo + ((hi - lo) * i) / (samples - 1);
    const y = evaluate(expr, { ...baseVars, [varName]: v });
    if (!Number.isFinite(y) || y < prev - 1e-9) return false;
    prev = y;
  }
  return true;
}

/**
 * Multi-view fusion: compose two hall-of-fame expressions as custom
 * operator inputs: wA * A + wB * B (weights from the fusion search).
 */
export function fuseExpressions(a: Expr, b: Expr, wA: number, wB: number): Expr {
  return {
    kind: "op",
    op: "+",
    args: [
      { kind: "op", op: "*", args: [{ kind: "const", value: wA }, a] },
      { kind: "op", op: "*", args: [{ kind: "const", value: wB }, b] },
    ],
  };
}

/** Pearson correlation (for the gate's >=0.05 r improvement check). */
export function pearsonR(xs: readonly number[], ys: readonly number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return Number.NaN;
  const mx = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = ys.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sxx += (xs[i]! - mx) * (xs[i]! - mx);
    syy += (ys[i]! - my) * (ys[i]! - my);
  }
  if (sxx === 0 || syy === 0) return 0;
  return sxy / Math.sqrt(sxx * syy);
}
