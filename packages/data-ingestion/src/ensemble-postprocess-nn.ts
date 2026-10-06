/**
 * Ensemble weather forecast post-processing with a flexible probabilistic neural network approach
 *
 * arXiv:2303.17610 · lane:weather · owner:Motif-lab
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build weather/postprocess.py: train an ANET2_NORM-style model (fastest MVP) on GEFS/ECMWF-IFS
 * ensemble reforecasts for 30 NFL stadium coordinates - targets = game-time 2m temperature, 10m
 * wind speed, precipitation rate; inputs = ensemble mean/variance at ~6-hour lead times bracketing
 * kickoff, stadium altitude/lon/lat, day-of-year encoding - upgrading to the full spline-flow
 * output once the NORM baseline validates; serve nightly calibrated predictive distributions per
 * Sunday game, feeding P(wind > 15 mph), E[precip], temp quantiles into the totals/spread model -
 * plus stadium-bowl microclimate: bowl openness index, field orientation, surrounding elevation
 * for per-stadium bias corrections.
 *
 * ACCEPTANCE GATE: ADOPT if the post-processed model beats EMOS by >=5% CRPS on wind speed AND >=5% on temperature
 * on the 2024 holdout with rank histograms visibly more uniform than raw ensembles; REJECT if CRPS
 * gain <5% on either variable - then GSE stays with off-the-shelf weather APIs.
 *
 * Ingest role: feature builder (flexible probabilistic NN post-processing: distributional regression core).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2303.17610" as const;
export const LANE = "weather" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT if the post-processed model beats EMOS by >=5% CRPS on wind speed AND >=5% on temperature
 * on the 2024 holdout with rank histograms visibly more uniform than raw ensembles; REJECT if CRPS
 * gain <5% on either variable - then GSE stays with off-the-shelf weather APIs.`;

export const CONFIG = {
  enabled: false,
  method: "probabilistic neural network post-processing",
  distribution: "gaussian",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface NwpEnsemble {
  readonly mean: number;
  readonly spread: number;
  readonly nMembers: number;
}

/** Affine distributional regression: (mu, log-sigma) = f(ensemble). */
export function affineDistParams(
  ens: NwpEnsemble,
  wMu: readonly number[],
  wSigma: readonly number[],
): { mu: number; sigma: number } | null {
  if (!isFiniteNumber(ens.mean) || !isFiniteNumber(ens.spread) || !Number.isInteger(ens.nMembers) || ens.nMembers <= 0) return null;
  if (wMu.length !== 3 || wSigma.length !== 3) return null;
  if (![...wMu, ...wSigma].every(isFiniteNumber)) return null;
  const feats = [1, ens.mean, ens.spread];
  const mu = wMu.reduce((s, w, i) => s + w * (feats[i] ?? 0), 0);
  const logSigma = wSigma.reduce((s, w, i) => s + w * (feats[i] ?? 0), 0);
  const sigma = Math.exp(logSigma);
  if (!isFiniteNumber(mu) || !isFiniteNumber(sigma) || sigma <= 0) return null;
  return { mu, sigma };
}

/** Gaussian NLL loss. */
export function gaussianNLL(mu: number, sigma: number, y: number): number | null {
  if (![mu, sigma, y].every(isFiniteNumber) || sigma <= 0) return null;
  return 0.5 * Math.log(2 * Math.PI * sigma * sigma) + ((y - mu) ** 2) / (2 * sigma * sigma);
}

/** CRPS for Gaussian (closed form). */
export function crpsGaussian(mu: number, sigma: number, y: number): number | null {
  if (![mu, sigma, y].every(isFiniteNumber) || sigma <= 0) return null;
  const z = (y - mu) / sigma;
  const phi = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
  const Phi = 0.5 * (1 + erf(z / Math.SQRT2));
  return sigma * (z * (2 * Phi - 1) + 2 * phi - 1 / Math.sqrt(Math.PI));
}

function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

/** Gradient of NLL wrt (mu, log-sigma) for one observation (training recipe). */
export function nllGrad(mu: number, sigma: number, y: number): { dMu: number; dLogSigma: number } | null {
  if (![mu, sigma, y].every(isFiniteNumber) || sigma <= 0) return null;
  const r = y - mu;
  return {
    dMu: -r / (sigma * sigma),
    dLogSigma: 1 - (r * r) / (sigma * sigma),
  };
}
