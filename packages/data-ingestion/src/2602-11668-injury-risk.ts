/**
 * Explainable Machine-Learning based Detection of Knee Injuries in Runners
 *
 * arXiv:2602.11668 · lane:causal_injury · verdict:ADAPT · owner:Motif-lab · doctrine:SITUATIONAL
 *
 * Mechanism: Window-sweep injury-prediction protocol with exponential decay-weighted load windows (index 0 = most recent session), a logistic risk head over engineered features, and acute:chronic workload ratio monitoring.
 *
 * Improvement (record):
 * GSE ships a soft-tissue injury screening pipeline: a hybrid CNN over NGS stride-kinematic time series with SHAP/Grad-CAM explainability produces a per-player-week hamstring/groin risk score for the injury-report models, validated under strict player-separated CV.
 *
 * ACCEPTANCE GATE:
 * Accepted: the portable pipeline (hybrid temporal CNN + triple-method explainability + honest player-separated validation) maps onto GSE soft-tissue screening despite the original paper's modest accuracies.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: injury-risk feature builder. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2602.11668" as const;
export const LANE = "causal_injury" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Accepted: the portable pipeline (hybrid temporal CNN + triple-method explainability + honest player-separated validation) maps onto GSE soft-tissue screening despite the original paper's modest accuracies.`;

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

/** Result of one window in the sweep protocol. */
export interface WindowResult {
  window: number;
  value: number | null;
}

/**
 * Exponential decay-weighted mean of a load series (index 0 = most recent).
 * decayRate = 0 nests the paper's fixed rectangular windows as a special case.
 */
export function decayWeightedWindow(loads: number[], decayRate: number): number | null {
  if (!Array.isArray(loads) || loads.length === 0) return null;
  if (!isFiniteNumber(decayRate) || decayRate < 0) return null;
  let num = 0;
  let den = 0;
  for (let i = 0; i < loads.length; i++) {
    const v = loads[i] as number;
    if (!isFiniteNumber(v)) return null;
    const w = Math.exp(-decayRate * i);
    num += w * v;
    den += w;
  }
  return num / den;
}

/**
 * Window-sweep protocol: mean load over each of the requested trailing windows
 * (e.g. 3/5/7 sessions). Null value when the window size is invalid.
 */
export function windowSweepProtocol(loads: number[], windows: number[]): WindowResult[] | null {
  if (!Array.isArray(loads) || loads.length === 0) return null;
  if (!Array.isArray(windows) || windows.length === 0) return null;
  if (!loads.every(isFiniteNumber)) return null;
  return windows.map((w) => {
    if (!Number.isInteger(w) || w <= 0) return { window: w, value: null };
    const slice = loads.slice(0, w);
    const value = slice.reduce((s, v) => s + v, 0) / slice.length;
    return { window: w, value };
  });
}

/** Logistic injury-risk head over a feature vector. */
export function injuryRiskScore(features: number[], weights: number[], bias = 0): number | null {
  if (features.length !== weights.length || features.length === 0) return null;
  if (!isFiniteNumber(bias)) return null;
  let z = bias;
  for (let i = 0; i < features.length; i++) {
    const f = features[i] as number;
    const w = weights[i] as number;
    if (!isFiniteNumber(f) || !isFiniteNumber(w)) return null;
    z += f * w;
  }
  return 1 / (1 + Math.exp(-z));
}

/** Acute:chronic workload ratio; null when chronic load is not positive. */
export function acuteChronicRatio(acute: number, chronic: number): number | null {
  if (!isFiniteNumber(acute) || !isFiniteNumber(chronic) || chronic <= 0 || acute < 0) return null;
  return acute / chronic;
}
