/**
 * Predicting Ulnar Collateral Ligament Injury in Rookie Major League Baseball Pitchers
 *
 * arXiv:2207.00585v1 · lane:causal_injury · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Causal-inference primitives for injury studies: inverse-propensity weights for confounding
 * adjustment (propensities strictly inside (0,1)), difference-in-differences for pre/post
 * treatment-vs-control designs, and standardized mean differences (Cohen's d) for covariate balance
 * checks.
 *
 * Improvement (wiring record): Port the rookie-injury predictor to NFL: rookie injury-risk (hamstring/ACL) from college workload +
 * combine + rookie preseason features (the football analogue of 'rookie-season stats -> career
 * injury'); protocol fixes = published feature list, year-based splits with stated cutoffs, PR-AUC +
 * calibration alongside ROC-AUC, workload-only baseline; start with the paper's MLP winner + XGBoost —
 * then replace binary classification with a survival model (time-to-first-injury, Cox/DeepHit-style),
 * since the paper throws away when the injury happened and workload->injury is inherently temporal.
 *
 * ACCEPTANCE GATE: Adopt iff the NFL port achieves ROC-AUC >= 0.65 with 95% CIs excluding 0.5 on the 2022-2024 forward
 * test AND beats the workload-only baseline (the paper's 0.674 is the meet-or-beat benchmark).
 *
 * Ingest role: causal estimation helpers (IPW, difference-in-differences, balance diagnostics).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2207.00585v1" as const;
export const LANE = "causal_injury" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt iff the NFL port achieves ROC-AUC >= 0.65 with 95% CIs excluding 0.5 on the 2022-2024 forward test AND beats the workload-only baseline (the paper's 0.674 is the meet-or-beat benchmark).`;

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
