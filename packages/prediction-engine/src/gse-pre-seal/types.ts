/**
 * GSE pre-seal types.
 *
 * Everything in this package runs BEFORE the Tuesday 04:00 CT seal. Nothing
 * here may call seal() or mutate a sealed artifact. The only write target is
 * the candidate baseline JSON; the sealed center stays read-only for all
 * mid-week operators.
 */

/** Envelope every operator returns. Matches the sealed-loop contract. */
export interface OperatorEnvelope<T> {
  baseline_hash: string;
  operator: string;
  inputs: Record<string, unknown>;
  output: T;
  sealed: true;
}

/** One team's rating with its observation count. */
export interface TeamRating {
  team: string;
  rating: number;
  n: number;
}

/** Hierarchical partial-pooling model parameters. */
export interface PoolingParams {
  mu: number;
  tau: number;
  sigma: number;
  hfa: number;
}

/** A single game observation: y_ij = R_i - R_j + HFA + error. */
export interface GameObservation {
  home: string;
  away: string;
  /** Observed margin from the home team's perspective. */
  margin: number;
}

/** Output of the PPM estimator. */
export interface PoolingResult {
  ratings: TeamRating[];
  params: PoolingParams;
  /** Empirical-Bayes shrinkage weight per team. */
  weights: Record<string, number>;
  /** Residuals of the fit, one per observation. */
  residuals: number[];
  /** Weighted RMS of the residuals. */
  rmsResidual: number;
}

/** Quantile adjustment coefficients (sealed config delta). */
export interface QuantileTable {
  intercept: number;
  roof: number;
  windPer10Mph: number;
  precip: number;
  division: number;
  tauLow: number;
  tauHigh: number;
}

/** Candidate baseline document. */
export interface CandidateBaseline {
  candidate_id: string;
  parent_seal_hash: string;
  week: string;
  written_at: string;
  operators_applied: string[];
  ratings: TeamRating[];
  params: PoolingParams;
  conformal?: ConformalResult;
}

/** Conformal diagnostic result. */
export interface ConformalResult {
  alpha: number;
  band: { lower: number; upper: number };
  residuals: number[];
  flagged: Array<{ index: number; residual: number; reason: string }>;
  n: number;
  /** Empirical coverage of the band on the residual sample. */
  coverage: number;
}
