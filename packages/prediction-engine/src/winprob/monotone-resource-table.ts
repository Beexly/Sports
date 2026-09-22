/**
 * Monotone game-state resource table (arXiv 1810.00908, Duckworth-Lewis
 * machinery adapted to football).
 *
 * Defines game-state resources R(t, s, to): expected remaining point
 * differential given minutes remaining t, score differential s (own lead),
 * and timeouts remaining to. Fits R_bar(t,s,to) with order-constrained
 * priors enforcing monotonicity: increasing in own timeouts, increasing in
 * own lead (decreasing in deficit), increasing in time remaining. The
 * constraint acts as regularization (the paper's RSS win over the
 * unconstrained empirical table).
 *
 * ACCEPTANCE GATE: ADOPT the monotone table if (a) out-of-sample RMSE beats
 * the unconstrained empirical table by >= 2%, (b) monotonicity holds exactly
 * across all cells, and (c) implied win probabilities are calibrated
 * (ECE <= 0.02 on holdout).
 *
 * Research-only module. Not wired into any live win-probability path.
 */

export interface GameState {
  /** Minutes remaining. */
  t: number;
  /** Score differential (own lead; negative = trailing). */
  s: number;
  /** Timeouts remaining (own). */
  to: number;
  /** Realized remaining point differential (own points minus opp, rest of game). */
  remainingDiff: number;
}

export interface ResourceTable {
  tEdges: number[];
  sEdges: number[];
  toEdges: number[];
  /** values[it][is][io]: isotonic-fitted mean remaining differential. */
  values: number[][][];
  /** Cell sample counts (pre-smoothing). */
  counts: number[][][];
}

function binIndex(edges: readonly number[], v: number): number {
  if (v <= (edges[0] as number)) return 0;
  for (let i = 0; i < edges.length - 1; i++) {
    if (v < (edges[i + 1] as number)) return i;
  }
  return edges.length - 2;
}

/** Pool-Adjacent-Violators Algorithm for non-decreasing 1-D isotonic fit. */
function pava(y: readonly number[], w: readonly number[]): number[] {
  const n = y.length;
  const level: number[] = [];
  const weight: number[] = [];
  const count: number[] = [];
  for (let i = 0; i < n; i++) {
    level.push(y[i] as number);
    weight.push(w[i] as number);
    count.push(1);
    while (
      level.length >= 2 &&
      (level[level.length - 2] as number) > (level[level.length - 1] as number)
    ) {
      const m = level.length - 1;
      const wSum = (weight[m - 1] as number) + (weight[m] as number);
      const pooled =
        ((level[m - 1] as number) * (weight[m - 1] as number) +
          (level[m] as number) * (weight[m] as number)) /
        Math.max(1e-12, wSum);
      level[m - 1] = pooled;
      weight[m - 1] = wSum;
      count[m - 1] = (count[m - 1] as number) + (count[m] as number);
      level.pop();
      weight.pop();
      count.pop();
    }
  }
  const out = new Array<number>(n);
  let k = 0;
  for (let b = 0; b < level.length; b++) {
    for (let c = 0; c < (count[b] as number); c++) out[k++] = level[b] as number;
  }
  return out;
}

/**
 * Fit the monotone resource table: empirical cell means, then cyclic PAVA
 * sweeps along each axis until all order constraints hold (increasing in t,
 * increasing in s, increasing in to).
 */
export function fitResourceTable(
  games: readonly GameState[],
  tEdges: readonly number[],
  sEdges: readonly number[],
  toEdges: readonly number[],
  opts: { sweeps?: number } = {},
): ResourceTable | null {
  if (games.length === 0) return null;
  const nt = tEdges.length - 1;
  const ns = sEdges.length - 1;
  const no = toEdges.length - 1;
  if (nt < 1 || ns < 1 || no < 1) throw new Error("fitResourceTable: need >= 2 edges per axis");
  const sum: number[][][] = Array.from({ length: nt }, () =>
    Array.from({ length: ns }, () => new Array<number>(no).fill(0)),
  );
  const counts: number[][][] = Array.from({ length: nt }, () =>
    Array.from({ length: ns }, () => new Array<number>(no).fill(0)),
  );
  for (const g of games) {
    const it = Math.min(nt - 1, Math.max(0, binIndex(tEdges, g.t)));
    const is = Math.min(ns - 1, Math.max(0, binIndex(sEdges, g.s)));
    const io = Math.min(no - 1, Math.max(0, binIndex(toEdges, g.to)));
    const sRow = sum[it] as number[][];
    const cRow = counts[it] as number[][];
    (sRow[is] as number[])[io] = ((sRow[is] as number[])[io] ?? 0) + g.remainingDiff;
    (cRow[is] as number[])[io] = ((cRow[is] as number[])[io] ?? 0) + 1;
  }
  const globalMean = games.reduce((a, g) => a + g.remainingDiff, 0) / games.length;
  const values: number[][][] = Array.from({ length: nt }, (_, it) =>
    Array.from({ length: ns }, (_, is) =>
      Array.from({ length: no }, (_, io) => {
        const c = (counts[it] as number[][])[is]?.[io] ?? 0;
        return c > 0 ? (((sum[it] as number[][])[is]?.[io] ?? 0) / c) : globalMean;
      }),
    ),
  );
  // Cyclic isotonic sweeps: PAVA along every line of each axis.
  const sweeps = opts.sweeps ?? 50;
  for (let sw = 0; sw < sweeps; sw++) {
    let changed = false;
    // Axis t (increasing).
    for (let is = 0; is < ns; is++) {
      for (let io = 0; io < no; io++) {
        const line = values.map((row) => (row[is] as number[])[io] ?? 0);
        const wt = values.map((row, it) => (counts[it] as number[][])[is]?.[io] ?? 0);
        const fit = pava(line, wt);
        for (let it = 0; it < nt; it++) {
          const nv = fit[it] as number;
          if (Math.abs(((values[it] as number[][])[is] as number[])[io] as number - nv) > 1e-12) changed = true;
          ((values[it] as number[][])[is] as number[])[io] = nv;
        }
      }
    }
    // Axis s (increasing in own lead).
    for (let it = 0; it < nt; it++) {
      for (let io = 0; io < no; io++) {
        const line = (values[it] as number[][]).map((row) => (row[io] ?? 0));
        const wt = (values[it] as number[][]).map(
          (_, is) => (counts[it] as number[][])[is]?.[io] ?? 0,
        );
        const fit = pava(line, wt);
        for (let is = 0; is < ns; is++) {
          const nv = fit[is] as number;
          if (Math.abs((((values[it] as number[][])[is] as number[])[io] as number) - nv) > 1e-12) changed = true;
          ((values[it] as number[][])[is] as number[])[io] = nv;
        }
      }
    }
    // Axis to (increasing in own timeouts).
    for (let it = 0; it < nt; it++) {
      for (let is = 0; is < ns; is++) {
        const line = ((values[it] as number[][])[is] as number[]).slice();
        const wt = (((counts[it] as number[][])[is] as number[]) ?? []).slice();
        const fit = pava(line, wt);
        for (let io = 0; io < no; io++) {
          const nv = fit[io] as number;
          if (Math.abs((((values[it] as number[][])[is] as number[])[io] as number) - nv) > 1e-12) changed = true;
          ((values[it] as number[][])[is] as number[])[io] = nv;
        }
      }
    }
    if (!changed) break;
  }
  return {
    tEdges: [...tEdges],
    sEdges: [...sEdges],
    toEdges: [...toEdges],
    values,
    counts,
  };
}

/** Exact monotonicity audit of a fitted table (gate condition b). */
export function isMonotone(table: ResourceTable): boolean {
  const { values } = table;
  const nt = values.length;
  const ns = (values[0] as number[][]).length;
  const no = ((values[0] as number[][])[0] as number[]).length;
  for (let it = 0; it < nt; it++) {
    for (let is = 0; is < ns; is++) {
      for (let io = 0; io < no; io++) {
        const v = (values[it] as number[][])[is]?.[io] ?? 0;
        if (it + 1 < nt && ((values[it + 1] as number[][])[is]?.[io] ?? 0) < v - 1e-9) return false;
        if (is + 1 < ns && ((values[it] as number[][])[is + 1]?.[io] ?? 0) < v - 1e-9) return false;
        if (io + 1 < no && ((values[it] as number[][])[is]?.[io + 1] ?? 0) < v - 1e-9) return false;
      }
    }
  }
  return true;
}

/** Look up the resource value for a game state (nearest cell, edges clamped). */
export function resourceValue(table: ResourceTable, t: number, s: number, to: number): number {
  const nt = table.values.length;
  const ns = (table.values[0] as number[][]).length;
  const no = ((table.values[0] as number[][])[0] as number[]).length;
  const it = Math.min(nt - 1, Math.max(0, binIndex(table.tEdges, t)));
  const is = Math.min(ns - 1, Math.max(0, binIndex(table.sEdges, s)));
  const io = Math.min(no - 1, Math.max(0, binIndex(table.toEdges, to)));
  return (table.values[it] as number[][])[is]?.[io] ?? 0;
}

/** RMSE of a table against realized remaining differentials. */
export function tableRMSE(table: ResourceTable, games: readonly GameState[]): number {
  if (games.length === 0) throw new Error("tableRMSE: no games");
  let sse = 0;
  for (const g of games) {
    const pred = resourceValue(table, g.t, g.s, g.to);
    sse += (g.remainingDiff - pred) ** 2;
  }
  return Math.sqrt(sse / games.length);
}
