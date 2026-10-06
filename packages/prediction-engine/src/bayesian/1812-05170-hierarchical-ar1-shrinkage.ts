/**
 * arXiv 1812.05170: Markov Decision Processes with Dynamic Transition Probabilities: An Analysis of Shooting Strategies in Basketball
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Hierarchical Bayesian partial pooling shrinks team ratings toward division/conference means with empirical-Bayes variance components; an AR(1) state process lets the underlying strength evolve with momentum, estimated by a scalar Kalman filter per team.
 *
 * Record improvement (verbatim):
 * Port the basketball MDP's hierarchical Bayesian estimation machinery to GSE: (1) hierarchical shrinkage template for NFL player parameters -- e.g., QB EPA/play or receiver separation with levels player -> position group -> global, AR(1) over weeks (mirroring the paper's shot-clock AR(1)), half-Cauchy(0,2.5) scales, Stan or PyMC -- this is the portable core (multi-level shrinkage, AR(1) temporal covariance, half-Cauchy scales) plus the posterior-draw simulation discipline; (2) NGS-based analogue of the time-transition process (TPT) for situational football: state = (down, distance bucket, field zone, score differential bucket), transitions = play outcomes, policy = coach's play-call/go-for-it decision, reward = EPA (NGS tracking gives ballcarrier/defender geometry for the pressure analogue); (3) counterfactual simulator: posterior draws -> simulate seasons under altered 4th-down or pass-rate policies -> expected-points-per-drive distributions, exactly as their Algorithm 1; sanity-gate the 4th-down go-for-it counterfactual against the published ngreenberg 4th-down estimates already in the repo. Improvement beyond the paper: replace their fixed 8-slice TPT with a Gaussian-process prior over the continuous temporal covariate (shot clock -> game clock / score differential), letting the data choose smoothness instead of hard 3-second bins; make the defense adversarial via a two-player (offense/defense) policy pair, testing whether counterfactual gains survive defensive best-response -- the paper's own flagged limitation.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT the hierarchical Bayesian estimation layer if, on 2025 held-out games, the multi-level AR(1) model improves out-of-sample log-likelihood over the no-shrinkage baseline by >=2% AND posterior 95% intervals achieve nominal coverage on held-out EPA/play; REJECT the full TPT play-simulator build if a one-team prototype exceeds 48 hours compute or fails the Table-2-style shrinkage-wins check. Simulator build proceeds only after the estimation gate passes.
 */

export const ENABLED = false;

/**
 * Empirical-Bayes shrinkage of a raw group estimate toward the group mean:
 * est = B * groupMean + (1 - B) * x, B = varWithin / (varWithin + varBetween).
 */
export function shrinkEstimate(
  x: number,
  groupMean: number,
  varWithin: number,
  varBetween: number,
): number {
  const B = varWithin / (varWithin + varBetween);
  return B * groupMean + (1 - B) * x;
}

export interface VarianceComponents {
  varWithin: number;
  varBetween: number;
  grandMean: number;
}

/** Method-of-moments variance components for a one-way hierarchical layout. */
export function fitVarianceComponents(groups: number[][]): VarianceComponents {
  const all = groups.flat();
  const grandMean = all.reduce((a, b) => a + b, 0) / all.length;
  const k = groups.length;
  let ssWithin = 0;
  let nTot = 0;
  const means: number[] = [];
  for (const g of groups) {
    const m = g.reduce((a, b) => a + b, 0) / g.length;
    means.push(m);
    for (const x of g) ssWithin += (x - m) ** 2;
    nTot += g.length;
  }
  const varWithin = ssWithin / Math.max(nTot - k, 1);
  const n0 = nTot / k;
  let ssBetween = 0;
  for (let i = 0; i < k; i++) ssBetween += groups[i]!.length * (means[i]! - grandMean) ** 2;
  const varBetween = Math.max(0, (ssBetween / (k - 1) - varWithin) / n0);
  return { varWithin, varBetween, grandMean };
}

export interface AR1State {
  level: number;
  variance: number;
}

/**
 * Scalar Kalman filter for an AR(1) strength process:
 * x_t = phi * x_{t-1} + w (var stateVar), y_t = x_t + v (var obsVar).
 */
export function ar1Update(
  s: AR1State,
  obs: number,
  phi: number,
  stateVar: number,
  obsVar: number,
): AR1State {
  const predLevel = phi * s.level;
  const predVar = phi * phi * s.variance + stateVar;
  const gain = predVar / (predVar + obsVar);
  return {
    level: predLevel + gain * (obs - predLevel),
    variance: (1 - gain) * predVar,
  };
}

/** One-step-ahead forecast from the AR(1) state. */
export function ar1Forecast(s: AR1State, phi: number, stateVar: number): { mean: number; variance: number } {
  return { mean: phi * s.level, variance: phi * phi * s.variance + stateVar };
}

export function mse(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i]! - b[i]!) ** 2;
  return s / a.length;
}

/** Gate: adopt on Brier gain with genuine AR(1) momentum. */
export function hierarchicalGate(brierGain: number, phi: number, phiPosteriorMass: number): "ADAPT" | "REJECT" {
  if (brierGain >= 0.005 && phi > 0 && phi < 1 && phiPosteriorMass > 0.95) return "ADAPT";
  return "REJECT";
}
