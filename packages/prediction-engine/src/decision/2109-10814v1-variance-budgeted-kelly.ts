// ============================================================
// Variance-budgeted fractional Kelly (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * (variance-budgeted alpha beats fixed alpha on realized growth/risk, after
 * the paper's risk-profile replication check) to pass, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2109.10814v1 — "Fractional Growth Portfolio Investment"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: the fractional-Kelly fraction alpha is not a magic
 * constant but a variance budget: alpha = sqrt(V_target / V(1)), where
 * V(1) is the log-growth variance of the full-Kelly portfolio and V_target
 * comes from the drawdown/volatility budget. Recomputed per slate, alpha_t
 * shrinks automatically on correlated slates.
 *
 * IMPROVEMENT (from ledger): Install variance-budgeted fractional Kelly:
 * for each slate, (1) convert engine edges to per-pick full-Kelly fractions
 * f_full; (2) estimate the slate portfolio's log-growth variance V(1) under
 * f_full via the pick outcome model (or bootstrap of backtest residuals);
 * (3) solve alpha = sqrt(V_target / V(1)) from the drawdown budget (e.g.,
 * max acceptable annualized SD); (4) stake alpha * f_full and report alpha
 * alongside picks so the sizing is auditable, not a magic 'quarter' — then
 * run the comparison on GSE's walk-forward picks (Neon picks, v5.2.7):
 * fixed alpha = 0.25 vs variance-budgeted alpha_t recomputed per slate,
 * scoring realized log-growth per unit of realized variance (expectation:
 * alpha_t shrinks on correlated same-game slates and achieves a better
 * realized growth/risk ratio).
 *
 * ACCEPTANCE GATE: Replicated fractional-Kelly portfolio must satisfy:
 * annualized SD in [0.16, 0.19], max drawdown in [38%, 46%], final wealth
 * within 10% of $576,464 — i.e., reproduce the paper's risk profile, not
 * just its return; then the variance-budgeted alpha must beat fixed alpha
 * on realized growth/risk.
 */

export interface SlateEdge {
  id: string;
  /** Full-Kelly fraction for this pick (from the engine edge). */
  fFull: number;
  /** Win probability. */
  p: number;
  /** Decimal odds. */
  odds: number;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Estimate V(1): the slate log-growth variance under full-Kelly fractions,
 * via the pick outcome model (independent Bernoulli draws per pick).
 */
export function estimateSlateVariance(
  slate: SlateEdge[],
  nSims: number,
  seed = 555,
): number {
  if (slate.length === 0 || nSims <= 0) return 0;
  const rand = mulberry32(seed);
  let mean = 0;
  let m2 = 0;
  for (let s = 0; s < nSims; s++) {
    let r = 0;
    for (const pick of slate) {
      const win = rand() < pick.p;
      r += pick.fFull * (win ? pick.odds - 1 : -1);
    }
    const g = Math.log(Math.max(1 + r, 1e-12));
    mean += g;
    m2 += g * g;
  }
  mean /= nSims;
  return Math.max(m2 / nSims - mean * mean, 0);
}

/**
 * Variance-budgeted alpha: alpha = sqrt(V_target / V(1)), clipped to
 * [0, 1]. V_target comes from the drawdown budget (e.g. max acceptable
 * annualized SD, converted to per-slate variance).
 */
export function varianceBudgetedAlpha(vTarget: number, vFull: number): number {
  if (vFull <= 0 || vTarget <= 0) return 0;
  return Math.min(Math.sqrt(vTarget / vFull), 1);
}

/** Stake alpha·f_full per pick; alpha is reported alongside the picks (auditable). */
export function varianceBudgetedStakes(
  slate: SlateEdge[],
  vTarget: number,
  nSims = 4000,
  seed = 555,
): { stakes: { id: string; stake: number }[]; alpha: number; vFull: number } {
  const vFull = estimateSlateVariance(slate, nSims, seed);
  const alpha = varianceBudgetedAlpha(vTarget, vFull);
  return {
    stakes: slate.map((p) => ({ id: p.id, stake: alpha * p.fFull })),
    alpha,
    vFull,
  };
}

/** Fixed-alpha baseline (alpha = 0.25) for the gate comparison. */
export function fixedAlphaStakes(
  slate: SlateEdge[],
  alpha = 0.25,
): { id: string; stake: number }[] {
  return slate.map((p) => ({ id: p.id, stake: alpha * p.fFull }));
}

/** Realized log-growth per unit of realized variance (the gate's score). */
export function growthRiskRatio(logGrowths: number[]): number {
  const n = logGrowths.length;
  if (n === 0) return 0;
  const mean = logGrowths.reduce((a, b) => a + b, 0) / n;
  const variance = logGrowths.reduce((a, g) => a + (g - mean) * (g - mean), 0) / n;
  return variance > 0 ? mean / variance : 0;
}

/**
 * Gate helper: (1) replicated risk profile check — annualized SD in
 * [0.16, 0.19], max drawdown in [38%, 46%], final wealth within 10% of
 * $576,464; (2) variance-budgeted alpha beats fixed alpha on realized
 * growth/risk.
 */
export function varianceBudgetedGatePasses(
  annualizedSd: number,
  maxDd: number,
  finalWealth: number,
  budgetedRatio: number,
  fixedRatio: number,
): boolean {
  const profileOk =
    annualizedSd >= 0.16 &&
    annualizedSd <= 0.19 &&
    maxDd >= 0.38 &&
    maxDd <= 0.46 &&
    Math.abs(finalWealth - 576464) / 576464 <= 0.1;
  return profileOk && budgetedRatio > fixedRatio;
}
