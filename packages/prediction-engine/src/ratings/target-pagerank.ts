/**
 * Target-network PageRank for NFL player performance assessment.
 *
 * Nodes = QB + skill players. Arcs:
 *   - target → QB on every target (even incompletions: separation/trust credit),
 *   - goal-node → scorer on TDs (6 arcs),
 *   - victim → defender on INTs.
 * Computes IPM-style centrality weekly from nflverse play data. Props edge:
 * players whose target-network centrality exceeds what their box-score
 * production implies (high-centrality, low recent yards) are buy candidates
 * on receptions/yards props. Team-strength feature: aggregate starter/top-11
 * offensive centrality differential as a team rating input.
 *
 * @see arXiv:1704.00583v1 — "A PageRank Model for Player Performance Assessment in Basketball, Soccer and Hockey"
 *
 * ACCEPTANCE GATE: ADOPT the centrality metric iff the centrality residual
 * has a significant positive coefficient (p < 0.05) for next-week receiving
 * yards beyond a targets+air-yards baseline on 2023–2025, OR the team
 * centrality differential improves week-ahead offensive EPA prediction MAE
 * by ≥ 3%. The gate is a backtest concern; this module is the pure network
 * kernel, not wired into any live path.
 */

export type ArcKind = "target" | "td" | "int";

export interface PlayArc {
  from: string;
  to: string;
  kind: ArcKind;
}

/** Arc weights: TDs dominate, every target still counts. */
const ARC_WEIGHT: Record<ArcKind, number> = { target: 1, td: 6, int: 3 };

/**
 * Build the weighted adjacency (out-arc normalization) from play arcs.
 * Returns nodes list and the column-stochastic transition matrix as
 * out-neighbor lists: trans[from] = [{to, p}].
 */
export function buildTransition(arcs: readonly PlayArc[]): {
  nodes: string[];
  trans: Map<string, Array<{ to: string; p: number }>>;
} {
  const outW = new Map<string, number>();
  const edges = new Map<string, Map<string, number>>();
  const nodes = new Set<string>();
  for (const a of arcs) {
    nodes.add(a.from);
    nodes.add(a.to);
    const w = ARC_WEIGHT[a.kind];
    outW.set(a.from, (outW.get(a.from) ?? 0) + w);
    const m = edges.get(a.from) ?? new Map<string, number>();
    m.set(a.to, (m.get(a.to) ?? 0) + w);
    edges.set(a.from, m);
  }
  const nodeList = [...nodes].sort();
  const trans = new Map<string, Array<{ to: string; p: number }>>();
  for (const n of nodeList) {
    const total = outW.get(n) ?? 0;
    const m = edges.get(n);
    if (!m || total <= 0) {
      // dangling node: teleport uniformly
      trans.set(
        n,
        nodeList.map((t) => ({ to: t, p: 1 / nodeList.length })),
      );
    } else {
      trans.set(
        n,
        [...m.entries()].map(([to, w]) => ({ to, p: w / total })),
      );
    }
  }
  return { nodes: nodeList, trans };
}

/**
 * Power-iteration PageRank with damping (default 0.85). Returns centrality
 * per node, summing to 1.
 */
export function pagerankCentrality(
  nodes: readonly string[],
  trans: ReadonlyMap<string, Array<{ to: string; p: number }>>,
  damping = 0.85,
  tol = 1e-10,
  maxIter = 1000,
): Record<string, number> {
  const n = nodes.length;
  if (n === 0) return {};
  let rank = new Map(nodes.map((nd) => [nd, 1 / n]));
  for (let it = 0; it < maxIter; it++) {
    const next = new Map<string, number>();
    let diff = 0;
    for (const nd of nodes) {
      let s = 0;
      for (const src of nodes) {
        const outs = trans.get(src) ?? [];
        for (const e of outs) {
          if (e.to === nd) s += (rank.get(src) ?? 0) * e.p;
        }
      }
      const v = (1 - damping) / n + damping * s;
      next.set(nd, v);
      diff += Math.abs(v - (rank.get(nd) ?? 0));
    }
    rank = next;
    if (diff < tol) break;
  }
  const total = [...rank.values()].reduce((a, b) => a + b, 0);
  return Object.fromEntries([...rank.entries()].map(([k, v]) => [k, v / total]));
}

/**
 * Centrality residual: centrality minus what box-score production implies
 * (linear fit of centrality on production). Positive residual + low recent
 * yards = buy candidate on props.
 */
export function centralityResiduals(
  centrality: Readonly<Record<string, number>>,
  production: Readonly<Record<string, number>>,
): Record<string, number> {
  const ids = Object.keys(centrality).filter((id) => id in production);
  if (ids.length < 3) return {};
  const xs = ids.map((id) => production[id] ?? 0);
  const ys = ids.map((id) => centrality[id] ?? 0);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const slope = sxx > 0 ? xs.reduce((s, x, i) => s + (x - mx) * ((ys[i] ?? 0) - my), 0) / sxx : 0;
  const out: Record<string, number> = {};
  for (const id of ids) {
    out[id] = (centrality[id] ?? 0) - (my + slope * ((production[id] ?? 0) - mx));
  }
  return out;
}

/**
 * Team centrality differential: sum of top-`k` offensive centralities for
 * team A minus team B — a team-strength rating input.
 */
export function teamCentralityDifferential(
  centrality: Readonly<Record<string, number>>,
  teamOf: (id: string) => string,
  teamA: string,
  teamB: string,
  k = 11,
): number {
  const top = (team: string): number =>
    Object.keys(centrality)
      .filter((id) => teamOf(id) === team)
      .map((id) => centrality[id] ?? 0)
      .sort((a, b) => b - a)
      .slice(0, k)
      .reduce((a, b) => a + b, 0);
  return top(teamA) - top(teamB);
}
