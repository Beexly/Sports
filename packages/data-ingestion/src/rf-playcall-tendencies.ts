/**
 * Causal mediation analysis for stochastic interventions
 *
 * arXiv:1901.02776v2 · lane:causal_injury · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Adopt the paper's stochastic-intervention causal mediation machinery (the medshift package) to
 * decompose the causal effect of wind speed (continuous exposure A) on total points (Y) into a
 * direct effect (physics: pass efficiency) vs an indirect effect mediated by play-calling (Z =
 * deep-pass rate / neutral pass rate / pace), with confounders W = temperature, precipitation,
 * dome/outdoor, team offensive/defensive EPA priors, week, rest; intervention = modified treatment
 * policy d(a,w) = max(a - delta, 0), 'what if wind were delta mph lower' (Example 1 analog), delta
 * in {5, 10} mph; nuisance regressions via Super Learner (xgboost + ranger + glmnet + HAL) with
 * 5-fold cross-fitting; direct = theta-hat - Y-bar, indirect = psi-hat - theta-hat; Wald CIs from
 * the EIF variance; argue A3 explicitly and run the no-direct-effect uniform test as a
 * specification check. This is new to the corpus: no ledger does mediation analysis, and GSE's
 * luck-layer work decomposes variance, not causal pathways -- a weather->totals analysis today
 * cannot separate the direct physical path (wind on passes) from the mediated path (wind ->
 * conservative play-calling -> fewer deep shots). Serving: offline research artifact -- one table
 * per season of direct vs indirect wind effect on totals. Improvement: extend to multiple ordered
 * mediators (wind -> play-calling -> time-of-possession -> points) by chaining two medshift
 * decompositions -- beyond the paper's single-mediator-layer setup; if the second-stage indirect
 * path dominates, the totals adjustment should key off pace projections rather than raw wind
 * speed.
 *
 * ACCEPTANCE GATE: Adopt the medshift mediation module into the totals-model weather adjustment if on 2015-2022:
 * (a) PIIE at delta=10 mph is significant at 5% with the expected sign (wind reduction -> more
 * deep passes -> more points), (b) the sum PIDE+PIIE agrees in sign with the naive total wind
 * effect, and (c) the holdout 2023-2024 PIIE keeps its sign. Reject if PIIE is null while the
 * naive total effect is significant (mediation adds nothing -- a single wind coefficient
 * suffices), or if the direct/indirect split is unstable across fit/holdout windows (sign flip),
 * or if A3 cannot be defended after game-script controls.
 *
 * Ingest role: feature builder (GBM/RF play-call tendency features; RF native, GBM-equivalent).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1901.02776v2" as const;
export const LANE = "causal_injury" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt the medshift mediation module into the totals-model weather adjustment if on 2015-2022:
 * (a) PIIE at delta=10 mph is significant at 5% with the expected sign (wind reduction -> more
 * deep passes -> more points), (b) the sum PIDE+PIIE agrees in sign with the naive total wind
 * effect, and (c) the holdout 2023-2024 PIIE keeps its sign. Reject if PIIE is null while the
 * naive total effect is significant (mediation adds nothing -- a single wind coefficient
 * suffices), or if the direct/indirect split is unstable across fit/holdout windows (sign flip),
 * or if A3 cannot be defended after game-script controls.`;

export const CONFIG = {
  enabled: false,
  bMax: 40,
  models: ["random-forest", "gbm-equivalent"],
  logLossGainThreshold: 0.004,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface TreeNode {
  readonly feature: number;
  readonly threshold: number;
  readonly left: TreeNode | number;
  readonly right: TreeNode | number;
}

export function isTreeNode(x: unknown): x is TreeNode {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  const branch = (b: unknown): boolean => typeof b === "number" || isTreeNode(b);
  return Number.isInteger(o["feature"]) && isFiniteNumber(o["threshold"]) && branch(o["left"]) && branch(o["right"]);
}

export interface Forest {
  readonly trees: ReadonlyArray<{ root: TreeNode; weight: number }>;
  readonly nFeatures: number;
}

/** Predict with one tree (leaf = run probability). */
export function treePredict(node: TreeNode | number, features: readonly number[]): number | null {
  if (typeof node === "number") return node >= 0 && node <= 1 ? node : null;
  if (!features.every(isFiniteNumber)) return null;
  const v = features[node.feature];
  if (v === undefined) return null;
  return treePredict(v <= node.threshold ? node.left : node.right, features);
}

/** Forest = weighted average of tree run-probabilities. */
export function forestRunProb(forest: Forest, features: readonly number[]): number | null {
  if (forest.trees.length === 0 || features.length !== forest.nFeatures) return null;
  let sum = 0;
  let wSum = 0;
  for (const t of forest.trees) {
    if (!isFiniteNumber(t.weight) || t.weight < 0 || !isTreeNode(t.root)) return null;
    const p = treePredict(t.root, features);
    if (p === null) return null;
    sum += t.weight * p;
    wSum += t.weight;
  }
  if (wSum === 0) return null;
  return sum / wSum;
}

/** Variable importance: total weighted split counts per feature. */
export function variableImportance(forest: Forest): number[] | null {
  if (forest.trees.length === 0) return null;
  const imp = new Array<number>(forest.nFeatures).fill(0);
  const walk = (n: TreeNode | number, w: number): void => {
    if (typeof n === "number") return;
    const slot = imp[n.feature];
    if (slot !== undefined) imp[n.feature] = slot + w;
    walk(n.left, w);
    walk(n.right, w);
  };
  for (const t of forest.trees) {
    if (!isTreeNode(t.root)) return null;
    walk(t.root, t.weight);
  }
  const total = imp.reduce((a, b) => a + b, 0);
  if (total === 0) return imp;
  return imp.map((v) => v / total);
}

/** Train-once stump forest builder (offline recipe: greedy Gini stumps). */
export function giniImpurity(p: number): number | null {
  if (!isFiniteNumber(p) || p < 0 || p > 1) return null;
  return 2 * p * (1 - p);
}
