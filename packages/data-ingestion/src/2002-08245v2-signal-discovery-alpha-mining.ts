/**
 * AutoAlpha: an Efficient Hierarchical Evolutionary Algorithm for Mining Alpha Factors in Quantitative Investment
 *
 * arXiv:2002.08245v2 · lane:signal_discovery_alpha_mining · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Alpha-mining diagnostics: the information coefficient as Spearman rank correlation between a signal
 * and the realized outcome, portfolio turnover as half the L1 weight change, and signal half-life from
 * a least-squares exponential decay fit over lagged ICs.
 *
 * Improvement (wiring record): Implement hierarchical GP over the sports operator grammar: seed with depth-1/2 root genes (single
 * operators on single features, e.g. ts_rank(EPA_margin, 4)), crossover preferentially combines
 * high-IC root genes while mutation extends depth, PCA-QD diversity (zero fitness if PCA-similarity >
 * 0.9 vs any recorded signal), warm-start each season from last season's root-gene pool, and an
 * ensemble ranker over top signals -> weekly game rankings -> Kelly-sized positions on top edges.
 *
 * ACCEPTANCE GATE: ADAPT->build if AutoAlpha-style miner yields >= 3x the # of diverse test-surviving signals vs.
 * vanilla GP at equal compute AND the ensemble ranker beats the best single signal by >= 0.002 Brier
 * on 2022-2025 with White's-reality-check p<0.05.
 *
 * Ingest role: alpha diagnostics (rank IC, turnover, signal half-life).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2002.08245v2" as const;
export const LANE = "signal_discovery_alpha_mining" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT->build if AutoAlpha-style miner yields >= 3x the # of diverse test-surviving signals vs. vanilla GP at equal compute AND the ensemble ranker beats the best single signal by >= 0.002 Brier on 2022-2025 with White's-reality-check p<0.05.`;

/** Disabled by default: additive utility only, never auto-wired into a live ingestion path. */
export const ENABLED = false as const;

export const CONFIG = {
  enabled: false,
  method: "rank IC + turnover + signal half-life",
} as const;
/** Numeric guard: rejects NaN, Infinity, and non-numbers. */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Population mean, or null on empty/malformed input. */
function mean(xs: readonly number[]): number | null {
  if (xs.length === 0 || !xs.every(isFiniteNumber)) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Population standard deviation, or null on empty/malformed input. */
function std(xs: readonly number[]): number | null {
  const m = mean(xs);
  if (m === null) return null;
  return Math.sqrt(xs.reduce((a, v) => a + (v - m) * (v - m), 0) / xs.length);
}

/** Sample variance (n-1), or null on <2 points/malformed input. */
function sampleVariance(xs: readonly number[]): number | null {
  if (xs.length < 2 || !xs.every(isFiniteNumber)) return null;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return xs.reduce((a, v) => a + (v - m) * (v - m), 0) / (xs.length - 1);
}

/** Ordinal ranks (1-based) of values, ascending. */
function ranks(xs: readonly number[]): number[] {
  const order = xs.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const r: number[] = new Array(xs.length).fill(0);
  order.forEach((o, rank) => {
    r[o.i] = rank + 1;
  });
  return r;
}

/** Pearson correlation, or null on degenerate input. */
function pearson(a: readonly number[], b: readonly number[]): number | null {
  if (a.length !== b.length || a.length < 2) return null;
  const ma = mean(a);
  const mb = mean(b);
  if (ma === null || mb === null) return null;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    const xa = (a[i] ?? 0) - ma;
    const xb = (b[i] ?? 0) - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  if (da === 0 || db === 0) return null;
  return num / Math.sqrt(da * db);
}

/** True when every element equals the first (zero-variance series). */
function isConstant(xs: readonly number[]): boolean {
  return xs.every((v) => v === xs[0]);
}

/** Information coefficient: Spearman rank correlation of signal vs realized outcome. */
export function informationCoefficient(
  predicted: readonly number[],
  realized: readonly number[],
): number | null {
  if (predicted.length !== realized.length || predicted.length < 2) return null;
  if (!predicted.every(isFiniteNumber) || !realized.every(isFiniteNumber)) return null;
  // IC is undefined for a constant signal or constant outcome (ordinal ranks would mask ties).
  if (isConstant(predicted) || isConstant(realized)) return null;
  return pearson(ranks(predicted), ranks(realized));
}

/** Portfolio turnover between weight vectors: 0.5 * sum |delta w|. */
export function turnoverRate(
  weightsPrev: readonly number[],
  weightsNow: readonly number[],
): number | null {
  if (weightsPrev.length !== weightsNow.length || weightsPrev.length === 0) return null;
  if (!weightsPrev.every(isFiniteNumber) || !weightsNow.every(isFiniteNumber)) return null;
  let acc = 0;
  for (let i = 0; i < weightsPrev.length; i++) {
    acc += Math.abs((weightsNow[i] ?? 0) - (weightsPrev[i] ?? 0));
  }
  return acc / 2;
}

/** Signal half-life (periods) from exponential decay of lagged ICs; null if not decaying. */
export function halfLifeFromDecay(lagCorrelations: readonly number[]): number | null {
  if (lagCorrelations.length < 2) return null;
  if (!lagCorrelations.every((c) => isFiniteNumber(c) && c > 0)) return null;
  const n = lagCorrelations.length;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let lag = 0; lag < n; lag++) {
    xs.push(lag);
    ys.push(Math.log(lagCorrelations[lag] ?? 1));
  }
  const mx = mean(xs);
  const my = mean(ys);
  if (mx === null || my === null) return null;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += ((xs[i] ?? 0) - mx) * ((ys[i] ?? 0) - my);
    den += ((xs[i] ?? 0) - mx) * ((xs[i] ?? 0) - mx);
  }
  if (den === 0) return null;
  const slope = num / den;
  if (slope >= 0) return null;
  return -Math.LN2 / slope;
}
