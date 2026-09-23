/**
 * Heterogeneous Effects of Software Patches in a Multiplayer Online Battle Arena Game
 *
 * arXiv:2110.14632v1 · lane:causal_injury · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Causal-inference primitives for injury studies: inverse-propensity weights for confounding
 * adjustment (propensities strictly inside (0,1)), difference-in-differences for pre/post
 * treatment-vs-control designs, and standardized mean differences (Cohen's d) for covariate balance
 * checks.
 *
 * Improvement (wiring record): Build a causal-tree HTE module for rule changes: treated = 2024-2025 (2024 dynamic kickoff rule),
 * control = 2022-2023, unit = team-game special-teams EPA outcomes; causal trees (Tran-Zheleva, or
 * causal forest/GRF for honest CIs) on NFL analogs of the paper's skill proxies (pre-intervention ST
 * EPA, returner speed, touchback rate, coach tenure) to find which team archetypes the rule shift
 * helped/hurt most, keeping only subgroups selected in >=70% of bootstraps for stability.
 *
 * ACCEPTANCE GATE: Adopt iff on the 2022-2024 fit: (a) >=2 leaves significant at 5% with |tau-hat| >= 0.5 EPA/game, (b)
 * max-leaf |tau-hat| >= 2x the naive pre/post ATE, (c) top-3 split features stable on the 2025
 * holdout; reject if tree structure flips between fit and holdout windows.
 *
 * Ingest role: causal estimation helpers (IPW, difference-in-differences, balance diagnostics).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2110.14632v1" as const;
export const LANE = "causal_injury" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt iff on the 2022-2024 fit: (a) >=2 leaves significant at 5% with |tau-hat| >= 0.5 EPA/game, (b) max-leaf |tau-hat| >= 2x the naive pre/post ATE, (c) top-3 split features stable on the 2025 holdout; reject if tree structure flips between fit and holdout windows.`;

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
