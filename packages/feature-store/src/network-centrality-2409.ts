/**
 * Network-centrality metric set for NGS target networks (per-quarter, motifs)
 *
 * Research port: arXiv:2409.13098
 * Normalized lane: experimental | Doctrine: PROPRIETARY_EDGE
 *
 * Fuses the paper's network-centrality metric set into NGS target networks: per-quarter passing networks, flow motifs (triangles), dynamic node sets for in-game personnel changes. Pure graph metrics on adjacency snapshots; the 3-class cover/push/no-cover ablation is a live-data gate.
 *
 * ACCEPTANCE GATE: Reproduction criterion: reimplement on the public passing-network dataset with time-ordered replication; a modest honest paper — adopt metrics only if the replication holds. Metrics here, verdict in the lab.
 */

export interface QuarterNetwork {
  quarter: number;
  /** adjacency: passer -> receiver target counts */
  adjacency: number[][];
  /** active player indices this quarter (dynamic node set) */
  activeNodes: number[];
}

/** Degree centrality (out-degree normalized) for one quarter. */
export function degreeCentrality(q: QuarterNetwork): number[] {
  const n = q.adjacency.length;
  return q.adjacency.map((row, i) => {
    if (!q.activeNodes.includes(i)) return 0;
    const out = row.reduce((a, b) => a + b, 0);
    return n <= 1 ? 0 : out / (n - 1);
  });
}

/** Flow-motif count: directed triangles (i->j->k->i) with positive flow. */
export function triangleMotifs(q: QuarterNetwork): number {
  const n = q.adjacency.length;
  let count = 0;
  for (let i = 0; i < n; i++) {
    const rowI = q.adjacency[i] ?? [];
    for (let j = 0; j < n; j++) {
      if ((rowI[j] ?? 0) <= 0) continue;
      const rowJ = q.adjacency[j] ?? [];
      for (let k = 0; k < n; k++) {
        const rowK = q.adjacency[k] ?? [];
        if ((rowJ[k] ?? 0) > 0 && (rowK[i] ?? 0) > 0) count++;
      }
    }
  }
  return Math.floor(count / 3); // each triangle counted 3x (once per start node)
}

/** Personnel churn between quarters: fraction of nodes entering/leaving. */
export function personnelChurn(a: QuarterNetwork, b: QuarterNetwork): number {
  const sa = new Set(a.activeNodes);
  const sb = new Set(b.activeNodes);
  const union = new Set([...sa, ...sb]);
  if (union.size === 0) return 0;
  let changed = 0;
  for (const n of union) if (sa.has(n) !== sb.has(n)) changed++;
  return changed / union.size;
}

/** Per-quarter centrality series for one game. */
export function centralitySeries(quarters: QuarterNetwork[]): number[][] {
  return quarters.map(degreeCentrality);
}


/** Live-data gate: stays off until network centrality features validated on NFL data. */
export const GSE_NETWORK_CENTRALITY_ENABLED = false;
