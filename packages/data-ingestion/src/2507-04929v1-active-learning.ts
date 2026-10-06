/**
 * ConBatch-BAL: Batch Bayesian Active Learning under Budget Constraints
 *
 * arXiv:2507.04929v1 · lane:active_learning · verdict:ADAPT · owner:Hermes · doctrine:INFRA
 *
 * Mechanism: Acquisition functions for labeling prioritization: predictive entropy over class probabilities, top-2 margin scores, and top-K index selection.
 *
 * Improvement (record):
 * GSE allocates its weekly charting/labeling budget with ConBatch-BAL: a dollar-capped acquisition rule that admits games by cost-per-slot and scores them with BADGE/BatchBALD, beating cost-blind top-k.
 *
 * ACCEPTANCE GATE:
 * ADOPT the better of the two rules iff it beats cost-blind top-k at equal weekly dollar budget by >=0.005 held-out log-loss on the 2024 season simulation AND does not collapse in any single week (no week >2x average per-dollar regret).
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: labeling prioritizer. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2507.04929v1" as const;
export const LANE = "active_learning" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the better of the two rules iff it beats cost-blind top-k at equal weekly dollar budget by >=0.005 held-out log-loss on the 2024 season simulation AND does not collapse in any single week (no week >2x average per-dollar regret).`;

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

/**
 * Predictive entropy per sample (nats). Higher = more uncertain =
 * more valuable to label. Null on empty or invalid probability rows.
 */
export function entropyScores(probs: number[][]): number[] | null {
  if (probs.length === 0) return null;
  if (!probs.every((p) => p.length > 0 && p.every((v) => isFiniteNumber(v) && v >= 0))) return null;
  return probs.map((p) => {
    let h = 0;
    for (const v of p) {
      if (v > 0) h -= v * Math.log(v);
    }
    return h;
  });
}

/**
 * Margin scores: gap between the top-2 class probabilities per sample.
 * Smaller margin = more uncertain. Requires >= 2 classes.
 */
export function marginScores(probs: number[][]): number[] | null {
  if (probs.length === 0) return null;
  if (!probs.every((p) => p.length >= 2 && p.every((v) => isFiniteNumber(v) && v >= 0))) return null;
  return probs.map((p) => {
    const s = [...p].sort((a, b) => b - a);
    return (s[0] as number) - (s[1] as number);
  });
}

/** Indices of the top-K scores, highest first. */
export function topKIndices(scores: number[], k: number): number[] | null {
  if (!scores.every(isFiniteNumber)) return null;
  if (!Number.isInteger(k) || k <= 0 || k > scores.length) return null;
  return scores
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map((x) => x.i);
}
