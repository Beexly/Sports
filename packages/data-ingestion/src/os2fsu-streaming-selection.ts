/**
 * Online Sparse Streaming Feature Selection with Uncertainty (OS2FSU)
 *
 * arXiv:2208.01562v2 · lane:auto_feature_eng · owner:Motif-lab
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build the OS2FSU sparse-feature selector for the weekly pipeline: Phase I — buffer each week's
 * new/sparse features (Bs=8 weeks), LFA via SGD (rank 8) to impute missing team-game entries;
 * Phase II — Fisher's-z relevance on imputed features vs cover label, fuzzy band mu in [0.01,0.1]
 * via trapezoidal MF, neighborhood-rough-set dependency gamma for fuzzy-band features; selected
 * sparse features feed the feature gate carrying an 'imputed' flag so downstream can down-weight —
 * then make the fuzzy band missingness-adaptive: scale the band by per-feature imputation
 * confidence (LFA reconstruction error on held-out observed entries), which doubles as data-
 * quality monitoring for the weekly pipeline.
 *
 * ACCEPTANCE GATE: Accept iff OS2FSU (LFA-impute + fuzzy select) beats both drop-masked and mean-fill+standard-
 * selection arms on 2024 log-loss by >= 0.002 AND retains >= 5 of the 10 masked features; reject
 * if it <= mean-fill, selections are unstable across seeds, or theta > 0.6 missingness on any real
 * feature (drop the feature instead).
 *
 * Ingest role: feature builder (online sparse streaming feature selection with uncertainty).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2208.01562v2" as const;
export const LANE = "auto_feature_eng" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Accept iff OS2FSU (LFA-impute + fuzzy select) beats both drop-masked and mean-fill+standard-
 * selection arms on 2024 log-loss by >= 0.002 AND retains >= 5 of the 10 masked features; reject
 * if it <= mean-fill, selections are unstable across seeds, or theta > 0.6 missingness on any real
 * feature (drop the feature instead).`;

export const CONFIG = {
  enabled: false,
  method: "OS2FSU",
  streaming: true,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface StreamFeature {
  readonly name: string;
  readonly relevance: number;
  readonly uncertainty: number;
}

export function isStreamFeature(x: unknown): x is StreamFeature {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["name"] === "string" &&
    isFiniteNumber(o["relevance"]) &&
    isFiniteNumber(o["uncertainty"]) && (o["uncertainty"] as number) >= 0
  );
}

/** UCB-style streaming score: relevance + kappa * uncertainty. */
export function streamScore(f: StreamFeature, kappa = 1): number | null {
  if (!isStreamFeature(f) || !isFiniteNumber(kappa) || kappa < 0) return null;
  return f.relevance + kappa * f.uncertainty;
}

/**
 * Online update of the selected set: admit a feature if its score beats the
 * weakest selected member; evict the weakest. Pure function over sets.
 */
export function onlineSelect(
  selected: readonly StreamFeature[],
  candidate: StreamFeature,
  maxSize: number,
  kappa = 1,
): StreamFeature[] | null {
  if (!Number.isInteger(maxSize) || maxSize <= 0) return null;
  if (!isStreamFeature(candidate)) return null;
  if (!selected.every(isStreamFeature)) return null;
  const scored = (f: StreamFeature): number => streamScore(f, kappa) ?? -Infinity;
  if (selected.length < maxSize) {
    return [...selected, candidate];
  }
  let weakest = 0;
  for (let i = 1; i < selected.length; i++) {
    if (scored(selected[i]!) < scored(selected[weakest]!)) weakest = i;
  }
  if (scored(candidate) <= scored(selected[weakest]!)) return [...selected];
  return selected.map((f, i) => (i === weakest ? candidate : f));
}

/** Redundancy filter: drop candidate if max correlation with selected exceeds rho. */
export function redundancyFilter(
  candidate: string,
  selected: readonly string[],
  corr: Readonly<Record<string, number>>,
  rho = 0.9,
): boolean | null {
  if (typeof candidate !== "string" || !isFiniteNumber(rho) || rho < 0 || rho > 1) return null;
  for (const s of selected) {
    const c = corr[`${candidate}|${s}`] ?? corr[`${s}|${candidate}`];
    if (c !== undefined && isFiniteNumber(c) && Math.abs(c) > rho) return false;
  }
  return true;
}
