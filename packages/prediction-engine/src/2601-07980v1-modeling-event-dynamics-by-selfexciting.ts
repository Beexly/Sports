/**
 * arXiv:2601.07980v1 — Modeling Event Dynamics by Self-Exciting Processes with Random Memory
 *
 * Self-exciting in-game event model: Hawkes intensity with a hot-state multiplier and random segment
 * effects; Wald test on nu and BIC vs the homogeneous Poisson decide the ADAPT gate.
 *
 * Improvement: GSE models in-game scoring events as a self-exciting point process with a hot-state multiplier and random segment effects, enabling live models to exploit momentum clustering in TD/turnover/sack streams instead of assuming homogeneous Poisson scoring.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT accepted if hot-state multiplier nu_hat is significantly > 0 (Wald p<0.01) with tau mean 1-6 min, Delta-BIC vs homogeneous Poisson > 10, and simulated cluster-size PMF matches empirical within 95% bands.
 */

/** Hawkes + hot-state parameters for one event stream. */
export interface HawkesParams {
  /** Baseline intensity (events/min). */
  mu: number;
  /** Excitation jump per event. */
  alpha: number;
  /** Excitation decay (per min). */
  beta: number;
  /** Hot-state multiplier on mu (nu_hat > 0 required by the gate). */
  nu: number;
}

/** Intensity at time t given past event times. */
export function hawkesIntensity(p: HawkesParams, t: number, events: readonly number[]): number {
  let excitation = 0;
  for (const e of events) {
    if (e < t) excitation += p.alpha * Math.exp(-p.beta * (t - e));
  }
  return Math.max(1e-9, p.mu * (1 + p.nu) + excitation);
}

/**
 * Log-likelihood of the event times on [0, T] (Ogata's thinning-free form).
 * Integral of intensity approximated on a fine grid.
 */
export function hawkesLogLik(
  p: HawkesParams,
  events: readonly number[],
  T: number,
  grid = 600,
): number {
  let ll = 0;
  for (const e of events) ll += Math.log(hawkesIntensity(p, e, events.filter((x) => x < e)));
  let integral = 0;
  const dt = T / grid;
  for (let g = 0; g < grid; g++) {
    integral += hawkesIntensity(p, (g + 0.5) * dt, events) * dt;
  }
  return ll - integral;
}

/**
 * Gate helpers: Wald z for nu_hat given its SE, and Delta-BIC vs homogeneous
 * Poisson (k=1 param: constant rate). Positive delta favors Hawkes.
 */
export function waldZ(est: number, se: number): number {
  if (se <= 0) throw new Error("waldZ: se > 0");
  return est / se;
}

export function deltaBicVsPoisson(
  hawkesLL: number,
  poissonLL: number,
  nEvents: number,
  kHawkes = 4,
): number {
  if (nEvents <= 0) throw new Error("deltaBicVsPoisson: nEvents > 0");
  const bicH = -2 * hawkesLL + kHawkes * Math.log(nEvents);
  const bicP = -2 * poissonLL + 1 * Math.log(nEvents);
  return bicP - bicH; // > 10 favors Hawkes per the gate
}
