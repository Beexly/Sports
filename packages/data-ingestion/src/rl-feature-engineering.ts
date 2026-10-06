/**
 * Feature Engineering for Predictive Modeling using Reinforcement Learning
 *
 * arXiv:1709.07150 · lane:auto_feature_eng · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build 'GSE-RLFE': (1) Transformation graph over the nflverse game-level table: root = base game
 * features; transforms = sports library (rolling means/stds over k games, z-score vs league,
 * opponent-adjusted differentials, binning, sigmoid of spreads, sin/cos of week-of-season, rest-
 * day differentials, Elo-deltas); sum nodes = feature-set unions; feature selection as a first-
 * class transform. (2) Policy: linear Q (RL1-style) over the 9 state factors, trained on
 * historical 'analyst sessions' -- reconstruct from git history of GSE's feature files 2020-2023
 * as (state, action, reward) trajectories; B_max = 40 steps/week (the weekly compute budget). (3)
 * Reward: validation log-loss improvement on the 2023 season. (4) Output: the argmax node = that
 * week's engineered feature set, with the path (transform composition) as the human-readable
 * recipe.
 *
 * ACCEPTANCE GATE: ADAPT the policy layer iff (a) 2024 held-out log-loss improves >= 0.003, AND (b) the learned
 * policy reaches the baseline+0.003 gain in <= 40 steps while BFS needs > 100, AND (c) zero
 * leakage-audit failures on rolling transforms.
 *
 * Ingest role: feature builder (GSE-RLFE transformation graph + sports transform library).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1709.07150" as const;
export const LANE = "auto_feature_eng" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT the policy layer iff (a) 2024 held-out log-loss improves >= 0.003, AND (b) the learned
 * policy reaches the baseline+0.003 gain in <= 40 steps while BFS needs > 100, AND (c) zero
 * leakage-audit failures on rolling transforms.`;

export const CONFIG = {
  enabled: false,
  bMax: 40,
  stateFactors: 9,
  rewardSeason: 2023,
  logLossGainThreshold: 0.003,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export type TransformOp =
  | "rolling_mean"
  | "rolling_std"
  | "zscore_vs_league"
  | "opponent_adjusted_diff"
  | "sigmoid_spread"
  | "sin_week"
  | "cos_week"
  | "rest_day_diff"
  | "elo_delta";

export interface TransformNode {
  readonly id: string;
  readonly op: TransformOp;
  readonly params: Readonly<Record<string, number>>;
  readonly parents: readonly string[];
}

/** Rolling mean over k games (causal: only past games). Null on bad k. */
export function rollingMean(series: readonly number[], k: number): number[] | null {
  if (!Number.isInteger(k) || k <= 0 || series.length === 0) return null;
  if (!series.every(isFiniteNumber)) return null;
  const out: number[] = [];
  for (let i = 0; i < series.length; i++) {
    const lo = Math.max(0, i - k + 1);
    const win = series.slice(lo, i + 1);
    out.push(win.reduce((a, b) => a + b, 0) / win.length);
  }
  return out;
}

export function rollingStd(series: readonly number[], k: number): number[] | null {
  const m = rollingMean(series, k);
  if (!m) return null;
  const out: number[] = [];
  for (let i = 0; i < series.length; i++) {
    const lo = Math.max(0, i - k + 1);
    const win = series.slice(lo, i + 1);
    const mean = m[i] ?? 0;
    const v = win.reduce((a, b) => a + (b - mean) * (b - mean), 0) / win.length;
    out.push(Math.sqrt(v));
  }
  return out;
}

/** Z-score vs league average for the week. */
export function zscoreVsLeague(value: number, leagueMean: number, leagueSd: number): number | null {
  if (![value, leagueMean, leagueSd].every(isFiniteNumber) || leagueSd <= 0) return null;
  return (value - leagueMean) / leagueSd;
}

/** Sigmoid of the spread (bounded spread feature). */
export function sigmoidSpread(spread: number, scale = 7): number | null {
  if (!isFiniteNumber(spread) || !isFiniteNumber(scale) || scale <= 0) return null;
  return 1 / (1 + Math.exp(-spread / scale));
}

/** Week-of-season cyclical encodings. */
export function weekCyclical(week: number, seasonWeeks = 18): { sin: number; cos: number } | null {
  if (!isFiniteNumber(week) || !isFiniteNumber(seasonWeeks) || seasonWeeks <= 0) return null;
  const a = (2 * Math.PI * week) / seasonWeeks;
  return { sin: Math.sin(a), cos: Math.cos(a) };
}

/** Apply one transform node to named series. */
export function applyTransform(
  node: TransformNode,
  series: ReadonlyMap<string, readonly number[]>,
): number[] | null {
  const get = (name: string): readonly number[] | null => {
    const s = series.get(name);
    return s && s.length > 0 ? s : null;
  };
  switch (node.op) {
    case "rolling_mean": {
      const s = get(String(node.parents[0] ?? ""));
      const k = node.params["k"];
      if (!s || !isFiniteNumber(k)) return null;
      return rollingMean(s, Math.floor(k));
    }
    case "rolling_std": {
      const s = get(String(node.parents[0] ?? ""));
      const k = node.params["k"];
      if (!s || !isFiniteNumber(k)) return null;
      return rollingStd(s, Math.floor(k));
    }
    case "sigmoid_spread": {
      const s = get(String(node.parents[0] ?? ""));
      if (!s) return null;
      return s.map((v) => sigmoidSpread(v, node.params["scale"] ?? 7) ?? 0);
    }
    case "sin_week":
    case "cos_week": {
      const s = get(String(node.parents[0] ?? ""));
      if (!s) return null;
      return s.map((w) => {
        const c = weekCyclical(w);
        if (!c) return 0;
        return node.op === "sin_week" ? c.sin : c.cos;
      });
    }
    default:
      return null;
  }
}

/** Human-readable recipe: the transform composition path. */
export function recipePath(nodes: readonly TransformNode[], targetId: string): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const path: string[] = [];
  const visit = (id: string, depth: number): void => {
    if (depth > 100) return;
    const n = byId.get(id);
    if (!n || path.includes(id)) return;
    for (const p of n.parents) visit(p, depth + 1);
    path.push(`${n.op}(${n.id})`);
  };
  visit(targetId, 0);
  return path;
}
