/**
 * Optimal strategy for trail running with nutrition and fatigue factors
 *
 * arXiv:2401.02919 · lane:causal_injury · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Causal-inference primitives for injury studies: inverse-propensity weights for confounding
 * adjustment (propensities strictly inside (0,1)), difference-in-differences for pre/post
 * treatment-vs-control designs, and standardized mean differences (Cohen's d) for covariate balance
 * checks.
 *
 * Improvement (wiring record): Build gse_fatigue_state.py: per-player latent fatigue Q updated per play from NGS power proxy P =
 * m*v*a, dQ/dt = K*P during sessions and dQ/dt = -rho*Q between sessions (recovery; rho fitted);
 * calibrate K, rho per position group against observed outcomes (missed practices, snap declines,
 * soft-tissue flags) - then add the missing recovery term and a stochastic injury-hazard layer:
 * soft-tissue injury as a point process with intensity lambda(t) = lambda_0*exp(gamma*Q(t)),
 * estimating lambda_0, gamma per position group and testing whether lambda(t) anticipates injuries
 * better than ACWR-based hazards.
 *
 * ACCEPTANCE GATE: Accepted (narrowly but genuinely): validated predictive accuracy (0.5-13% finish-time errors across
 * 5 independent races), a mechanistic fatigue ODE directly portable to workload-state modeling, and an
 * explicit parameter-fitting methodology. Not a plug-in predictor; a feature-engineering template.
 *
 * Ingest role: causal estimation helpers (IPW, difference-in-differences, balance diagnostics).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2401.02919" as const;
export const LANE = "causal_injury" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Accepted (narrowly but genuinely): validated predictive accuracy (0.5-13% finish-time errors across 5 independent races), a mechanistic fatigue ODE directly portable to workload-state modeling, and an explicit parameter-fitting methodology. Not a plug-in predictor; a feature-engineering template.`;

/** Disabled by default: additive utility only, never auto-wired into a live ingestion path. */
export const ENABLED = false as const;

export const CONFIG = {
  enabled: false,
  method: "IPW + difference-in-differences + balance diagnostics",
} as const;
/** Numeric guard: rejects NaN, Infinity, and non-numbers. */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Population mean, or null on empty/malformed input. */
function mean(xs: readonly number[]): number | null {
  if (xs.length === 0 || !xs.every(isFiniteNumber)) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Population standard deviation, or null on empty/malformed input. */
function std(xs: readonly number[]): number | null {
  const m = mean(xs);
  if (m === null) return null;
  return Math.sqrt(xs.reduce((a, v) => a + (v - m) * (v - m), 0) / xs.length);
}

/** Sample variance (n-1), or null on <2 points/malformed input. */
function sampleVariance(xs: readonly number[]): number | null {
  if (xs.length < 2 || !xs.every(isFiniteNumber)) return null;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return xs.reduce((a, v) => a + (v - m) * (v - m), 0) / (xs.length - 1);
}

/** Inverse-propensity weights: treated get 1/p, control get 1/(1-p). */
export function ipwWeights(treated: readonly boolean[], propensity: readonly number[]): number[] | null {
  if (treated.length !== propensity.length || treated.length === 0) return null;
  if (!propensity.every((p) => isFiniteNumber(p) && p > 0 && p < 1)) return null;
  return treated.map((t, i) => {
    const p = propensity[i] ?? 0.5;
    return t ? 1 / p : 1 / (1 - p);
  });
}

/** Difference-in-differences: (postT - preT) - (postC - preC). */
export function didEstimate(
  preTreated: readonly number[],
  postTreated: readonly number[],
  preControl: readonly number[],
  postControl: readonly number[],
): number | null {
  const preT = mean(preTreated);
  const postT = mean(postTreated);
  const preC = mean(preControl);
  const postC = mean(postControl);
  if (preT === null || postT === null || preC === null || postC === null) return null;
  return postT - preT - (postC - preC);
}

/** Standardized mean difference (Cohen's d) for covariate balance checks. */
export function standardizedMeanDiff(a: readonly number[], b: readonly number[]): number | null {
  const ma = mean(a);
  const mb = mean(b);
  const sa = std(a);
  const sb = std(b);
  if (ma === null || mb === null || sa === null || sb === null) return null;
  const pooled = Math.sqrt((sa * sa + sb * sb) / 2);
  if (pooled === 0) return null;
  return (ma - mb) / pooled;
}
