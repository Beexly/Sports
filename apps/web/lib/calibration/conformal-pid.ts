/**
 * Conformal PID control for time-series prediction — arXiv 2307.16895
 * ("Conformal PID Control for Time Series Prediction").
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published
 * intervals and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: upgrade ACI to PID. Keep the alpha_t integrator from
 * Adaptive Conformal Inference; add a P-term eta_P*(err_t - alpha) on the
 * score quantile and a scorecaster q-hat_{t+1} = regression of the
 * next-week residual-quantile on [weather bucket, QB-change flag, rest
 * differential, December flag, trailing error]; saturating integrator
 * r_t = c*tanh(sum errors / c) to bound runaway. Extension: learned
 * saturation (scale c from data: larger c in stable regimes, smaller c when
 * the scorecaster fires) and market-aware scorecaster features (line
 * movement into the weekend predicts engine error).
 *
 * ACCEPTANCE GATE (improvement-ledger): ADAPT if shock-stretch coverage
 * improves >=10pp over I-only ACI at <=115% mean width; REJECT the
 * scorecaster component if it adds width without coverage gain (keep the
 * P+I controller, still strictly better than I-only).
 */

export interface PidParams {
  readonly etaP: number;
  readonly etaI: number;
  readonly c: number;
}

export interface PidState {
  /** Current score-quantile level q_t. */
  readonly qT: number;
  /** Running sum of (err - alpha) feeding the saturating integrator. */
  readonly integralSum: number;
}

/** Saturating integrator r_t = c * tanh(S / c): bounded in [-c, c]. */
export function saturatingIntegrator(sum: number, c: number): number {
  if (!(c > 0)) return 0;
  return c * Math.tanh(sum / c);
}

/**
 * One PID step on the score quantile. errT = 1 on miscoverage of the
 * published interval. Returns the next state.
 */
export function pidStep(
  state: PidState,
  errT: 0 | 1,
  alpha: number,
  params: PidParams,
  scorecast = 0,
): PidState {
  const err = errT - alpha;
  const pTerm = params.etaP * err;
  const integralSum = state.integralSum + err;
  const iTerm = params.etaI * saturatingIntegrator(integralSum, params.c);
  return { qT: state.qT + pTerm + iTerm + scorecast, integralSum };
}

/**
 * Scorecaster: linear regression of next-week residual-quantile on
 * game-context features. Coefficients are fit offline on 2023-2024
 * (documented, not learned here); this is the serving-time evaluation.
 */
export function scorecaster(
  features: readonly number[],
  coefs: readonly number[],
  intercept = 0,
): number {
  let s = intercept;
  for (let i = 0; i < features.length && i < coefs.length; i++) {
    s += features[i]! * coefs[i]!;
  }
  return s;
}

/**
 * Learned saturation scale: larger c in stable regimes, smaller c when the
 * scorecaster fires (lets the controller react faster to predicted shocks).
 */
export function learnedSaturationScale(
  baseC: number,
  regimeStable: boolean,
  scorecasterFired: boolean,
): number {
  if (scorecasterFired) return baseC * 0.5;
  return regimeStable ? baseC * 2 : baseC;
}

/** Zero state for a fresh market controller. */
export function initPidState(q0: number): PidState {
  return { qT: q0, integralSum: 0 };
}
