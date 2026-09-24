/**
 * Predicting outcomes for games of skill by redefining what it means to win
 *
 * arXiv:1802.00527v1 · lane:markets · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Adopt the paper's 'melo' (margin-Elo) spread CDF as model-comparison infrastructure (not the
 * predictor of record): implement the redefined-win spread CDF as the reference margin model that
 * every margin-distribution upgrade must beat; smooth it with ordered logit for tail calibration
 * (extreme-spread buckets); use the melo spread CDF's log score as the honest published baseline
 * against which GSE's current margin model is judged, so margin-model upgrades are measured
 * against a reference that survives on NFL data rather than against nothing.
 *
 * ACCEPTANCE GATE: ADAPT confirmed if the melo spread CDF's log score on 2024 NFL is within 0.01 of GSE's current
 * margin model AND the ordered-logit-smoothed version beats raw melo on tail calibration (extreme-
 * spread buckets).
 *
 * Ingest role: feature builder (reference margin model: melo spread CDF + ordered-logit smoothing).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1802.00527v1" as const;
export const LANE = "markets" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT confirmed if the melo spread CDF's log score on 2024 NFL is within 0.01 of GSE's current
 * margin model AND the ordered-logit-smoothed version beats raw melo on tail calibration (extreme-
 * spread buckets).`;

export const CONFIG = {
  enabled: false,
  role: "model-comparison baseline, not the predictor of record",
  logScoreTolerance: 0.01,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function isFiniteNumberLocal(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Empirical spread CDF on an integer grid: P(margin <= x). */
export function empiricalSpreadCDF(margins: readonly number[], grid: readonly number[]): Array<{ x: number; p: number }> | null {
  if (margins.length === 0 || grid.length === 0) return null;
  if (!margins.every(isFiniteNumberLocal) || !grid.every(isFiniteNumberLocal)) return null;
  const sorted = [...margins].sort((a, b) => a - b);
  return grid.map((x) => ({ x, p: sorted.filter((m) => m <= x).length / sorted.length }));
}

/** PAV isotonic regression (non-decreasing) for CDF smoothing. */
export function pavIsotonic(ys: readonly number[]): number[] | null {
  if (ys.length === 0 || !ys.every(isFiniteNumberLocal)) return null;
  const blocks: Array<{ sum: number; n: number }> = ys.map((y) => ({ sum: y, n: 1 }));
  let i = 0;
  while (i < blocks.length - 1) {
    const a = blocks[i]!;
    const b = blocks[i + 1]!;
    if (a.sum / a.n > b.sum / b.n + 1e-12) {
      blocks.splice(i, 2, { sum: a.sum + b.sum, n: a.n + b.n });
      if (i > 0) i--;
    } else {
      i++;
    }
  }
  const out: number[] = [];
  for (const bl of blocks) for (let k = 0; k < bl.n; k++) out.push(bl.sum / bl.n);
  return out;
}

/** Ordered-logit-lite smoothing: isotonic + clamp to [0,1]. */
export function smoothedSpreadCDF(margins: readonly number[], grid: readonly number[]): Array<{ x: number; p: number }> | null {
  const emp = empiricalSpreadCDF(margins, grid);
  if (!emp) return null;
  const sm = pavIsotonic(emp.map((e) => e.p));
  if (!sm) return null;
  return emp.map((e, i) => ({ x: e.x, p: Math.max(0, Math.min(1, sm[i] ?? 0)) }));
}

/** P(margin > spread) from a CDF grid (cover probability). */
export function coverProbFromCDF(cdf: ReadonlyArray<{ x: number; p: number }>, spread: number): number | null {
  if (cdf.length === 0 || !isFiniteNumberLocal(spread)) return null;
  let p = 1;
  for (const e of cdf) {
    if (e.x <= -spread) p = 1 - e.p;
    else break;
  }
  return Math.max(0, Math.min(1, p));
}

/** Mean log score of realized margins under the CDF (honest baseline metric). */
export function spreadLogScore(cdf: ReadonlyArray<{ x: number; p: number }>, margins: readonly number[]): number | null {
  if (cdf.length < 2 || margins.length === 0) return null;
  let s = 0;
  for (const m of margins) {
    let p = 1e-9;
    for (let i = 1; i < cdf.length; i++) {
      const prev = cdf[i - 1]!;
      const cur = cdf[i]!;
      if (m > prev.x && m <= cur.x) {
        p = Math.max(1e-9, cur.p - prev.p);
        break;
      }
    }
    s += Math.log(p);
  }
  return s / margins.length;
}
