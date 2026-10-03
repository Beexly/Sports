/**
 * A Bayesian Variable Selection Approach to Major League Baseball Hitting Metrics
 *
 * arXiv:0911.4503v1 · lane:win_spread_total · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Fit the paper's two-component spike-and-slab mixture on NFL player/team-season data (nflverse
 * 2000-2025) to rank GSE's candidate metrics (EPA/play, success rate, CPOE, TPRR, YPRR, pressure
 * rate, havoc rate, RYOE) by within-unit consistency via p_hat_1 and negative entropy, feed the
 * ranking into engine feature selection (high-signal full weight, low-signal shrunk or dropped),
 * then PCA the high-signal set into a de-duplicated orthogonal feature basis of ~10 components.
 *
 * ACCEPTANCE GATE: ADAPT-accept if Spearman rank correlation between (p_hat_1, -H)-implied signal ranking and
 * observed year-over-year r^2 ranking >= 0.7 on the 2010-2019 fit, AND the PCA on high-signal
 * metrics yields <= 10 significant components; REJECT if rank correlation < 0.4.
 *
 * Ingest role: feature builder (offline metric ranking feeding engine feature selection).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "0911.4503v1" as const;
export const LANE = "win_spread_total" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT-accept if Spearman rank correlation between (p_hat_1, -H)-implied signal ranking and
 * observed year-over-year r^2 ranking >= 0.7 on the 2010-2019 fit, AND the PCA on high-signal
 * metrics yields <= 10 significant components; REJECT if rank correlation < 0.4.`;

export const CONFIG = { enabled: false, maxComponents: 10, spearmanThreshold: 0.7 } as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface MetricSignalInput {
  readonly name: string;
  readonly pHat1: number;
  readonly entropy: number;
}

export function isMetricSignalInput(x: unknown): x is MetricSignalInput {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["name"] === "string" &&
    isFiniteNumber(o["pHat1"]) && (o["pHat1"] as number) >= 0 && (o["pHat1"] as number) <= 1 &&
    isFiniteNumber(o["entropy"]) && (o["entropy"] as number) >= 0
  );
}

/**
 * Signal score from the paper's (p_hat_1, -H) ranking: a metric ranks high when
 * it is probably in the slab AND its posterior is concentrated.
 * entropyMax = largest entropy in the candidate set (normalizer).
 */
export function signalScore(pHat1: number, entropy: number, entropyMax: number): number | null {
  if (!isFiniteNumber(pHat1) || !isFiniteNumber(entropy) || !isFiniteNumber(entropyMax)) return null;
  if (pHat1 < 0 || pHat1 > 1 || entropy < 0 || entropyMax <= 0) return null;
  const concentration = 1 - Math.min(entropy / entropyMax, 1);
  return pHat1 * concentration;
}

/** Rank metric names by signal score, descending. Malformed rows are skipped. */
export function rankMetricSignals(rows: readonly unknown[]): string[] {
  const valid: MetricSignalInput[] = [];
  for (const r of rows) if (isMetricSignalInput(r)) valid.push(r);
  if (valid.length === 0) return [];
  const hMax = Math.max(...valid.map((v) => v.entropy));
  const scored = valid.map((v) => ({ name: v.name, s: signalScore(v.pHat1, v.entropy, hMax) ?? 0 }));
  scored.sort((a, b) => b.s - a.s);
  return scored.map((s) => s.name);
}

/** Average ranks with tie handling. */
function ranks(v: readonly number[]): number[] {
  const order = v.map((val, i) => ({ val, i })).sort((a, b) => a.val - b.val);
  const r = new Array<number>(v.length).fill(0);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1]?.val === order[i]?.val) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) {
      const o = order[k];
      if (o) r[o.i] = avg;
    }
    i = j + 1;
  }
  return r;
}

/** Spearman rank correlation (the gate statistic). Null on degenerate input. */
export function spearmanRho(x: readonly number[], y: readonly number[]): number | null {
  if (x.length !== y.length || x.length < 3) return null;
  if (!x.every(isFiniteNumber) || !y.every(isFiniteNumber)) return null;
  const rx = ranks(x);
  const ry = ranks(y);
  const n = x.length;
  const mx = rx.reduce((a, b) => a + b, 0) / n;
  const my = ry.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = (rx[i] ?? 0) - mx;
    const b = (ry[i] ?? 0) - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

/** Gate check: does the (p_hat_1,-H) ranking track the observed YoY r^2 ranking? */
export function gateSpearmanCheck(signalRanks: readonly number[], observedRanks: readonly number[]): boolean {
  const rho = spearmanRho(signalRanks, observedRanks);
  return rho !== null && rho >= CONFIG.spearmanThreshold;
}
