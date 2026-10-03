/**
 * arXiv:2605.30209v1 — Betting Against Integrity: Identifying Match-Fixing Through In-Play Market Dynamics
 *
 * Hurdle-ARX(1) state-space on live odds: hurdle (trade/no-trade) plus ARX(1) latent activity state;
 * standardized residuals vs expected activity flag steam/stale-line cells. Gate needs a full season of live
 * odds data, so this module ships the mechanism disabled with the AIC gate documented.
 *
 * Improvement: Fit a hurdle-ARX(1) state-space model on public NFL live odds (The Odds API in-game, 1-minute resolution; covariates: pre-game implied probs, score diff, time remaining, timeouts, events); use standardized residuals vs expected activity as a live-betting edge signal — flagged cells that cluster before line moves the pre-game model missed become GSE's steam/stale-line detector.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT conditional on §12: fit the baseline hurdle SSM on one season of live odds-movement data; require ΔAIC ≥ 10⁴ over the no-state hurdle before proceeding; adopt only if flagged residuals predict line moves above chance.
 */

/** Disabled: requires unavailable training data or model artifact. */
export const ENABLED = false;

/** Hurdle-ARX(1) parameters. */
export interface HurdleSsmParams {
  /** Hurdle intercept (logit of P(activity)). */
  hurdleIntercept: number;
  /** AR(1) persistence of the latent activity state. */
  phi: number;
  /** State innovation sd. */
  sigmaEta: number;
  /** Covariate loadings [pregameImplied, scoreDiff, timeRemaining, timeouts, events]. */
  beta: number[];
}

/** Covariates for one 1-minute cell. */
export interface OddsCell {
  pregameImplied: number;
  scoreDiff: number;
  timeRemaining: number;
  timeouts: number;
  events: number;
}

/** Latent-state mean update: x_t = phi*x_{t-1} + beta'z_t (ARX(1) core). */
export function arxStateUpdate(
  p: HurdleSsmParams,
  prevState: number,
  cell: OddsCell,
): number {
  const z = [cell.pregameImplied, cell.scoreDiff, cell.timeRemaining, cell.timeouts, cell.events];
  const reg = z.reduce((s, v, i) => s + v * (p.beta[i] ?? 0), 0);
  return p.phi * prevState + reg;
}

/**
 * Standardized residual of observed activity vs the hurdle-ARX expectation.
 * |resid| > 3 flags the cell as anomalous (steam/stale-line candidate).
 */
export function standardizedResidual(
  p: HurdleSsmParams,
  state: number,
  observedActivity: number,
): number {
  const hurdleP = 1 / (1 + Math.exp(-(p.hurdleIntercept + state)));
  const expected = hurdleP * Math.max(0, state);
  const sd = Math.max(1e-6, p.sigmaEta * Math.sqrt(Math.max(1e-6, expected)));
  return (observedActivity - expected) / sd;
}
