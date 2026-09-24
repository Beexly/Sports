/**
 * FRANS: Automatic Feature Extraction for Time Series Forecasting
 *
 * arXiv:2209.07018v1 · lane:auto_feature_eng · owner:Motif-lab
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Adopt FRANS-style CNN embeddings: per-team per-season game sequences (nflverse 2009-2026:
 * EPA/play, success rate, pressure rate, turnover margin) through a multi-channel 1D-CNN (Fawaz-
 * style + feature layer, dim 24) on a surrogate team-season classification task (windows cut
 * strictly before the prediction week — leakage-safe); per-window features -> mean/medoid ->
 * static team-season embedding fed into the engine's meta-learner combining sub-model outputs —
 * then build the two-tower extension the authors propose: static tower (FRANS identity — 'who are
 * they this year') + dynamic tower (windowed autoencoder of the last 4 games — 'how are they
 * playing now'), since the identity x momentum interaction is where matchup-specific edges live.
 *
 * ACCEPTANCE GATE: Adopt FRANS embeddings iff the meta-learner with FRANS features beats the handcrafted-feature
 * meta-learner by >= 0.004 log-loss on 2024-2025 walk-forward AND the leakage audit passes (zero
 * windows crossing the prediction boundary) AND per-team-season embedding stability holds (within-
 * season cosine distance < 0.5x between-season distance); reject if the win is sub-noise or
 * embeddings collapse.
 *
 * Ingest role: feature builder (FRANS automatic time-series feature extraction: catch22-lite + stats).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2209.07018v1" as const;
export const LANE = "auto_feature_eng" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt FRANS embeddings iff the meta-learner with FRANS features beats the handcrafted-feature
 * meta-learner by >= 0.004 log-loss on 2024-2025 walk-forward AND the leakage audit passes (zero
 * windows crossing the prediction boundary) AND per-team-season embedding stability holds (within-
 * season cosine distance < 0.5x between-season distance); reject if the win is sub-noise or
 * embeddings collapse.`;

export const CONFIG = {
  enabled: false,
  method: "FRANS",
  featureSet: "catch22-lite + distributional",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface TsFeatures {
  readonly mean: number;
  readonly sd: number;
  readonly skew: number;
  readonly kurt: number;
  readonly ac1: number;
  readonly range: number;
  readonly nCrossings: number;
  readonly entropy: number;
}

/** Lag-1 autocorrelation. */
export function ac1(x: readonly number[]): number | null {
  if (x.length < 2 || !x.every(isFiniteNumber)) return null;
  const m = x.reduce((a, b) => a + b, 0) / x.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < x.length; i++) {
    const d = (x[i] ?? 0) - m;
    den += d * d;
    if (i > 0) num += d * ((x[i - 1] ?? 0) - m);
  }
  if (den === 0) return null;
  return num / den;
}

/** Mean-crossing count. */
export function meanCrossings(x: readonly number[]): number | null {
  if (x.length < 2 || !x.every(isFiniteNumber)) return null;
  const m = x.reduce((a, b) => a + b, 0) / x.length;
  let n = 0;
  for (let i = 1; i < x.length; i++) {
    if (((x[i - 1] ?? 0) - m) * ((x[i] ?? 0) - m) < 0) n++;
  }
  return n;
}

/** Histogram entropy (distributional feature). */
export function histEntropy(x: readonly number[], bins = 10): number | null {
  if (x.length === 0 || !x.every(isFiniteNumber) || !Number.isInteger(bins) || bins <= 0) return null;
  const lo = Math.min(...x);
  const hi = Math.max(...x);
  if (hi === lo) return 0;
  const counts = new Array<number>(bins).fill(0);
  for (const v of x) {
    const b = Math.min(bins - 1, Math.floor(((v - lo) / (hi - lo)) * bins));
    counts[b] = (counts[b] ?? 0) + 1;
  }
  let h = 0;
  for (const c of counts) {
    if (c > 0) {
      const p = c / x.length;
      h -= p * Math.log(p);
    }
  }
  return h;
}

/** Full FRANS-lite feature vector. */
export function fransFeatures(x: readonly number[]): TsFeatures | null {
  if (x.length < 4 || !x.every(isFiniteNumber)) return null;
  const mean = x.reduce((a, b) => a + b, 0) / x.length;
  const sd = Math.sqrt(x.reduce((a, b) => a + (b - mean) * (b - mean), 0) / x.length);
  if (sd === 0) return null;
  const skew = x.reduce((a, b) => a + ((b - mean) / sd) ** 3, 0) / x.length;
  const kurt = x.reduce((a, b) => a + ((b - mean) / sd) ** 4, 0) / x.length - 3;
  const a1 = ac1(x);
  const nc = meanCrossings(x);
  const ent = histEntropy(x);
  if (a1 === null || nc === null || ent === null) return null;
  return {
    mean,
    sd,
    skew,
    kurt,
    ac1: a1,
    range: Math.max(...x) - Math.min(...x),
    nCrossings: nc,
    entropy: ent,
  };
}
