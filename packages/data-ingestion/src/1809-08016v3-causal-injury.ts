/**
 * On-field player workload exposure and knee injury risk monitoring via deep learning
 *
 * arXiv:1809.08016v3 · lane:causal_injury · verdict:ADAPT · owner:Hermes
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Causal-inference primitives for injury studies: inverse-propensity weights for confounding
 * adjustment (propensities strictly inside (0,1)), difference-in-differences for pre/post
 * treatment-vs-control designs, and standardized mean differences (Cohen's d) for covariate balance
 * checks.
 *
 * Improvement (wiring record): Port the deep-learning knee-load estimation pipeline to football ACL-risk monitoring: the paper
 * predicts knee joint moment (KJM) waveforms -- KJMx (ext/flex), KJMy, KJMz (internal/external
 * rotation) -- over the first 33% of stance from encoded marker trajectories (xyz->RGB) via a CaffeNet
 * double-cascade (ImageNet pre-training -> force/moment estimation -> joint-load estimation). Modern
 * GSE port: replace CaffeNet with a temporal CNN/transformer backbone, replace marker trajectories
 * with NGS tracking data (10 Hz player coordinates) or practice wearable IMU streams, target =
 * estimated knee-load proxies or validated workload-exposure scores per player per week; train on
 * lab-grade biomechanics mocap data with force plates as ground truth (data partnership is the long
 * pole); serve weekly batch workload-exposure reports for fantasy/injury-risk content (real-time
 * later). Focus is the ACL-relevant rotational component KJMz -- the paper already shows ext/flex KJMx
 * is easy (r~0.99) and least injury-relevant. Improvement: target the weak component with a
 * physics-informed loss term penalizing violations of the inverse-dynamics relationship between
 * predicted KJM and measured GRF (same trials), extra weight on KJMz -- hypothesis: KJMz correlation
 * improves >=0.05 without degrading KJMx/KJMy because GRF coupling is strongest in the rotational
 * channel.
 *
 * ACCEPTANCE GATE: Adopt if the modern-backbone port beats linear regression on KJMz (the ACL-relevant rotational
 * component) by >=0.05 correlation with 5-fold CIs excluding zero on held-out subjects; reject if the
 * gain is confined to ext/flex (KJMx), which the paper already shows is easy (r~0.99) and least
 * injury-relevant.
 *
 * Ingest role: causal estimation helpers (IPW, difference-in-differences, balance diagnostics).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1809.08016v3" as const;
export const LANE = "causal_injury" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt if the modern-backbone port beats linear regression on KJMz (the ACL-relevant rotational component) by >=0.05 correlation with 5-fold CIs excluding zero on held-out subjects; reject if the gain is confined to ext/flex (KJMx), which the paper already shows is easy (r~0.99) and least injury-relevant.`;

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
