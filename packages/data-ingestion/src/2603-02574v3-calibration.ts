/**
 * An Augmented Rating System for Test cricket: adapting the Glicko rating system
 *
 * arXiv:2603.02574v3 · lane:calibration · verdict:ADAPT · owner:Mimo · doctrine:PROPRIETARY_EDGE
 *
 * Mechanism: Calibration diagnostics: Brier score, clamped log-loss, binned reliability diagrams with expected calibration error, and pool-adjacent-violators isotonic recalibration.
 *
 * Improvement (record):
 * GSE adds a Glicko-style team-strength rater with Brier-grid-search-calibrated logistic scale and margin-of-victory terms as an engine feature complementing EPA metrics.
 *
 * ACCEPTANCE GATE:
 * ADOPT iff on 2023-2024 walk-forward it beats tuned-Elo Brier by >=0.004 absolute with ECE no worse than baseline in every probability bin and bootstrap CV < 2% for all 32 teams.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: calibration diagnostic. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2603.02574v3" as const;
export const LANE = "calibration" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT iff on 2023-2024 walk-forward it beats tuned-Elo Brier by >=0.004 absolute with ECE no worse than baseline in every probability bin and bootstrap CV < 2% for all 32 teams.`;

/**
 * Disabled by default: the acceptance gate above requires live/backtest data not
 * available inside this module. Flip only after the gate is evaluated offline and
 * a human approves wiring into a live ingestion path.
 */
export const ENABLED = false;
/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** One bin of a reliability diagram. */
export interface ReliabilityBin {
  bin: number;
  n: number;
  avgProb: number;
  avgOutcome: number;
}

function checkPairs(probs: number[], outcomes: number[]): boolean {
  if (probs.length !== outcomes.length || probs.length === 0) return false;
  for (let i = 0; i < probs.length; i++) {
    const p = probs[i] as number;
    const o = outcomes[i] as number;
    if (!isFiniteNumber(p) || p < 0 || p > 1 || (o !== 0 && o !== 1)) return false;
  }
  return true;
}

/** Mean squared error between predicted probabilities and 0/1 outcomes. */
export function brierScore(probs: number[], outcomes: number[]): number | null {
  if (!checkPairs(probs, outcomes)) return null;
  let s = 0;
  for (let i = 0; i < probs.length; i++) {
    const p = probs[i] as number;
    const o = outcomes[i] as number;
    s += (p - o) * (p - o);
  }
  return s / probs.length;
}

/** Binary log-loss with probability clamping to [eps, 1-eps]. */
export function logLoss(probs: number[], outcomes: number[], eps = 1e-15): number | null {
  if (!checkPairs(probs, outcomes)) return null;
  if (!isFiniteNumber(eps) || eps <= 0 || eps >= 0.5) return null;
  let s = 0;
  for (let i = 0; i < probs.length; i++) {
    const p = probs[i] as number;
    const o = outcomes[i] as number;
    const c = Math.min(1 - eps, Math.max(eps, p));
    s += o === 1 ? -Math.log(c) : -Math.log(1 - c);
  }
  return s / probs.length;
}

/** Binned reliability diagram (equal-width bins over [0,1]). */
export function reliabilityBins(probs: number[], outcomes: number[], bins = 10): ReliabilityBin[] | null {
  if (!checkPairs(probs, outcomes)) return null;
  if (!Number.isInteger(bins) || bins <= 0) return null;
  const sums: Array<{ sp: number; so: number; n: number }> = Array.from({ length: bins }, () => ({
    sp: 0,
    so: 0,
    n: 0,
  }));
  for (let i = 0; i < probs.length; i++) {
    const p = probs[i] as number;
    const o = outcomes[i] as number;
    const b = Math.min(bins - 1, Math.floor(p * bins));
    const slot = sums[b] as { sp: number; so: number; n: number };
    slot.sp += p;
    slot.so += o;
    slot.n += 1;
  }
  return sums.map((s, bin) => ({
    bin,
    n: s.n,
    avgProb: s.n > 0 ? s.sp / s.n : 0,
    avgOutcome: s.n > 0 ? s.so / s.n : 0,
  }));
}

/** Expected calibration error: n-weighted mean |avgProb - avgOutcome|. */
export function ece(probs: number[], outcomes: number[], bins = 10): number | null {
  const rb = reliabilityBins(probs, outcomes, bins);
  if (rb === null) return null;
  const n = probs.length;
  let e = 0;
  for (const b of rb) e += (b.n / n) * Math.abs(b.avgProb - b.avgOutcome);
  return e;
}

/**
 * Pool Adjacent Violators Algorithm: isotonic (non-decreasing) regression fit
 * over a sequence, used as a recalibration map. Returns fitted values.
 */
export function poolAdjacentViolators(y: number[]): number[] | null {
  if (y.length === 0 || !y.every(isFiniteNumber)) return null;
  const blocks: Array<{ vals: number[]; avg: number }> = y.map((v) => ({ vals: [v], avg: v }));
  let i = 0;
  while (i < blocks.length - 1) {
    const cur = blocks[i] as { vals: number[]; avg: number };
    const nxt = blocks[i + 1] as { vals: number[]; avg: number };
    if (cur.avg <= nxt.avg) {
      i++;
      continue;
    }
    const merged = cur.vals.concat(nxt.vals);
    const avg = merged.reduce((s, v) => s + v, 0) / merged.length;
    blocks.splice(i, 2, { vals: merged, avg });
    if (i > 0) i--;
  }
  const out: number[] = [];
  for (const b of blocks) {
    for (const _v of b.vals) out.push(b.avg);
  }
  return out;
}
