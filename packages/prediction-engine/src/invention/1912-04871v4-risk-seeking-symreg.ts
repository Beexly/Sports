/**
 * Risk-seeking policy-gradient fine-tuning for symbolic regression —
 * arXiv 1912.04871v4 ("Deep symbolic regression: Recovering mathematical
 * expressions from data via risk-seeking policy gradients").
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes
 * predictions and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: an RNN generates mathematical expression trees token by
 * token; instead of the standard REINFORCE baseline (mean reward), the
 * gradient uses the top-epsilon quantile of rewards as the baseline —
 * "risk-seeking" — so the policy chases the BEST expressions rather than
 * average-case fit. A constraint mask prunes invalid prefixes during
 * decoding.
 *
 * Improvement (record): Implement risk-seeking fine-tuning as a PySR
 * post-pass: embed PySR hall-of-fame expressions as starting programs and
 * run an RL loop (REINFORCE with top-epsilon quantile baseline,
 * epsilon~0.2) mutating expressions, rewarding held-out-season predictive r
 * under a hard constraint mask (forbid >1 nested trig, single-input
 * expressions, >15 nodes).
 *
 * ACCEPTANCE GATE: ADOPT the risk-seeking post-pass if its best <=15-node
 * expression beats the best PySR-only <=15-node expression by >=0.03 test r
 * on 2024-2025, with the constraint mask preventing degenerate solutions;
 * REJECT if the RL loop collapses to PySR's own hall-of-fame or
 * underperforms. (Gate requires 2024-2025 data + PySR; run in the lab.)
 */

export type Token =
  | { readonly kind: "const"; readonly value: number }
  | { readonly kind: "var"; readonly index: number }
  | { readonly kind: "op"; readonly name: "add" | "sub" | "mul" | "div" };

export type UnaryName = "neg" | "sin" | "cos" | "exp" | "log";

export interface LeafExpr {
  readonly kind: "leaf";
  readonly token: Token;
  readonly children: readonly [];
}

export interface UnaryExpr {
  readonly kind: "unary";
  readonly token: UnaryName;
  readonly children: readonly [ExprNode];
}

export interface BinaryExpr {
  readonly kind: "binary";
  readonly token: Token & { kind: "op" };
  readonly children: readonly [ExprNode, ExprNode];
}

export type ExprNode = LeafExpr | UnaryExpr | BinaryExpr;

export const TRIG_NAMES: ReadonlyArray<UnaryName> = ["sin", "cos"];

export function leafVar(index: number): ExprNode {
  return { kind: "leaf", token: { kind: "var", index }, children: [] };
}

export function leafConst(value: number): ExprNode {
  return { kind: "leaf", token: { kind: "const", value }, children: [] };
}

export function unary(
  name: UnaryName,
  child: ExprNode,
): ExprNode {
  return { kind: "unary", token: name, children: [child] };
}

export function binary(
  name: Token & { kind: "op" },
  left: ExprNode,
  right: ExprNode,
): ExprNode {
  return { kind: "binary", token: name, children: [left, right] };
}

export function countNodes(e: ExprNode): number {
  return 1 + e.children.reduce((t, c) => t + countNodes(c), 0);
}

/** Depth of the deepest chain of nested trig functions. */
export function nestedTrigDepth(e: ExprNode): number {
  const here =
    e.kind === "unary" && TRIG_NAMES.includes(e.token as UnaryName) ? 1 : 0;
  const below = e.children.reduce(
    (m, c) => Math.max(m, nestedTrigDepth(c)),
    0,
  );
  return here > 0 ? here + below : below;
}

export function distinctInputVars(e: ExprNode): Set<number> {
  const out = new Set<number>();
  const walk = (n: ExprNode) => {
    if (n.kind === "leaf") {
      const t = n.token;
      if (t.kind === "var") out.add(t.index);
    }
    for (const c of n.children) walk(c);
  };
  walk(e);
  return out;
}

/**
 * Hard constraint mask from the record: forbid >1 nested trig (i.e.
 * nestedTrigDepth >= 2), single-input expressions, >15 nodes.
 */
export function passesConstraintMask(e: ExprNode): boolean {
  if (countNodes(e) > 15) return false;
  if (nestedTrigDepth(e) >= 2) return false;
  if (distinctInputVars(e).size < 2) return false;
  return true;
}

export function evaluate(e: ExprNode, x: readonly number[]): number {
  switch (e.kind) {
    case "leaf": {
      const t = e.token;
      if (t.kind === "const") return t.value;
      if (t.kind === "var") return x[t.index] ?? 0;
      return 0; // op token on a leaf: malformed, treat as 0
    }
    case "unary": {
      const v = evaluate(e.children[0]!, x);
      switch (e.token as UnaryName) {
        case "neg":
          return -v;
        case "sin":
          return Math.sin(v);
        case "cos":
          return Math.cos(v);
        case "exp":
          return Math.exp(Math.min(v, 60));
        case "log":
          return Math.log(Math.abs(v) + 1e-9);
      }
    }
    case "binary": {
      const a = evaluate(e.children[0]!, x);
      const b = evaluate(e.children[1]!, x);
      const name = (e.token as Token & { kind: "op" }).name;
      switch (name) {
        case "add":
          return a + b;
        case "sub":
          return a - b;
        case "mul":
          return a * b;
        case "div":
          return Math.abs(b) < 1e-9 ? a : a / b;
      }
    }
  }
}

/** Pearson r between expression outputs and targets. */
export function predictiveR(
  e: ExprNode,
  xs: readonly (readonly number[])[],
  ys: readonly number[],
): number {
  const ps = xs.map((x) => evaluate(e, x));
  const n = xs.length;
  const mp = ps.reduce((t, v) => t + v, 0) / n;
  const my = ys.reduce((t, v) => t + v, 0) / n;
  let num = 0;
  let dp = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const dpv = ps[i]! - mp;
    const dyv = ys[i]! - my;
    num += dpv * dyv;
    dp += dpv * dpv;
    dy += dyv * dyv;
  }
  if (dp === 0 || dy === 0) return 0;
  return num / Math.sqrt(dp * dy);
}

export interface Program {
  readonly expr: ExprNode;
  /** Token-level log-probability under the current policy. */
  readonly logProb: number;
  readonly reward: number;
}

/**
 * Risk-seeking (top-epsilon quantile) baseline: the (1-epsilon) quantile of
 * the batch rewards. Standard REINFORCE subtracts the MEAN; the paper
 * subtracts the best-case quantile so gradients only push toward
 * top-percentile expressions.
 */
export function riskSeekingBaseline(
  rewards: readonly number[],
  epsilon = 0.2,
): number {
  if (rewards.length === 0) return 0;
  const sorted = [...rewards].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.floor((1 - epsilon) * sorted.length),
  );
  return sorted[idx]!;
}

/**
 * One REINFORCE-with-risk-seeking-baseline step: gradient ascent on
 * logProb for programs ABOVE the quantile baseline (risk-seeking), zero
 * (detached) below. Returns per-program adjusted advantages; the caller
 * applies them to the policy parameters. Deterministic given rewards.
 */
export function riskSeekingAdvantages(
  programs: readonly Program[],
  epsilon = 0.2,
): number[] {
  const baseline = riskSeekingBaseline(
    programs.map((p) => p.reward),
    epsilon,
  );
  return programs.map((p) => (p.reward >= baseline ? p.reward - baseline : 0));
}

/**
 * Mutation operators used as the RL action space over hall-of-fame
 * programs: swap a leaf constant, replace an operator, graft a subtree
 * with a fresh random subtree (bounded depth).
 */
export function mutate(e: ExprNode, rng: () => number, depth = 0): ExprNode {
  const r = rng();
  if (e.kind === "leaf") {
    const t = e.token as Token;
    if (t.kind === "const") {
      return leafConst(t.value * (0.5 + r)); // jitter
    }
    return leafVar(Math.floor(r * 3)); // re-pick input var
  }
  if (r < 0.35 && e.kind === "binary") {
    const ops = ["add", "sub", "mul", "div"] as const;
    const op = ops[Math.floor(rng() * ops.length)]!;
    return binary({ kind: "op", name: op }, e.children[0]!, e.children[1]!);
  }
  if (r < 0.5 && depth < 3) {
    // Graft: replace with a fresh random subtree.
    return randomExpr(rng, depth + 1);
  }
  const children = e.children.map((c) => mutate(c, rng, depth + 1));
  if (e.kind === "binary") {
    return binary(e.token, children[0]!, children[1]!);
  }
  return unary(e.token, children[0]!);
}

function randomExpr(rng: () => number, depth: number): ExprNode {
  if (depth <= 0 || rng() < 0.4) {
    return rng() < 0.6 ? leafVar(Math.floor(rng() * 3)) : leafConst(rng() * 2 - 1);
  }
  if (rng() < 0.5) {
    const ops = ["add", "sub", "mul", "div"] as const;
    const op = ops[Math.floor(rng() * ops.length)]!;
    return binary(
      { kind: "op", name: op },
      randomExpr(rng, depth - 1),
      randomExpr(rng, depth - 1),
    );
  }
  const us = ["sin", "cos", "neg", "exp"] as const;
  const u = us[Math.floor(rng() * us.length)]!;
  return unary(u, randomExpr(rng, depth - 1));
}

/**
 * Risk-seeking post-pass: given hall-of-fame programs (reward = test r),
 * run K mutation rounds; keep only mask-passing mutants that beat the best
 * hall-of-fame reward. Returns the best expression found and whether the
 * gate margin (>=0.03 test r) was reached.
 */
export function riskSeekingPostPass(
  hallOfFame: readonly Program[],
  xs: readonly (readonly number[])[],
  ys: readonly number[],
  rounds: number,
  rng: () => number,
): { readonly best: Program; readonly gateMarginReached: boolean } {
  let best = hallOfFame.reduce((a, b) => (b.reward > a.reward ? b : a));
  const baselineBest = best.reward;
  for (let round = 0; round < rounds; round++) {
    for (const parent of hallOfFame) {
      const child = mutate(parent.expr, rng);
      if (!passesConstraintMask(child)) continue;
      const r = predictiveR(child, xs, ys);
      if (r > best.reward) {
        best = { expr: child, logProb: parent.logProb - 0.1, reward: r };
      }
    }
  }
  return { best, gateMarginReached: best.reward - baselineBest >= 0.03 };
}

/** Gate-check helper: >=0.03 test-r improvement at <=15 nodes. */
export function passesGate(bestR: number, pysrBestR: number, nodes: number): boolean {
  return nodes <= 15 && bestR - pysrBestR >= 0.03;
}
