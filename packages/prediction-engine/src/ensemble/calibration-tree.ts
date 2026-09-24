/**
 * Probability calibration trees: localized recalibration by game regime.
 *
 * Research source: arXiv:1808.00111v2 — "Probability Calibration Trees".
 *
 * After global calibration, miscalibration often varies by region of the
 * input space (e.g. well-calibrated on favorites but overconfident on
 * underdogs). This module fits a regression tree on game-context attributes
 * (spread magnitude, total, weather band, rest differential, primetime and
 * divisional flags) with the out-of-sample model score as an extra feature;
 * each leaf predicts the local empirical outcome rate. Splits are chosen to
 * maximize RMSE reduction (the paper's eq. 3 pruning criterion is applied
 * as a minimum-gain gate), leaves require >= minLeaf games, and when no
 * split clears the gate the tree collapses to a single node — the paper's
 * fallback, equivalent to keeping the global model.
 *
 * Placed under ensemble/ (not calibration/) so it cannot be confused with
 * the live calibration path; it is a standalone research artifact.
 *
 * ACCEPTANCE GATE: ADOPT iff regional calibration improves test-window
 * RMSE/ECE over the global model alone with no overall degradation.
 * REJECT if the tree collapses to a single node every season (miscalibration
 * is genuinely global — then global scaling suffices).
 *
 * Additive research module — not wired into any live prediction path.
 */

export interface CalibRow {
  /** Out-of-sample model probability for the event. */
  score: number;
  /** Numeric game-context attributes. */
  context: Record<string, number>;
  /** Realized outcome: 1 if the event happened. */
  outcome: 0 | 1;
}

export interface CalibTreeNode {
  /** Leaf probability (local empirical rate), or null for split nodes. */
  prob: number | null;
  /** Context key this node splits on (split nodes only). */
  key?: string;
  /** Threshold: left = value <= threshold (split nodes only). */
  threshold?: number;
  left?: CalibTreeNode;
  right?: CalibTreeNode;
  /** Games reaching this node. */
  n: number;
}

export interface CalibTreeOptions {
  /** Minimum games per leaf (paper: >= 15). */
  minLeaf?: number;
  /** Minimum RMSE improvement to accept a split (eq. 3 pruning gate). */
  minGain?: number;
  /** Maximum tree depth. */
  maxDepth?: number;
}

function rmse(rows: readonly CalibRow[], prob: number): number {
  let s = 0;
  for (const r of rows) s += (r.outcome - prob) ** 2;
  return Math.sqrt(s / Math.max(1, rows.length));
}

function meanOutcome(rows: readonly CalibRow[]): number {
  return rows.reduce((a, r) => a + r.outcome, 0) / Math.max(1, rows.length);
}

interface Split {
  key: string;
  threshold: number;
  gain: number;
}

function bestSplit(
  rows: readonly CalibRow[],
  keys: readonly string[],
  minLeaf: number,
  baseRmse: number,
): Split | null {
  let best: Split | null = null;
  for (const key of keys) {
    const vals = [...new Set(rows.map((r) => r.context[key] ?? 0))].sort((a, b) => a - b);
    for (let i = 0; i < vals.length - 1; i++) {
      const threshold = ((vals[i] ?? 0) + (vals[i + 1] ?? 0)) / 2;
      const left = rows.filter((r) => (r.context[key] ?? 0) <= threshold);
      const right = rows.filter((r) => (r.context[key] ?? 0) > threshold);
      if (left.length < minLeaf || right.length < minLeaf) continue;
      const wRmse =
        (left.length * rmse(left, meanOutcome(left)) +
          right.length * rmse(right, meanOutcome(right))) /
        rows.length;
      const gain = baseRmse - wRmse;
      if (gain > 0 && (!best || gain > best.gain)) {
        best = { key, threshold, gain };
      }
    }
  }
  return best;
}

/**
 * Fit the calibration tree. Returns a single-node tree (global empirical
 * rate) when no split clears the gain gate — the paper's fallback.
 */
export function fitCalibrationTree(
  rows: readonly CalibRow[],
  opts: CalibTreeOptions = {},
): CalibTreeNode {
  if (rows.length === 0) throw new Error("fitCalibrationTree: no rows");
  const minLeaf = opts.minLeaf ?? 15;
  const minGain = opts.minGain ?? 1e-4;
  const maxDepth = opts.maxDepth ?? 4;
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r.context)))].sort();

  const grow = (subset: readonly CalibRow[], depth: number): CalibTreeNode => {
    const prob = meanOutcome(subset);
    const node: CalibTreeNode = { prob, n: subset.length };
    if (depth >= maxDepth || subset.length < 2 * minLeaf) return node;
    const split = bestSplit(subset, keys, minLeaf, rmse(subset, prob));
    if (!split || split.gain < minGain) return node;
    const left = subset.filter((r) => (r.context[split.key] ?? 0) <= split.threshold);
    const right = subset.filter((r) => (r.context[split.key] ?? 0) > split.threshold);
    node.prob = null;
    node.key = split.key;
    node.threshold = split.threshold;
    node.left = grow(left, depth + 1);
    node.right = grow(right, depth + 1);
    return node;
  };

  return grow(rows, 0);
}

/** Calibrated probability for a game context (score unused at predict time). */
export function predictCalibrated(
  tree: CalibTreeNode,
  context: Record<string, number>,
): number {
  let node = tree;
  while (node.prob === null) {
    const v = context[node.key ?? ""] ?? 0;
    node = v <= (node.threshold ?? 0) ? node.left! : node.right!;
  }
  return node.prob ?? 0.5;
}

/** Number of leaves in the tree (1 = collapsed to the global model). */
export function leafCount(tree: CalibTreeNode): number {
  if (tree.prob !== null) return 1;
  return leafCount(tree.left!) + leafCount(tree.right!);
}

/** In-sample RMSE of the tree's calibrated probabilities. */
export function treeRMSE(tree: CalibTreeNode, rows: readonly CalibRow[]): number {
  let s = 0;
  for (const r of rows) {
    const p = predictCalibrated(tree, r.context);
    s += (r.outcome - p) ** 2;
  }
  return Math.sqrt(s / Math.max(1, rows.length));
}
