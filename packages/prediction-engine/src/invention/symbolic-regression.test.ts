import { describe, it, expect } from "vitest";
import {
  evaluate,
  countNodes,
  paretoFrontier,
  isMonotoneNondecreasing,
  fuseExpressions,
  pearsonR,
  SR_OPERATORS,
  type Expr,
} from "./symbolic-regression.js";

// ============================================================
// arXiv 2305.01582v3 — symbolic regression. Additive invention.
// ============================================================

const v = (name: string): Expr => ({ kind: "var", name });
const c = (value: number): Expr => ({ kind: "const", value });
const op = (o: string, ...args: Expr[]): Expr => ({ kind: "op", op: o, args });

describe("symbolic regression — 2305.01582v3", () => {
  it("SR_OPERATORS includes the custom sigmoid/relu operators", () => {
    expect(SR_OPERATORS).toContain("sigmoid");
    expect(SR_OPERATORS).toContain("relu");
    expect(SR_OPERATORS).toContain("div");
  });

  it("evaluate handles the operator set", () => {
    expect(evaluate(op("+", c(1), c(2)), {})).toBe(3);
    expect(evaluate(op("div", c(1), c(0)), {})).toBeNaN();
    expect(evaluate(op("sigmoid", c(0)), {})).toBeCloseTo(0.5, 10);
    expect(evaluate(op("relu", c(-3)), {})).toBe(0);
    expect(evaluate(op("sqrt", c(-1)), {})).toBeNaN();
    expect(evaluate(v("epa"), { epa: 0.5 })).toBe(0.5);
    expect(evaluate(v("missing"), {})).toBeNaN();
  });

  it("countNodes counts the tree", () => {
    // sigmoid(w * epa + b): 1 + (1 + (1+1+1) + 1) = 6? compute: + has 3 args...
    const expr = op("sigmoid", op("+", op("*", v("w"), v("epa")), v("b")));
    expect(countNodes(expr)).toBe(6);
    expect(countNodes(c(1))).toBe(1);
  });

  it("paretoFrontier keeps nondominated candidates", () => {
    const mk = (error: number, nodes: number): { expr: Expr; error: number } => ({
      // Build a tree with exactly `nodes` consts summed: node count = 2*nodes-1.
      expr: op("+", ...Array.from({ length: nodes }, () => c(1))),
      error,
    });
    const a = mk(0.1, 3); // 5 nodes
    const b = mk(0.2, 2); // 3 nodes
    const d = mk(0.15, 3); // dominated by a (worse error, same nodes)
    const front = paretoFrontier([a, b, d]);
    expect(front.length).toBe(2);
    expect(front).toContain(a);
    expect(front).toContain(b);
  });

  it("isMonotoneNondecreasing checks the hook", () => {
    const mono = op("sigmoid", v("x"));
    expect(isMonotoneNondecreasing(mono, "x", {}, -5, 5)).toBe(true);
    const nonMono = op("-", op("pow", v("x"), c(2)), v("x")); // x^2 - x
    expect(isMonotoneNondecreasing(nonMono, "x", {}, -2, 2)).toBe(false);
  });

  it("fuseExpressions composes two views", () => {
    const fused = fuseExpressions(v("a"), v("b"), 0.6, 0.4);
    expect(evaluate(fused, { a: 10, b: 20 })).toBeCloseTo(14, 10);
    expect(countNodes(fused)).toBeGreaterThan(countNodes(v("a")));
  });

  it("pearsonR matches known values", () => {
    expect(pearsonR([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10);
    expect(pearsonR([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1, 10);
    expect(pearsonR([1], [1])).toBeNaN();
  });
});
