/**
 * Offensive-line salary-vs-cluster value screen for DFS.
 *
 * Transplants the paper's OL salary-vs-cluster screen: cluster each week's
 * DFS slate by position on standardized performance predictors, fit lognormal
 * salary distributions per cluster, and flag bottom-5% salary anomalies as
 * value plays. Plus differential teammate controls for props (to-role vs
 * off-role differentials, e.g. WR yards/target when targeted vs team
 * yards/play when not targeted).
 *
 * @see arXiv:1603.07593v2 — "Evaluating the Performance of Offensive Linemen in the NFL"
 *
 * ACCEPTANCE GATE: ADOPT the cluster-salary value screen as a weekly DFS
 * input iff flagged 'undervalued' players outscore their positional slate
 * average in points-per-$1K by ≥ 10% with a paired t-test p < 0.05 over the
 * 2023–2025 test window (≥ 40 slates). The gate is a backtest concern; this
 * module is the pure screening kernel, not wired into any live path.
 */

export interface SlatePlayer {
  id: string;
  position: string;
  salary: number;
  /** Standardized performance predictors (z-scored upstream). */
  features: number[];
}

/** Standard normal CDF (A&S approximation) for the lognormal tail test. */
function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const poly =
    t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const cdf = 1 - Math.exp((-x * x) / 2) * poly * 0.3989422804014327;
  return x >= 0 ? cdf : 1 - cdf;
}

function euclidean(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    s += d * d;
  }
  return Math.sqrt(s);
}

/**
 * Tiny k-means over the slate's feature vectors. Returns cluster index per
 * player. Deterministic init (first k players as seeds) — no RNG dependence.
 */
export function kMeansClusters(players: ReadonlyArray<SlatePlayer>, k: number, iters = 50): number[] {
  if (players.length === 0) return [];
  if (!(k >= 1)) throw new Error("kMeansClusters: k ≥ 1");
  const kk = Math.min(k, players.length);
  let centroids = players.slice(0, kk).map((p) => [...p.features]);
  let assign = new Array<number>(players.length).fill(0);
  for (let it = 0; it < iters; it++) {
    const next = players.map((p) => {
      let best = 0;
      let bestD = Infinity;
      centroids.forEach((c, ci) => {
        const d = euclidean(p.features, c);
        if (d < bestD) {
          bestD = d;
          best = ci;
        }
      });
      return best;
    });
    if (next.every((v, i) => v === assign[i])) break;
    assign = next;
    centroids = centroids.map((_, ci) => {
      const members = players.filter((_, pi) => assign[pi] === ci);
      if (members.length === 0) return centroids[ci] ?? [];
      const dim = members[0]?.features.length ?? 0;
      return Array.from({ length: dim }, (_, d) => {
        const vals = members.map((m) => m.features[d] ?? 0);
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      });
    });
  }
  return assign;
}

export interface ValueFlag {
  id: string;
  /** Salary percentile under the cluster's lognormal fit (low = cheap). */
  salaryPercentile: number;
  undervalued: boolean;
}

/**
 * Flag bottom-`tailPct` salary anomalies per (position, cluster) cell as
 * value plays. Lognormal fit on salaries within the cell.
 */
export function flagUndervalued(
  players: ReadonlyArray<SlatePlayer>,
  clusters: readonly number[],
  tailPct = 0.05,
): ValueFlag[] {
  if (players.length !== clusters.length) {
    throw new Error("flagUndervalued: players/clusters length mismatch");
  }
  // Group by position × cluster.
  const cells = new Map<string, number[]>();
  players.forEach((p, i) => {
    const key = `${p.position}|${clusters[i]}`;
    const arr = cells.get(key) ?? [];
    arr.push(i);
    cells.set(key, arr);
  });
  return players.map((p, i) => {
    const key = `${p.position}|${clusters[i]}`;
    const idxs = cells.get(key) ?? [i];
    const logSals = idxs.map((j) => Math.log(Math.max(1, players[j]?.salary ?? 1)));
    const mean = logSals.reduce((a, b) => a + b, 0) / logSals.length;
    const sd =
      logSals.length > 1
        ? Math.sqrt(logSals.reduce((s, x) => s + (x - mean) ** 2, 0) / (logSals.length - 1))
        : 1;
    const z = sd > 0 ? (Math.log(Math.max(1, p.salary)) - mean) / sd : 0;
    const pct = normalCdf(z);
    return { id: p.id, salaryPercentile: pct, undervalued: pct < tailPct };
  });
}

/**
 * Differential teammate control for props: to-role rate (e.g. WR
 * yards/target when targeted) minus off-role rate (team yards/play when the
 * player is not targeted). Positive = the player lifts efficiency above the
 * team baseline.
 */
export function teammateDifferential(toRoleRate: number, offRoleRate: number): number {
  return toRoleRate - offRoleRate;
}
