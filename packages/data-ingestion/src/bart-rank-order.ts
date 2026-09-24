/**
 * Static and Dynamic BART for Rank-Order Data
 *
 * arXiv:2308.10231v5 · lane:team_ratings · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Port ARROBART to NFL weekly team strength: latent scores z_{i,t} = true strength of team i in
 * week t; observation = weekly game outcomes via a score/margin likelihood (point differential ~
 * N(z_i - z_j + HFA, sigma^2_game)) replacing the rank observation model; latent AR(1)-BART
 * transition z_{i,t} = f(z_{i,t-1}, covariates) + noise with covariates = injury-adjusted roster
 * value, rest days, EPA/play rolling means, FTN charting splits; Gibbs inference (element-wise
 * latent sampling + BART backfitting), S=25 trees - with a regime-switching BART transition:
 * f_regime(z_{t-1}, covariates) where regime in {stable, shock} is a latent binary state triggered
 * by QB injury / coaching change indicators, producing the bimodal jump behavior the paper's
 * smooth BART-AR cannot.
 *
 * ACCEPTANCE GATE: ADOPT the BART-dynamic strength model if it beats the linear AR baseline by >=0.003 mean log-
 * loss on weeks 12-18, 2015-2025 pooled, AND wins Kendall tau vs end-of-season SRS in >=6 of 10
 * seasons; ADAPT if it wins on only one metric (keep as an ensemble component); REJECT if it loses
 * on both.
 *
 * Ingest role: feature builder (BART for rank-order data: tree-sum rank model + partial dependence).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2308.10231v5" as const;
export const LANE = "team_ratings" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the BART-dynamic strength model if it beats the linear AR baseline by >=0.003 mean log-
 * loss on weeks 12-18, 2015-2025 pooled, AND wins Kendall tau vs end-of-season SRS in >=6 of 10
 * seasons; ADAPT if it wins on only one metric (keep as an ensemble component); REJECT if it loses
 * on both.`;

export const CONFIG = {
  enabled: false,
  model: "static/dynamic BART",
  trees: 50,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface RankObs {
  readonly team: string;
  readonly rank: number;
  readonly features: readonly number[];
}

/** Rank likelihood under a Plackett-Luce model with team strengths. */
export function plackettLuceLogLik(order: readonly string[], strengths: Readonly<Record<string, number>>): number | null {
  if (order.length === 0) return null;
  let ll = 0;
  const remaining = new Set(order);
  for (let i = 0; i < order.length; i++) {
    const t = order[i] ?? "";
    const st = strengths[t];
    if (st === undefined || !isFiniteNumber(st)) return null;
    let denom = 0;
    for (const r of remaining) {
      const s = strengths[r] ?? 0;
      if (!isFiniteNumber(s)) return null;
      denom += Math.exp(s);
    }
    if (denom === 0) return null;
    ll += st - Math.log(denom);
    remaining.delete(t);
  }
  return ll;
}

export interface BartNode {
  readonly feature: number;
  readonly threshold: number;
  readonly left: BartNode | number;
  readonly right: BartNode | number;
}

export function isBartNode(x: unknown): x is BartNode {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  const branch = (b: unknown): boolean => typeof b === "number" || isBartNode(b);
  return Number.isInteger(o["feature"]) && isFiniteNumber(o["threshold"]) && branch(o["left"]) && branch(o["right"]);
}

/** Tree-sum predictor: sum of regression-tree leaf values (BART-lite). */
export function treeSumPredict(trees: ReadonlyArray<unknown>, x: readonly number[]): number | null {
  if (trees.length === 0 || x.length === 0 || !x.every(isFiniteNumber)) return null;
  let s = 0;
  for (const tree of trees) {
    if (!isBartNode(tree)) return null;
    let node: BartNode | number = tree;
    let leaf: number | null = null;
    for (let depth = 0; depth < 100; depth++) {
      if (typeof node === "number") {
        leaf = node;
        break;
      }
      const v: number | undefined = x[node.feature];
      if (v === undefined) return null;
      node = v <= node.threshold ? node.left : node.right;
    }
    if (leaf === null || !isFiniteNumber(leaf)) return null;
    s += leaf;
  }
  return s;
}

/** Partial dependence of the tree-sum on one feature over a grid. */
export function partialDependence(
  trees: ReadonlyArray<unknown>,
  base: readonly number[],
  feature: number,
  grid: readonly number[],
): number[] | null {
  if (!Number.isInteger(feature) || feature < 0 || feature >= base.length) return null;
  if (grid.length === 0 || !grid.every(isFiniteNumber)) return null;
  const out: number[] = [];
  for (const g of grid) {
    const x = base.map((v, i) => (i === feature ? g : v));
    const p = treeSumPredict(trees, x);
    if (p === null) return null;
    out.push(p);
  }
  return out;
}

/** Kendall's tau between predicted order and observed ranks. */
export function rankAgreement(predOrder: readonly string[], trueRanks: Readonly<Record<string, number>>): number | null {
  if (predOrder.length < 2) return null;
  let conc = 0;
  let disc = 0;
  for (let i = 0; i < predOrder.length; i++) {
    for (let j = i + 1; j < predOrder.length; j++) {
      const ri = trueRanks[predOrder[i] ?? ""];
      const rj = trueRanks[predOrder[j] ?? ""];
      if (ri === undefined || rj === undefined || ri === rj) continue;
      if (ri < rj) conc++;
      else disc++;
    }
  }
  if (conc + disc === 0) return null;
  return (conc - disc) / (conc + disc);
}
