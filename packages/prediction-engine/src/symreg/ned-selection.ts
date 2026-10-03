/**
 * NED-based structural selection for symbolic regression (arXiv 2206.10540).
 *
 * Hardens GSE's SR pipeline against the paper's vulnerability:
 *  - NED: normalized tree-edit distance to domain reference forms
 *    (e.g. logistic in EPA margin) as a structural evaluation alongside R^2;
 *  - selection rule: among equations within 1% validation Brier of the
 *    best, prefer the lowest NED (structural Occam's razor);
 *  - acceptance test: inject 3 log-uniform dummy columns into the weekly
 *    team-stat matrix and audit what fraction of selected PySR equations
 *    include dummies (extended with correlated dummies: noisy copies of
 *    real features).
 *
 * ACCEPTANCE GATE: ADAPT iff the dummy audit finds >= 30% of currently
 * selected equations include injected dummies (vulnerability is live) OR
 * the mini user study replicates the paper (NED correlates with analyst
 * plausibility ratings at |PCC| >= 0.3 while R^2 does not).
 *
 * Research-only module. Not wired into any live selection path.
 */

export type ExprNode =
  | { kind: "const"; value: number }
  | { kind: "var"; name: string }
  | { kind: "unary"; op: string; arg: ExprNode }
  | { kind: "binary"; op: string; left: ExprNode; right: ExprNode };

export function v(name: string): ExprNode {
  return { kind: "var", name };
}
export function c(value: number): ExprNode {
  return { kind: "const", value };
}
export function u(op: string, arg: ExprNode): ExprNode {
  return { kind: "unary", op, arg };
}
export function b(op: string, left: ExprNode, right: ExprNode): ExprNode {
  return { kind: "binary", op, left, right };
}

/** Number of nodes in the expression tree. */
export function treeSize(t: ExprNode): number {
  switch (t.kind) {
    case "const":
    case "var":
      return 1;
    case "unary":
      return 1 + treeSize(t.arg);
    case "binary":
      return 1 + treeSize(t.left) + treeSize(t.right);
  }
}

function relabelCost(a: ExprNode, b: ExprNode): number {
  if (a.kind !== b.kind) return 1;
  switch (a.kind) {
    case "const":
      return 0; // constants match structurally regardless of value
    case "var":
      return (b as { name: string }).name === a.name ? 0 : 1;
    case "unary":
      return (b as { op: string }).op === a.op ? 0 : 1;
    case "binary":
      return (b as { op: string }).op === a.op ? 0 : 1;
  }
}

function children(t: ExprNode): ExprNode[] {
  switch (t.kind) {
    case "const":
    case "var":
      return [];
    case "unary":
      return [t.arg];
    case "binary":
      return [t.left, t.right];
  }
}

/**
 * Ordered tree-edit distance for small expression trees: min cost of
 * relabel/insert/delete turning a into b (unit costs).
 */
export function treeEditDistance(a: ExprNode, b: ExprNode): number {
  const memo = new Map<string, number>();
  function ted(x: ExprNode, y: ExprNode): number {
    const k = JSON.stringify(x) + "|" + JSON.stringify(y);
    const hit = memo.get(k);
    if (hit !== undefined) return hit;
    const cx = children(x);
    const cy = children(y);
    let best: number;
    if (cx.length === 0 && cy.length === 0) {
      best = relabelCost(x, y);
    } else if (cx.length === 0) {
      best = 1 + cy.reduce((s, n) => s + treeSize(n), 0);
    } else if (cy.length === 0) {
      best = 1 + cx.reduce((s, n) => s + treeSize(n), 0);
    } else {
      // Align children pairwise (ordered); allow relabel of the roots.
      const first = ted(cx[0] as ExprNode, cy[0] as ExprNode);
      const rest =
        cx.length > 1 && cy.length > 1
          ? ted(cx[1] as ExprNode, cy[1] as ExprNode)
          : Math.abs(cx.length - cy.length) +
            (cx.length > 1 ? treeSize(cx[1] as ExprNode) : 0) +
            (cy.length > 1 ? treeSize(cy[1] as ExprNode) : 0);
      best = Math.min(
        relabelCost(x, y) + first + rest,
        1 + treeSize(y), // delete x, insert y
        1 + treeSize(x), // delete y, insert x
      );
    }
    memo.set(k, best);
    return best;
  }
  return ted(a, b);
}

/**
 * NED: tree-edit distance normalized by the larger tree size, in [0, 1].
 */
export function ned(a: ExprNode, b: ExprNode): number {
  const d = treeEditDistance(a, b);
  const norm = Math.max(treeSize(a), treeSize(b), 1);
  return Math.min(1, d / norm);
}

export interface Candidate {
  name: string;
  expr: ExprNode;
  /** Validation Brier (lower is better). */
  brier: number;
}

/**
 * Structural Occam's razor: among candidates within 1% validation Brier
 * of the best, select the one with the lowest NED to the reference form.
 */
export function selectByNed(
  candidates: readonly Candidate[],
  reference: ExprNode,
  tol = 0.01,
): Candidate {
  if (candidates.length === 0) throw new Error("selectByNed: no candidates");
  const bestBrier = Math.min(...candidates.map((cd) => cd.brier));
  const eligible = candidates.filter((cd) => cd.brier <= bestBrier * (1 + tol));
  let best = eligible[0] as Candidate;
  let bestNed = ned(best.expr, reference);
  for (const cd of eligible.slice(1)) {
    const n = ned(cd.expr, reference);
    if (n < bestNed) {
      bestNed = n;
      best = cd;
    }
  }
  return best;
}

/**
 * Dummy-column audit: fraction of selected equations referencing any
 * injected dummy variable name.
 */
export function dummyAudit(
  selected: readonly ExprNode[],
  dummyNames: ReadonlySet<string>,
): { fraction: number; flagged: number } {
  if (selected.length === 0) throw new Error("dummyAudit: no equations");
  const uses = (t: ExprNode): boolean => {
    if (t.kind === "var") return dummyNames.has(t.name);
    return children(t).some(uses);
  };
  const flagged = selected.filter(uses).length;
  return { fraction: flagged / selected.length, flagged };
}
