/**
 * arXiv 2103.04647: Flexible marked spatio-temporal point processes with applications to event sequences from association football
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Live in-play NFL modeling with the decoupled marks/times factorization -- the cleanest full Bayesian implementation of a Hawkes-like event model in sports: map one full NFL week of nflverse PBP (~14-16 games) to the composite-mark schema and fit the S-beta model in Stan; use the per-event-type team-ability rankings as features.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Live in-play NFL modeling with the decoupled marks/times factorization -- the cleanest full Bayesian implementation of a Hawkes-like event model in sports, filling the corpus's Hawkes/self-exciting gap (it does not duplicate iWinRNFL or the marked point-process NFL work already in corpus): map one full NFL week of nflverse PBP (~14-16 games) to the composite-mark schema and fit the S-beta model in Stan; use the per-event-type team-ability rankings as features.
 *
 * ACCEPTANCE GATE (verbatim):
 * Test A (fit): all R-hat < 1.1 and effective sample sizes > 400 for ability parameters (the paper's Section 6.1 bar). Test B (predictive gain): hold out the following week's games; lpd^c must beat the FOMC baseline by >= 1.0 per 1,000 events. Test C: per-event-type team-ability rankings correlate (Spearman rho >= 0.5) with independent season performance measures (e.g., offensive EPA rankings). If the lpd^c gap vs FOMC is < 0.5 per 1,000 events, the NFL event stream carries no Hawkes-like excitation worth the complexity -> REJECT.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: live_ingame | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Hawkes intensity at time t given past events (exponential kernel). */
export function hawkesIntensity(
  t: number,
  events: readonly number[],
  mu: number,
  alpha: number,
  beta: number,
): number {
  let s = mu;
  for (const te of events) {
    if (te < t) s += alpha * Math.exp(-beta * (t - te));
  }
  return s;
}

/** Log-likelihood of an event sequence on [0, T] under the Hawkes model. */
export function hawkesLogLik(
  events: readonly number[],
  T: number,
  mu: number,
  alpha: number,
  beta: number,
): number {
  let ll = 0;
  const past: number[] = [];
  for (const t of events) {
    ll += Math.log(Math.max(1e-300, hawkesIntensity(t, past, mu, alpha, beta)));
    past.push(t);
  }
  // compensator integral
  ll -= mu * T;
  for (const te of events) ll -= (alpha / beta) * (1 - Math.exp(-beta * (T - te)));
  return ll;
}

/** Grid-search MLE for (mu, alpha, beta) on fixed grids. */
export function hawkesGridFit(
  events: readonly number[],
  T: number,
  muGrid: readonly number[],
  alphaGrid: readonly number[],
  betaGrid: readonly number[],
): { mu: number; alpha: number; beta: number; ll: number } {
  let best = { mu: muGrid[0]!, alpha: alphaGrid[0]!, beta: betaGrid[0]!, ll: -Infinity };
  for (const mu of muGrid)
    for (const alpha of alphaGrid)
      for (const beta of betaGrid) {
        const ll = hawkesLogLik(events, T, mu, alpha, beta);
        if (ll > best.ll) best = { mu, alpha, beta, ll };
      }
  return best;
}
