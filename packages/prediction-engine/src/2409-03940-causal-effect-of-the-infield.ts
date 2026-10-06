/**
 * arXiv:2409.03940 — Causal effect of the infield shift in the MLB
 *
 * Causal imbalance diagnostics for the injury study: standardized mean differences and variance ratios per
 * covariate, Love-plot-ready output, and a balance gate (all |SMD| < 0.1) before any effect is trusted.
 *
 * Improvement: Adopt the matching + IPTW + preference-IV triangulation as GSE's standard template for causal evaluation of NFL strategic/rule interventions from observational data, upgrading the paper's 2SLS linearity with a doubly robust / double-ML ETT (cross-fitted ML nuisance models) and estimating the league-wide ATE, not just the ETT.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT the triangulation template if the NFL kickoff replication shows sign agreement between IPTW and IV, post-weighting |SMD| < 0.1, first-stage partial F > 100, and the placebo-year ETT has 95% CI covering 0. REJECT if estimators disagree in sign or the placebo test fails.
 */

/** Standardized mean difference for one covariate. */
export function smd(
  treated: readonly number[],
  control: readonly number[],
): number {
  if (treated.length === 0 || control.length === 0) throw new Error("smd: empty group");
  const mean = (a: readonly number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const mt = mean(treated);
  const mc = mean(control);
  const vt = treated.reduce((s, v) => s + (v - mt) ** 2, 0) / treated.length;
  const vc = control.reduce((s, v) => s + (v - mc) ** 2, 0) / control.length;
  const pooled = Math.sqrt((vt + vc) / 2);
  return pooled < 1e-12 ? 0 : (mt - mc) / pooled;
}

/** Variance ratio (treated/control) for one covariate. */
export function varianceRatio(
  treated: readonly number[],
  control: readonly number[],
): number {
  if (treated.length < 2 || control.length < 2) throw new Error("varianceRatio: need >= 2 per group");
  const v = (a: readonly number[]) => {
    const m = a.reduce((s, x) => s + x, 0) / a.length;
    return a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1);
  };
  const vc = v(control);
  return vc < 1e-12 ? NaN : v(treated) / vc;
}

/** Balance table row per covariate. */
export interface BalanceRow {
  covariate: string;
  smd: number;
  varianceRatio: number;
}

/** Build the balance table from grouped covariate matrices. */
export function balanceTable(
  covariates: readonly string[],
  treated: number[][],
  control: number[][],
): BalanceRow[] {
  return covariates.map((c, j) => ({
    covariate: c,
    smd: smd(treated.map((r) => r[j] ?? 0), control.map((r) => r[j] ?? 0)),
    varianceRatio: varianceRatio(treated.map((r) => r[j] ?? 0), control.map((r) => r[j] ?? 0)),
  }));
}

/** Balance gate: all |SMD| < 0.1 (Love-plot pass criterion). */
export function balanceGate(rows: readonly BalanceRow[], tol = 0.1): boolean {
  return rows.every((r) => Math.abs(r.smd) < tol);
}
