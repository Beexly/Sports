/**
 * Cycle-consistency diagnostic for pairwise rating machinery (Hodge decomposition)
 *
 * Research port: arXiv:2607.04590
 * Normalized lane: team_ratings | Doctrine: PROPRIETARY_EDGE
 *
 * Pure port of the paper's diagnostic: build dense comparison graphs
 * (engine-variant pairwise win rates across backtest weeks, or multiple
 * power-rating sources), take the empirical log-odds field on edges, and
 * compute its Hodge decomposition into gradient (transitive, rating-like),
 * curl (cyclic, rock-paper-scissors), and harmonic components via least
 * squares. Report the cyclic energy share against a parametric bootstrap
 * null (edges resampled from the fitted gradient field); when the diagnostic
 * fires, the remedy is regime-conditioned BT r_i(x) = theta_i + phi_i^T x
 * instead of scalar ratings.
 *
 * ACCEPTANCE GATE: ADAPT the diagnostic into the model-evaluation pipeline
 * if: (a) on engine-variant comparison data the cyclic energy share exceeds
 * the bootstrap null at p<0.05, OR (b) even under the null, the one-eighth-law
 * misfit price is material (>0.01 bits/comparison).
 */

export interface ComparisonEdge {
  i: string;
  j: string;
  /** empirical P(i beats j), in (0,1) */
  p: number;
  /** number of comparisons behind the estimate */
  n: number;
}

export interface HodgeDecomposition {
  teams: string[];
  /** gradient (potential) component per team */
  potential: number[];
  /** cyclic energy share: ||curl||^2 / ||field||^2 */
  cyclicShare: number;
  /** gradient energy share */
  gradientShare: number;
  /** harmonic energy share */
  harmonicShare: number;
  /** total field energy */
  fieldEnergy: number;
}

function teamList(edges: ComparisonEdge[]): string[] {
  const set = new Set<string>();
  for (const e of edges) {
    set.add(e.i);
    set.add(e.j);
  }
  return [...set].sort();
}

/**
 * Hodge decomposition of the empirical log-odds field via least squares:
 * fit potentials minimizing sum_e (logit(p_e) - (pot_i - pot_j))^2; the
 * residual is the cyclic+harmonic part.
 */
export function hodgeDecompose(edges: ComparisonEdge[]): HodgeDecomposition {
  const teams = teamList(edges);
  const n = teams.length;
  const idx = new Map(teams.map((t, i) => [t, i]));
  const pot = new Array<number>(n).fill(0);
  // gradient descent on the least-squares objective (identifiable up to shift)
  for (let it = 0; it < 2000; it++) {
    const grad = new Array<number>(n).fill(0);
    for (const e of edges) {
      const i = idx.get(e.i) ?? -1;
      const j = idx.get(e.j) ?? -1;
      if (i < 0 || j < 0) continue;
      const p = Math.min(0.999, Math.max(0.001, e.p));
      const target = Math.log(p / (1 - p));
      const r = target - ((pot[i] ?? 0) - (pot[j] ?? 0));
      grad[i] = (grad[i] ?? 0) + r;
      grad[j] = (grad[j] ?? 0) - r;
    }
    const gnorm = Math.sqrt(grad.reduce((s, v) => s + v * v, 0));
    if (gnorm < 1e-10) break;
    for (let k = 0; k < n; k++) pot[k] = (pot[k] ?? 0) + 0.1 * (grad[k] ?? 0);
    const m = pot.reduce((s, v) => s + v, 0) / Math.max(n, 1);
    for (let k = 0; k < n; k++) pot[k] = (pot[k] ?? 0) - m;
  }
  let fieldEnergy = 0;
  let cyclicEnergy = 0;
  for (const e of edges) {
    const i = idx.get(e.i) ?? -1;
    const j = idx.get(e.j) ?? -1;
    if (i < 0 || j < 0) continue;
    const p = Math.min(0.999, Math.max(0.001, e.p));
    const target = Math.log(p / (1 - p));
    const gradPart = (pot[i] ?? 0) - (pot[j] ?? 0);
    fieldEnergy += target * target;
    cyclicEnergy += (target - gradPart) * (target - gradPart);
  }
  const cyclicShare = fieldEnergy === 0 ? 0 : cyclicEnergy / fieldEnergy;
  return {
    teams,
    potential: pot,
    cyclicShare,
    gradientShare: fieldEnergy === 0 ? 0 : 1 - cyclicShare,
    harmonicShare: 0, // complete-graph least squares absorbs harmonic into the residual
    fieldEnergy,
  };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface HodgeVerdict {
  observed: HodgeDecomposition;
  /** bootstrap null distribution of cyclic share */
  nullMean: number;
  nullSd: number;
  /** one-sided p-value: P(null cyclic share >= observed) */
  pValue: number;
  fires: boolean;
}

/**
 * Parametric bootstrap null: resample each edge's win rate from the fitted
 * gradient field (binomial with the gradient-implied probability), recompute
 * the cyclic share. Fires at p < 0.05.
 */
export function hodgeBootstrap(
  edges: ComparisonEdge[],
  B = 200,
  seed = 5,
): HodgeVerdict {
  const observed = hodgeDecompose(edges);
  const rng = mulberry32(seed);
  const idx = new Map(observed.teams.map((t, i) => [t, i]));
  const nullShares: number[] = [];
  for (let b = 0; b < B; b++) {
    const resampled: ComparisonEdge[] = edges.map((e) => {
      const i = idx.get(e.i) ?? 0;
      const j = idx.get(e.j) ?? 0;
      const pGrad = 1 / (1 + Math.exp(-((observed.potential[i] ?? 0) - (observed.potential[j] ?? 0))));
      const pc = Math.min(0.999, Math.max(0.001, pGrad));
      // binomial draw via normal approximation for speed
      const mean = e.n * pc;
      const sd = Math.sqrt(e.n * pc * (1 - pc));
      const u1 = Math.max(rng(), 1e-12);
      const u2 = rng();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const wins = Math.min(e.n, Math.max(0, Math.round(mean + sd * z)));
      return { i: e.i, j: e.j, p: wins / Math.max(e.n, 1), n: e.n };
    });
    nullShares.push(hodgeDecompose(resampled).cyclicShare);
  }
  const nullMean = nullShares.reduce((s, v) => s + v, 0) / Math.max(nullShares.length, 1);
  const nullSd = Math.sqrt(
    nullShares.reduce((s, v) => s + (v - nullMean) * (v - nullMean), 0) / Math.max(nullShares.length, 1),
  );
  const pValue =
    nullShares.length === 0 ? 1 : nullShares.filter((s) => s >= observed.cyclicShare).length / nullShares.length;
  return { observed, nullMean, nullSd, pValue, fires: pValue < 0.05 };
}

export const GSE_HODGE_DIAGNOSTIC_ENABLED = false;
