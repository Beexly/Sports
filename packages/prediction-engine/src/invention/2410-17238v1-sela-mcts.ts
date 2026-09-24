/**
 * SELA-style hierarchical MCTS for nightly signal discovery —
 * arXiv 2410.17238v1 ("SELA: Tree-Search Enhanced LLM Agents for Automated
 * Machine Learning").
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes
 * predictions and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: SELA treats AutoML as a tree search — an insight proposer
 * generates candidate insights, and Monte Carlo Tree Search allocates trial
 * budget across them with UCB, rolling out experiment pipelines and
 * backpropagating scores. Adapted here as a hierarchy over GSE signal
 * families (matchup / weather / rest / market / special-teams as level-1
 * branches, hypotheses as level-2 leaves) with progressive widening, so
 * thin-lane winners like special teams and referees get explicitly
 * budgeted early exploration instead of being starved by round-robin.
 *
 * Improvement (record): Upgrade the nightly signal-discovery agent with
 * SELA-style MCTS structured as a hierarchy over signal families (matchup /
 * weather / rest / market / special-teams as level-1 branches, hypotheses
 * as level-2) with progressive widening, so thin-lane winners like special
 * teams and referees get explicitly budgeted early exploration instead of
 * being starved.
 *
 * ACCEPTANCE GATE: ADOPT if: MCTS arm finds >=1.5x the gate-passing signals
 * of round-robin at equal budget, wasted rollouts drop by >=30%, and the
 * tree's value estimates correlate (Spearman >= 0.5) with final holdout
 * scores. REJECT if MCTS ~= round-robin within 20%. (Gate requires nightly
 * backtest budget; run via the discovery harness.)
 */

export interface HypothesisNode {
  readonly id: string;
  /** Level-1 branch (signal family). */
  readonly family: string;
  /** Level-2 hypothesis description. */
  readonly hypothesis: string;
  /** True (simulated) holdout quality — unknown to the search. */
  readonly trueQuality: number;
}

export interface MCTSNode {
  readonly id: string;
  readonly hypothesis: HypothesisNode | null; // null = family/root node
  readonly family: string | null;
  visits: number;
  totalReward: number;
  children: MCTSNode[];
  /** Whether a backtest rollout was spent on this node. */
  rolledOut: boolean;
  /** Gate-pass flag from the last rollout. */
  gatePassed: boolean;
}

export function makeRootNode(families: readonly string[]): MCTSNode {
  return {
    id: "root",
    hypothesis: null,
    family: null,
    visits: 0,
    totalReward: 0,
    rolledOut: false,
    gatePassed: false,
    children: families.map((f) => ({
      id: `family:${f}`,
      hypothesis: null,
      family: f,
      visits: 0,
      totalReward: 0,
      rolledOut: false,
      gatePassed: false,
      children: [],
    })),
  };
}

export function meanValue(n: MCTSNode): number {
  return n.visits > 0 ? n.totalReward / n.visits : 0;
}

/** UCB1 selection score. */
export function ucbScore(
  node: MCTSNode,
  parentVisits: number,
  exploration = Math.SQRT2,
): number {
  if (node.visits === 0) return Infinity;
  return (
    meanValue(node) +
    exploration * Math.sqrt(Math.log(Math.max(parentVisits, 1)) / node.visits)
  );
}

/**
 * Progressive widening: allow at most ceil(c * visits^alpha) hypothesis
 * children per family, so exploration budget widens gradually as evidence
 * accumulates (keeps thin lanes from being drowned out early).
 */
export function wideningLimit(visits: number, c = 1.5, alpha = 0.5): number {
  return Math.max(1, Math.ceil(c * Math.pow(Math.max(visits, 1), alpha)));
}

export interface MCTSConfig {
  readonly exploration: number;
  readonly wideningC: number;
  readonly wideningAlpha: number;
  /** Budget: total rollouts allowed this night. */
  readonly budget: number;
}

/**
 * One MCTS rollout: select (UCB down to a leaf), expand a family with a new
 * hypothesis candidate if under its widening limit, simulate a backtest
 * (noisy draw around trueQuality), backpropagate.
 */
export function rollout(
  root: MCTSNode,
  candidates: ReadonlyMap<string, HypothesisNode[]>,
  config: MCTSConfig,
  gateThreshold: number,
  rng: () => number,
): { readonly hypothesis: HypothesisNode; readonly score: number } | null {
  // SELECT: UCB over families.
  let familyNode: MCTSNode | null = null;
  let best = -Infinity;
  for (const child of root.children) {
    const s = ucbScore(child, root.visits, config.exploration);
    if (s > best) {
      best = s;
      familyNode = child;
    }
  }
  if (!familyNode) return null;
  const family = familyNode.family!;
  const pool = candidates.get(family) ?? [];
  const available = pool.filter(
    (h) => !familyNode!.children.some((c) => c.id === `hyp:${h.id}`),
  );
  let leaf: MCTSNode;
  if (available.length > 0 && familyNode.children.length < wideningLimit(familyNode.visits, config.wideningC, config.wideningAlpha)) {
    // EXPAND: add the first untried candidate (deterministic; candidates
    // arrive in proposer-rank order).
    const h = available[0]!;
    leaf = {
      id: `hyp:${h.id}`,
      hypothesis: h,
      family,
      visits: 0,
      totalReward: 0,
      rolledOut: false,
      gatePassed: false,
      children: [],
    };
    familyNode.children.push(leaf);
  } else if (familyNode.children.length > 0) {
    // SELECT leaf by UCB within the family.
    leaf = familyNode.children[0]!;
    let lb = -Infinity;
    for (const child of familyNode.children) {
      const s = ucbScore(child, familyNode.visits, config.exploration);
      if (s > lb) {
        lb = s;
        leaf = child;
      }
    }
  } else {
    return null;
  }
  // SIMULATE: noisy backtest around the true quality.
  const h = leaf.hypothesis!;
  const score = h.trueQuality + (rng() - 0.5) * 0.2;
  leaf.visits += 1;
  leaf.totalReward += score;
  leaf.rolledOut = true;
  leaf.gatePassed = score >= gateThreshold;
  familyNode.visits += 1;
  familyNode.totalReward += score;
  root.visits += 1;
  root.totalReward += score;
  return { hypothesis: h, score };
}

/** Run MCTS for `budget` rollouts; return the found gate-passing hypotheses. */
export function runMCTSSearch(
  families: readonly string[],
  candidates: ReadonlyMap<string, HypothesisNode[]>,
  config: MCTSConfig,
  gateThreshold: number,
  rng: () => number,
): { readonly root: MCTSNode; readonly gatePassers: HypothesisNode[] } {
  const root = makeRootNode(families);
  for (let i = 0; i < config.budget; i++) {
    rollout(root, candidates, config, gateThreshold, rng);
  }
  const gatePassers: HypothesisNode[] = [];
  for (const fam of root.children) {
    for (const leaf of fam.children) {
      if (leaf.gatePassed && leaf.hypothesis) gatePassers.push(leaf.hypothesis);
    }
  }
  return { root, gatePassers };
}

/** Round-robin baseline at equal budget: iterate families in fixed order. */
export function runRoundRobin(
  families: readonly string[],
  candidates: ReadonlyMap<string, HypothesisNode[]>,
  budget: number,
  gateThreshold: number,
  rng: () => number,
): HypothesisNode[] {
  const passers: HypothesisNode[] = [];
  let idx = 0;
  const queues = new Map<string, number>();
  for (let i = 0; i < budget; i++) {
    const family = families[idx % families.length]!;
    const pool = candidates.get(family) ?? [];
    const q = queues.get(family) ?? 0;
    if (q < pool.length) {
      const h = pool[q]!;
      queues.set(family, q + 1);
      const score = h.trueQuality + (rng() - 0.5) * 0.2;
      if (score >= gateThreshold) passers.push(h);
    }
    idx++;
  }
  return passers;
}

/** Wasted rollouts: rollouts on hypotheses that fail the gate. */
export function wastedRolloutRate(root: MCTSNode): number {
  let total = 0;
  let wasted = 0;
  for (const fam of root.children) {
    for (const leaf of fam.children) {
      if (leaf.rolledOut) {
        total++;
        if (!leaf.gatePassed) wasted++;
      }
    }
  }
  return total > 0 ? wasted / total : 0;
}

/** Spearman rank correlation between tree value estimates and holdout scores. */
export function spearman(
  xs: readonly number[],
  ys: readonly number[],
): number {
  if (xs.length !== ys.length || xs.length < 2) return 0;
  const rank = (arr: readonly number[]): number[] => {
    const order = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array<number>(arr.length);
    let i = 0;
    while (i < order.length) {
      let j = i;
      while (j + 1 < order.length && order[j + 1]!.v === order[i]!.v) j++;
      const avg = (i + j) / 2;
      for (let k = i; k <= j; k++) ranks[order[k]!.i] = avg;
      i = j + 1;
    }
    return ranks;
  };
  const rx = rank(xs);
  const ry = rank(ys);
  const n = xs.length;
  const mx = rx.reduce((t, v) => t + v, 0) / n;
  const my = ry.reduce((t, v) => t + v, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = rx[i]! - mx;
    const b = ry[i]! - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return 0;
  return num / Math.sqrt(dx * dy);
}

/** Tree value estimates vs true holdout qualities for the Spearman check. */
export function valueEstimateVsTruth(root: MCTSNode): {
  readonly estimates: number[];
  readonly truths: number[];
} {
  const estimates: number[] = [];
  const truths: number[] = [];
  for (const fam of root.children) {
    for (const leaf of fam.children) {
      if (leaf.hypothesis && leaf.visits > 0) {
        estimates.push(meanValue(leaf));
        truths.push(leaf.hypothesis.trueQuality);
      }
    }
  }
  return { estimates, truths };
}

/**
 * Gate check from the record: MCTS finds >=1.5x round-robin gate passers,
 * waste drops >=30%, Spearman >= 0.5.
 */
export function passesSelaGate(
  mctsPassers: number,
  rrPassers: number,
  mctsWaste: number,
  baselineWaste: number,
  spearmanRho: number,
): boolean {
  const discoveryRatio = rrPassers > 0 ? mctsPassers / rrPassers : mctsPassers > 0 ? Infinity : 0;
  const wasteDrop = baselineWaste > 0 ? (baselineWaste - mctsWaste) / baselineWaste : 0;
  return discoveryRatio >= 1.5 && wasteDrop >= 0.3 && spearmanRho >= 0.5;
}
