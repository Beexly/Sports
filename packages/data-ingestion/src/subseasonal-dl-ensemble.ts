/**
 * Sub-Seasonal Forecasting with a Large Ensemble of Deep-Learning Weather Prediction Models
 *
 * arXiv:2102.05107 · lane:weather · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Ensemble policy: when building prediction ensembles (spread/total/prop models), generate members
 * by retraining with different random seeds/checkpoint snapshots (SP-style) in addition to data-
 * level perturbations; validate the spread-RMSE relationship on holdout (spread should track RMSE
 * by lead/coverage class); no new data needed.
 *
 * ACCEPTANCE GATE: ADAPT if the SP-retrain ensemble improves holdout CRPS by >=2% over the bootstrap ensemble AND
 * its spread-RMSE ratio is closer to 1.0 (within +/-0.15) than the bootstrap ensemble's. Otherwise
 * keep data-bootstrap ensembles.
 *
 * Ingest role: schemas (large deep-learning weather ensemble: member schema + skill aggregation).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2102.05107" as const;
export const LANE = "weather" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT if the SP-retrain ensemble improves holdout CRPS by >=2% over the bootstrap ensemble AND
 * its spread-RMSE ratio is closer to 1.0 (within +/-0.15) than the bootstrap ensemble's. Otherwise
 * keep data-bootstrap ensembles.`;

export const CONFIG = {
  enabled: false,
  nMembers: 500,
  horizonWeeks: [3, 4, 5, 6],
  targetCorrSkill: 0.5,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface EnsembleMember {
  readonly memberId: string;
  readonly model: string;
  readonly initAt: string;
  readonly leadWeeks: number;
  readonly forecast: number;
  readonly weight: number;
}

export function isEnsembleMember(x: unknown): x is EnsembleMember {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["memberId"] === "string" &&
    typeof o["model"] === "string" &&
    typeof o["initAt"] === "string" && Number.isFinite(Date.parse(o["initAt"] as string)) &&
    isFiniteNumber(o["leadWeeks"]) && (o["leadWeeks"] as number) > 0 &&
    isFiniteNumber(o["forecast"]) &&
    isFiniteNumber(o["weight"]) && (o["weight"] as number) >= 0
  );
}

/** Ensemble mean with normalized weights. */
export function ensembleMean(members: readonly unknown[]): number | null {
  const v: EnsembleMember[] = [];
  for (const m of members) if (isEnsembleMember(m)) v.push(m);
  if (v.length === 0) return null;
  const wSum = v.reduce((s, m) => s + m.weight, 0);
  if (wSum === 0) return null;
  return v.reduce((s, m) => s + (m.weight / wSum) * m.forecast, 0);
}

/** Ensemble spread (weighted std). */
export function ensembleSpread(members: readonly unknown[]): number | null {
  const v: EnsembleMember[] = [];
  for (const m of members) if (isEnsembleMember(m)) v.push(m);
  if (v.length < 2) return null;
  const mean = ensembleMean(v);
  if (mean === null) return null;
  const wSum = v.reduce((s, m) => s + m.weight, 0);
  if (wSum === 0) return null;
  const varr = v.reduce((s, m) => s + (m.weight / wSum) * (m.forecast - mean) ** 2, 0);
  return Math.sqrt(varr);
}

/** Anomaly correlation skill vs climatology. */
export function anomalyCorrelation(forecasts: readonly number[], observed: readonly number[]): number | null {
  if (forecasts.length !== observed.length || forecasts.length < 2) return null;
  if (!forecasts.every(isFiniteNumber) || !observed.every(isFiniteNumber)) return null;
  const mf = forecasts.reduce((a, b) => a + b, 0) / forecasts.length;
  const mo = observed.reduce((a, b) => a + b, 0) / observed.length;
  let num = 0;
  let df = 0;
  let doo = 0;
  for (let i = 0; i < forecasts.length; i++) {
    const a = (forecasts[i] ?? 0) - mf;
    const b = (observed[i] ?? 0) - mo;
    num += a * b;
    df += a * a;
    doo += b * b;
  }
  if (df === 0 || doo === 0) return null;
  return num / Math.sqrt(df * doo);
}

/** Rank histogram flatness (chi-square-ish): 1 = perfectly flat. */
export function rankHistogramFlatness(ranks: readonly number[], nBins: number): number | null {
  if (ranks.length === 0 || !Number.isInteger(nBins) || nBins <= 0) return null;
  const counts = new Array<number>(nBins).fill(0);
  for (const r of ranks) {
    if (!Number.isInteger(r) || r < 0 || r >= nBins) return null;
    counts[r] = (counts[r] ?? 0) + 1;
  }
  const expected = ranks.length / nBins;
  const chi2 = counts.reduce((s, c) => s + ((c - expected) ** 2) / expected, 0);
  return 1 / (1 + chi2 / nBins);
}
