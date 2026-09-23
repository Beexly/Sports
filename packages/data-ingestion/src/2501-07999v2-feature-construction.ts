/**
 * Unsupervised Feature Construction for Anomaly Detection in Time Series — An Evaluation
 *
 * arXiv:2501.07999v2 · lane:auto_feature_eng · verdict:ADAPT · owner:Motif-lab · doctrine:PROPRIETARY_EDGE
 *
 * Mechanism: Automated feature construction: lag matrices over trailing windows, rolling mean/sd statistics, and pairwise interaction terms over numeric series.
 *
 * Improvement (record):
 * Detect steam/shock windows on odds trajectories with a window→catch22→isolation-forest pipeline using jumping (non-overlapping) windows and automatic W selection via FFT-based periodicity detection adapted to weekly sports cadence (7-day odds seasonality, 1-game EPA cadence), which runs at ~1/30th the feature count of tsfresh and is real-time-capable.
 *
 * ACCEPTANCE GATE:
 * Adopt the window→tsfresh→IF shock detector iff on the 2024–2025 odds-trajectory test it achieves AUC ≥ 0.70 on steam/shock windows AND beats raw-window IF with Wilcoxon p < 0.05, with per-window inference cost < 5 s.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: feature constructor. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2501.07999v2" as const;
export const LANE = "auto_feature_eng" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt the window→tsfresh→IF shock detector iff on the 2024–2025 odds-trajectory test it achieves AUC ≥ 0.70 on steam/shock windows AND beats raw-window IF with Wilcoxon p < 0.05, with per-window inference cost < 5 s.`;

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

/** Rolling window statistic. */
export interface RollingStat {
  mean: number;
  sd: number;
}

/**
 * Lag feature matrix: row t holds [series[t-l1], series[t-l2], ...] for each
 * t >= max(lags). Null when the series is shorter than the largest lag.
 */
export function lagFeatures(series: number[], lags: number[]): number[][] | null {
  if (series.length === 0 || lags.length === 0) return null;
  if (!series.every(isFiniteNumber)) return null;
  if (!lags.every((l) => Number.isInteger(l) && l > 0)) return null;
  const maxLag = Math.max(...lags);
  if (series.length <= maxLag) return null;
  const out: number[][] = [];
  for (let t = maxLag; t < series.length; t++) {
    out.push(lags.map((l) => series[t - l] as number));
  }
  return out;
}

/** Rolling mean/sd over a trailing window (population sd). */
export function rollingStats(series: number[], window: number): RollingStat[] | null {
  if (!Number.isInteger(window) || window <= 0) return null;
  if (series.length < window) return null;
  if (!series.every(isFiniteNumber)) return null;
  const out: RollingStat[] = [];
  for (let i = window - 1; i < series.length; i++) {
    const w = series.slice(i - window + 1, i + 1);
    const m = w.reduce((s, v) => s + v, 0) / window;
    const sd = Math.sqrt(w.reduce((s, v) => s + (v - m) * (v - m), 0) / window);
    out.push({ mean: m, sd });
  }
  return out;
}

/** Element-wise product of two aligned series (interaction terms). */
export function interactionTerms(a: number[], b: number[]): number[] | null {
  if (a.length !== b.length || a.length === 0) return null;
  if (![...a, ...b].every(isFiniteNumber)) return null;
  return a.map((v, i) => v * (b[i] as number));
}
